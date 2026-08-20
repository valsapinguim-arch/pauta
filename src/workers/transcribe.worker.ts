/// <reference lib="webworker" />

import {
  addPitchBendsToNoteEvents,
  BasicPitch,
  noteFramesToTime,
  outputToNotesPoly,
} from '@spotify/basic-pitch'
import * as tf from '@tensorflow/tfjs'
import { setWasmPaths } from '@tensorflow/tfjs-backend-wasm'
import '@tensorflow/tfjs-backend-wasm'
import { TRANSCRIBE_WINDOW } from '@/lib/transcribe/constants'
import { mergeWindowedNotes } from '@/lib/transcribe/mergeWindowedNotes'
import { planWindows } from '@/lib/transcribe/planWindows'
import type { NoteEvent } from '@/lib/types'
import type {
  TranscribeErrorCode,
  TranscribeErrorMessage,
  TranscribeProgressMessage,
  TranscribeRequest,
  TranscribeResponse,
  TranscribeResultMessage,
  TranscribeStage,
} from './transcribe.worker.types'

/**
 * Worker de transcrição — ver Tarefa 7. Ao contrário do worker de áudio
 * (Tarefa 6, descartável), este é criado uma vez e REUTILIZADO entre
 * transcrições (decisão 4): o modelo carrega uma só vez por sessão, guardado
 * em `basicPitch` — estado de módulo que sobrevive entre mensagens.
 *
 * TensorFlow.js e `@spotify/basic-pitch` só podem ser importados aqui —
 * mantê-los confinados a este ficheiro é o que permite testar o resto do
 * pipeline sem modelo nenhum (ver AGENTS.md).
 */

const MODEL_URL = '/models/basic-pitch/model.json'

/** Ver Tarefa 7, decisão 8 — provisórios, por afinar com áudio real quando a
 *  Tarefa 13 permitir ver o resultado numa pauta a sério. Não passar valores
 *  literais nas chamadas a `outputToNotesPoly`; mudar só aqui. */
export const MODEL_THRESHOLDS = {
  ONSET_THRESHOLD: 0.5,
  FRAME_THRESHOLD: 0.3,
  MIN_NOTE_LENGTH_MS: 58,
} as const

/** Frames por segundo da grelha de saída do modelo — 22050 Hz / 256 amostras
 *  por "hop" da FFT (ver `constants.py` do basic-pitch Python; o pacote JS
 *  não exporta isto, por isso recalculado aqui a partir dos mesmos números). */
const ANNOTATIONS_FPS = Math.floor(22_050 / 256)
const MIN_NOTE_LENGTH_FRAMES = Math.round(
  (MODEL_THRESHOLDS.MIN_NOTE_LENGTH_MS / 1000) * ANNOTATIONS_FPS,
)

class TranscribeError extends Error {
  constructor(
    readonly code: TranscribeErrorCode,
    message: string,
  ) {
    super(message)
  }
}

function postTyped(message: TranscribeResponse): void {
  self.postMessage(message)
}

function postProgress(stage: TranscribeStage, progress: number): void {
  const message: TranscribeProgressMessage = { type: 'progress', stage, progress }
  postTyped(message)
}

setWasmPaths('/models/tfjs-wasm/')

/**
 * Ver Tarefa 7, decisão 2: tenta WASM (com SIMD/threads se o browser
 * suportar — negociado automaticamente por `setWasmPaths`, não à mão),
 * cai para `webgl` só se o WASM falhar a inicializar. Nunca WebGPU nesta
 * fase.
 */
async function selectBackend(): Promise<void> {
  try {
    await tf.setBackend('wasm')
    await tf.ready()
    return
  } catch {
    // segue para o fallback abaixo
  }

  try {
    await tf.setBackend('webgl')
    await tf.ready()
  } catch (webglError) {
    throw new TranscribeError(
      'backend-unavailable',
      webglError instanceof Error
        ? webglError.message
        : 'Nenhum backend do TensorFlow.js inicializou',
    )
  }
}

let basicPitch: BasicPitch | null = null

/** Carrega o modelo só na primeira transcrição da sessão (decisão 4) — as
 *  seguintes reutilizam `basicPitch` sem tocar na rede nem no backend. */
async function ensureModelReady(): Promise<BasicPitch> {
  if (basicPitch) return basicPitch

  await selectBackend()

  let modelPromise: ReturnType<typeof tf.loadGraphModel>
  try {
    modelPromise = tf.loadGraphModel(MODEL_URL, {
      onProgress: (fraction) => postProgress('preparing-model', fraction),
    })
    await modelPromise
  } catch (error) {
    throw new TranscribeError(
      'model-unavailable',
      error instanceof Error ? error.message : 'Não foi possível carregar o modelo',
    )
  }

  basicPitch = new BasicPitch(modelPromise)
  return basicPitch
}

function toDomainNoteEvents(
  frames: number[][],
  onsets: number[][],
  contours: number[][],
): NoteEvent[] {
  const framedNotes = outputToNotesPoly(
    frames,
    onsets,
    MODEL_THRESHOLDS.ONSET_THRESHOLD,
    MODEL_THRESHOLDS.FRAME_THRESHOLD,
    MIN_NOTE_LENGTH_FRAMES,
  )
  const timedNotes = noteFramesToTime(addPitchBendsToNoteEvents(contours, framedNotes))

  // Tarefa 7, decisão 9: nada da estrutura do basic-pitch atravessa esta
  // fronteira — só os quatro campos do domínio (`pitchBends` fica para trás).
  return timedNotes.map((note) => ({
    pitchMidi: note.pitchMidi,
    startSec: note.startTimeSeconds,
    durationSec: note.durationSeconds,
    amplitude: note.amplitude,
  }))
}

/**
 * Transcreve uma janela do áudio (Tarefa 19, decisão 5) — `frames`/
 * `onsets`/`contours` desta janela ficam fora de alcance assim que a
 * função devolve, ao contrário de os acumular para a peça inteira antes de
 * converter. `offsetSec` desloca as notas resultantes de volta para a
 * linha do tempo completa (esta janela viu só `windowPcm`, que começa em
 * 0). O `tf.engine().startScope()/endScope()` é por janela, não pela
 * peça inteira, pela mesma razão da decisão 10 da Tarefa 7 — libertar
 * tensores intermédios o mais cedo possível.
 */
async function transcribeWindow(
  model: BasicPitch,
  windowPcm: Float32Array,
  offsetSec: number,
  windowIndex: number,
  windowCount: number,
): Promise<NoteEvent[]> {
  const frames: number[][] = []
  const onsets: number[][] = []
  const contours: number[][] = []

  tf.engine().startScope()
  try {
    await model.evaluateModel(
      windowPcm,
      (f, o, c) => {
        frames.push(...f)
        onsets.push(...o)
        contours.push(...c)
      },
      (percent) => postProgress('transcribing', (windowIndex + percent) / windowCount),
    )
  } finally {
    tf.engine().endScope()
  }

  return toDomainNoteEvents(frames, onsets, contours).map((note) => ({
    ...note,
    startSec: note.startSec + offsetSec,
  }))
}

self.onmessage = async (event: MessageEvent<TranscribeRequest>) => {
  const { pcm, sampleRate } = event.data

  try {
    if (sampleRate !== 22_050) {
      // Nunca deveria acontecer — a Tarefa 6 já garante isto com
      // `assertModelInput` antes de entregar áudio aqui. Defesa, não um
      // caminho de erro nomeado à parte.
      throw new TranscribeError('transcribe-failed', `sampleRate inesperado: ${sampleRate}`)
    }

    const model = await ensureModelReady()

    // Processamento por blocos (Tarefa 19, decisão 5) — nunca um só buffer
    // entregue ao modelo de uma vez: o pico de memória de `frames`/
    // `onsets`/`contours` fica proporcional ao tamanho da janela, não à
    // duração total. `pcm.subarray` não copia amostras (só o resultado de
    // cada janela é novo). As janelas sobrepõem-se (`planWindows`) e os
    // fragmentos da mesma nota nas fronteiras fundem-se a seguir
    // (`mergeWindowedNotes`, que reaproveita `mergeFragmented` da Tarefa 8).
    const windows = planWindows(
      pcm.length,
      sampleRate,
      TRANSCRIBE_WINDOW.WINDOW_SEC,
      TRANSCRIBE_WINDOW.OVERLAP_SEC,
    )

    const perWindowNotes: NoteEvent[][] = []
    for (const window of windows) {
      const windowNotes = await transcribeWindow(
        model,
        pcm.subarray(window.startSample, window.endSample),
        window.offsetSec,
        window.index,
        window.count,
      )
      perWindowNotes.push(windowNotes)
    }

    const notes = mergeWindowedNotes(perWindowNotes, TRANSCRIBE_WINDOW.BOUNDARY_MERGE_GAP_MS)
    const result: TranscribeResultMessage = { type: 'result', notes }
    postTyped(result)
  } catch (error) {
    const code = error instanceof TranscribeError ? error.code : 'transcribe-failed'
    const message = error instanceof Error ? error.message : 'Erro desconhecido na transcrição'
    const errorMessage: TranscribeErrorMessage = { type: 'error', code, message }
    postTyped(errorMessage)
  }
}
