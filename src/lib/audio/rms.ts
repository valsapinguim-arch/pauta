/**
 * Raiz quadrada média (RMS) de um bloco de amostras PCM — a medida de
 * intensidade usada para o indicador de nível (Tarefa 4, decisão 8) e para
 * decidir se uma gravação ficou demasiado baixa para transcrever (decisão 9).
 *
 * Pura de propósito: corre tanto no worklet de captura (Tarefa 4, contexto
 * `AudioWorkletGlobalScope`, sem `lib.dom`) como pode ser testada aqui em
 * Node — daí viver em `@/lib` e não em `@/workers`.
 */
export function calculateRms(samples: Float32Array): number {
  if (samples.length === 0) return 0

  let sumOfSquares = 0
  for (let i = 0; i < samples.length; i += 1) {
    const sample = samples[i] as number
    sumOfSquares += sample * sample
  }

  return Math.sqrt(sumOfSquares / samples.length)
}
