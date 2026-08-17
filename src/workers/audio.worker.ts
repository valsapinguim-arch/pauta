/// <reference lib="webworker" />

import { assertModelInput, MODEL_SAMPLE_RATE } from '@/lib/audio/assertModelInput'
import { lowPassFilter } from '@/lib/audio/lowPassFilter'
import { normalizePeak } from '@/lib/audio/normalizePeak'
import { resample } from '@/lib/audio/resample'
import { toMono } from '@/lib/audio/toMono'
import { trimSilence } from '@/lib/audio/trimSilence'
import type {
  PreprocessErrorMessage,
  PreprocessProgressMessage,
  PreprocessRequest,
  PreprocessResultMessage,
  PreprocessStep,
} from './audio.worker.types'

/**
 * Worker de pré-processamento de áudio — ver Tarefa 6. Descartável (decisão
 * 4 de `docs/architecture.md`): criado por transcrição, terminado no fim ou
 * ao cancelar. Ao contrário do worker de transcrição (Tarefa 7), não guarda
 * estado nenhum entre mensagens.
 *
 * Ordem fixa (decisão 8) — trocar a ordem produz um resultado diferente e
 * pior, não é uma otimização:
 *   mono → passa-baixo → reamostrar → cortar silêncio → normalizar
 *
 * O protocolo de mensagens vive em `audio.worker.types.ts`, não aqui — ver
 * esse ficheiro para o porquê.
 */

/** ~10.5 kHz, abaixo da Nyquist da taxa de destino (22050/2 = 11025 Hz) — ver
 *  Tarefa 6, decisão 4. */
const LOW_PASS_CUTOFF_HZ = 10_500

/** Ver Tarefa 6, decisão 6 — mesmo valor usado em qualquer transcrição. */
const NORMALIZE_TARGET_DBFS = -1

const STEPS: PreprocessStep[] = ['mono', 'low-pass', 'resample', 'trim-silence', 'normalize']

function postProgress(step: PreprocessStep): void {
  const stepIndex = STEPS.indexOf(step)
  const message: PreprocessProgressMessage = {
    type: 'progress',
    step,
    progress: (stepIndex + 1) / STEPS.length,
  }
  self.postMessage(message)
}

self.onmessage = (event: MessageEvent<PreprocessRequest>) => {
  const { pcm, sampleRate } = event.data

  try {
    /* A entrada já chega como um só `Float32Array` (Tarefas 4/5 convergem
       nesse formato antes de chegar aqui) — `toMono` corre na mesma por a
       ordem fazer parte do contrato (decisão 8), não porque haja aqui
       trabalho real sobre múltiplos canais. */
    const mono = toMono([pcm])
    postProgress('mono')

    const filtered = lowPassFilter(mono, sampleRate, LOW_PASS_CUTOFF_HZ)
    postProgress('low-pass')

    const resampled = resample(filtered, sampleRate, MODEL_SAMPLE_RATE)
    postProgress('resample')

    const { samples: trimmed, trimOffsetSamples } = trimSilence(resampled, MODEL_SAMPLE_RATE)
    postProgress('trim-silence')

    const normalized = normalizePeak(trimmed, NORMALIZE_TARGET_DBFS)
    postProgress('normalize')

    // Última verificação antes de sair do worker — decisão 9.
    assertModelInput(normalized, MODEL_SAMPLE_RATE)

    const result: PreprocessResultMessage = {
      type: 'result',
      pcm: normalized,
      sampleRate: MODEL_SAMPLE_RATE,
      trimOffsetSamples,
    }
    // Transferido, não copiado — decisão 2. `normalized` não volta a ser
    // lido depois desta linha.
    self.postMessage(result, [normalized.buffer])
  } catch (error) {
    const message: PreprocessErrorMessage = {
      type: 'error',
      message: error instanceof Error ? error.message : 'Erro desconhecido no pré-processamento',
    }
    self.postMessage(message)
  }
}
