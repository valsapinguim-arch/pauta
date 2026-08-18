/**
 * Corta silêncio nas pontas de um sinal — nunca no interior (Tarefa 6,
 * decisão 7): silêncio interior são pausas musicais, e cortá-las apagaria
 * informação rítmica real. As fronteiras são achadas por RMS em janelas
 * curtas; o número de amostras cortadas no início é devolvido como
 * `trimOffsetSamples` — a Tarefa 9 (alinhamento rítmico) e a Tarefa 14
 * (reprodução) precisam de o somar de volta para não perderem a sincronia
 * com o áudio original.
 */

/** Mesma ordem de grandeza do limiar de "não se ouviu nada" das Tarefas 4/5
 *  (`TOO_QUIET_RMS_THRESHOLD`), mas um conceito diferente: aquele decide se a
 *  gravação INTEIRA deve ser rejeitada; este só decide onde começa e acaba o
 *  sinal dentro de uma gravação já aceite. Constantes separadas de propósito
 *  — não são a mesma decisão, só coincidem em ordem de grandeza. */
const SILENCE_RMS_THRESHOLD = 0.01

/** Janelas de 20 ms: curtas o suficiente para não perder um ataque de nota
 *  logo a seguir ao silêncio inicial, longas o suficiente para a média RMS
 *  não reagir a um único pico isolado. */
const WINDOW_MS = 20

/** Margem deixada de cada lado da fronteira encontrada — evita cortar
 *  rente ao ataque da primeira nota (ou à cauda da última), o que soaria a
 *  corte abrupto. */
const MARGIN_MS = 50

export interface TrimSilenceResult {
  samples: Float32Array
  /** Amostras cortadas do INÍCIO — 0 se nada foi cortado (incluindo o caso
   *  em que o sinal inteiro está abaixo do limiar: não há fronteira nenhuma
   *  para cortar, e essa gravação já deveria ter sido rejeitada a montante
   *  como `too-quiet`, Tarefas 4/5). */
  trimOffsetSamples: number
}

export function trimSilence(samples: Float32Array, sampleRate: number): TrimSilenceResult {
  if (samples.length === 0) return { samples, trimOffsetSamples: 0 }

  const windowSize = Math.max(1, Math.round((WINDOW_MS / 1000) * sampleRate))
  const marginSamples = Math.round((MARGIN_MS / 1000) * sampleRate)

  let firstLoudStart = -1
  let lastLoudEnd = -1

  for (let start = 0; start < samples.length; start += windowSize) {
    const end = Math.min(samples.length, start + windowSize)
    let sumOfSquares = 0
    for (let i = start; i < end; i += 1) {
      const sample = samples[i] as number
      sumOfSquares += sample * sample
    }
    const rms = Math.sqrt(sumOfSquares / (end - start))

    if (rms >= SILENCE_RMS_THRESHOLD) {
      if (firstLoudStart === -1) firstLoudStart = start
      lastLoudEnd = end
    }
  }

  if (firstLoudStart === -1) {
    return { samples, trimOffsetSamples: 0 }
  }

  const trimStart = Math.max(0, firstLoudStart - marginSamples)
  const trimEnd = Math.min(samples.length, lastLoudEnd + marginSamples)

  return { samples: samples.slice(trimStart, trimEnd), trimOffsetSamples: trimStart }
}
