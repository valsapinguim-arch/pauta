import type { NoteEvent, ScoreDocument } from '@/lib/types'
import type { AudioSource, ProcessingStage, SessionState } from './session.types'

/**
 * Mecanismo de desenvolvimento para forçar um estado via `?state=` — ver
 * Tarefa 3, Âmbito técnico. Permite rever os cinco estados visuais sem
 * pipeline nenhum a funcionar: `?state=processing&stage=preparing-model`,
 * `?state=result`, `?state=error&recoverable=false`, etc.
 *
 * Só ativo em `import.meta.env.DEV` — nunca entra no bundle de produção.
 */

const FAKE_SOURCE: AudioSource = { kind: 'microphone' }

const PROCESSING_STAGES: ProcessingStage[] = [
  'preprocessing',
  'preparing-model',
  'transcribing',
  'analysing',
]

/** Documento de exemplo só para a `ResultView` ter algo a mostrar sem
 *  pipeline nenhum a funcionar — a escala de dó maior do título, desenhada
 *  a sério pela `ScoreView` desde a Tarefa 13. Confiança alta de propósito:
 *  o aviso de confiança baixa (Tarefa 13, decisão 8) testa-se à parte, via
 *  `?state=result&tempo=assumed`/`&key=assumed`. */
const FAKE_DOCUMENT: ScoreDocument = {
  metadata: {
    schemaVersion: 1,
    title: 'Escala de Dó maior',
    createdAt: new Date(2026, 0, 1).toISOString(),
    sourceName: null,
    durationSec: 8,
    confidence: { overall: 0.92, notes: 0.94, tempo: 0.9, key: 0.93 },
  },
  tempo: {
    bpm: 96,
    timeSignature: { numerator: 4, denominator: 4 },
    firstBeatSec: 0,
    confidence: 0.9,
    source: 'detected',
  },
  key: { tonic: 0, mode: 'major', sharpsOrFlats: 0, confidence: 0.93, source: 'detected' },
  clef: 'treble',
  measures: [
    {
      number: 1,
      elements: [
        {
          kind: 'note',
          step: 'C',
          alter: 0,
          octave: 4,
          pitchMidi: 60,
          noteType: 'quarter',
          dots: 0,
          accidental: null,
          tie: null,
          sourceIndex: 0,
        },
        {
          kind: 'note',
          step: 'D',
          alter: 0,
          octave: 4,
          pitchMidi: 62,
          noteType: 'quarter',
          dots: 0,
          accidental: null,
          tie: null,
          sourceIndex: 1,
        },
        {
          kind: 'note',
          step: 'E',
          alter: 0,
          octave: 4,
          pitchMidi: 64,
          noteType: 'quarter',
          dots: 0,
          accidental: null,
          tie: null,
          sourceIndex: 2,
        },
        {
          kind: 'note',
          step: 'F',
          alter: 0,
          octave: 4,
          pitchMidi: 65,
          noteType: 'quarter',
          dots: 0,
          accidental: null,
          tie: null,
          sourceIndex: 3,
        },
      ],
    },
    {
      number: 2,
      elements: [
        {
          kind: 'note',
          step: 'G',
          alter: 0,
          octave: 4,
          pitchMidi: 67,
          noteType: 'quarter',
          dots: 0,
          accidental: null,
          tie: null,
          sourceIndex: 4,
        },
        {
          kind: 'note',
          step: 'A',
          alter: 0,
          octave: 4,
          pitchMidi: 69,
          noteType: 'eighth',
          dots: 0,
          accidental: null,
          tie: null,
          sourceIndex: 5,
        },
        {
          kind: 'note',
          step: 'C',
          alter: 0,
          octave: 5,
          pitchMidi: 72,
          noteType: 'half',
          dots: 0,
          accidental: null,
          tie: null,
          sourceIndex: 7,
        },
        /* Ligadura de prolongação: tem de ser a última nota do compasso,
           imediatamente antes da nota que a fecha no compasso 3 (Tarefa 12,
           decisão 6/`validateScoreDocument`) — sem nada não ligado entre o
           `start` e o `stop`. */
        {
          kind: 'note',
          step: 'B',
          alter: 0,
          octave: 4,
          pitchMidi: 71,
          noteType: 'eighth',
          dots: 0,
          accidental: null,
          tie: 'start',
          sourceIndex: 6,
        },
      ],
    },
    {
      number: 3,
      elements: [
        {
          kind: 'note',
          step: 'B',
          alter: 0,
          octave: 4,
          pitchMidi: 71,
          noteType: 'quarter',
          dots: 0,
          accidental: null,
          tie: 'stop',
          sourceIndex: 6,
        },
        { kind: 'rest', noteType: 'half', dots: 1 },
      ],
    },
  ],
}

/** Notas de exemplo, só para a correção manual de BPM (Tarefa 9) ter algo no
 *  campo `notes` do estado `result` — o mesmo espírito de `FAKE_DOCUMENT`. */
const FAKE_NOTES: NoteEvent[] = [
  { pitchMidi: 60, startSec: 0, durationSec: 0.5, amplitude: 0.8 },
  { pitchMidi: 62, startSec: 0.5, durationSec: 0.5, amplitude: 0.75 },
  { pitchMidi: 64, startSec: 1, durationSec: 0.5, amplitude: 0.7 },
]

function fixtureFor(status: string, params: URLSearchParams): SessionState | null {
  switch (status) {
    case 'idle':
      return { status: 'idle' }

    case 'recording':
      return { status: 'recording', source: FAKE_SOURCE, level: 0.55, elapsedMs: 12_000 }

    case 'processing': {
      const requestedStage = params.get('stage')
      const stage = PROCESSING_STAGES.includes(requestedStage as ProcessingStage)
        ? (requestedStage as ProcessingStage)
        : 'transcribing'
      return { status: 'processing', source: FAKE_SOURCE, stage, progress: 0.4 }
    }

    case 'result': {
      // `?state=result&tempo=assumed` / `&key=assumed` — mostra os avisos de
      // BPM (Tarefa 9, decisão 5) e de tonalidade (Tarefa 11, decisão 5)
      // assumidos, sem precisar de forjar onsets ou histogramas irregulares.
      let document = FAKE_DOCUMENT
      if (params.get('tempo') === 'assumed') {
        document = {
          ...document,
          tempo: { ...document.tempo, confidence: 0, source: 'assumed' as const },
        }
      }
      if (params.get('key') === 'assumed') {
        document = {
          ...document,
          key: { ...document.key, sharpsOrFlats: 0, confidence: 0, source: 'assumed' as const },
        }
      }
      return { status: 'result', document, notes: FAKE_NOTES }
    }

    case 'error':
      return {
        status: 'error',
        code: 'exemplo-de-erro',
        recoverable: params.get('recoverable') !== 'false',
      }

    default:
      return null
  }
}

export function getDevStateOverride(): SessionState | null {
  if (!import.meta.env.DEV) return null

  const params = new URLSearchParams(window.location.search)
  const status = params.get('state')
  if (!status) return null

  return fixtureFor(status, params)
}
