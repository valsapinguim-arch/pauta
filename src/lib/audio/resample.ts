/**
 * Reamostragem por convolução com um núcleo de Lanczos (sinc janelado com
 * outro sinc) — ver Tarefa 6, decisão 3. Nunca interpolação linear (introduz
 * *aliasing* e atenua as frequências altas, onde vive o ataque das notas) e
 * nunca `OfflineAudioContext` (algoritmo não especificado, não disponível de
 * forma fiável num worker, e não reproduzível entre browsers).
 *
 * Esta função, sozinha, não evita *aliasing* ao reduzir a taxa — só
 * reconstrói o sinal contínuo a partir das amostras de entrada e reamostra-o
 * na nova taxa. A prevenção de *aliasing* é o `lowPassFilter` aplicado ANTES
 * desta função (Tarefa 6, decisão 4); a ordem entre os dois faz parte do
 * contrato, não é uma escolha desta função.
 */

/** Janela do núcleo de Lanczos, em amostras de entrada para cada lado do
 *  ponto interpolado. `a = 3` é o valor clássico (usado por bibliotecas como
 *  libsamplerate) — bom compromisso entre nitidez e custo. */
const LANCZOS_A = 3

function lanczosKernel(x: number): number {
  if (x === 0) return 1
  if (x <= -LANCZOS_A || x >= LANCZOS_A) return 0
  const px = Math.PI * x
  return (LANCZOS_A * Math.sin(px) * Math.sin(px / LANCZOS_A)) / (px * px)
}

export function resample(samples: Float32Array, fromRate: number, toRate: number): Float32Array {
  if (fromRate === toRate || samples.length === 0) return samples

  const ratio = fromRate / toRate
  const outputLength = Math.max(0, Math.round(samples.length / ratio))
  const output = new Float32Array(outputLength)

  for (let i = 0; i < outputLength; i += 1) {
    const x = i * ratio
    const x0 = Math.floor(x)

    let sum = 0
    for (let k = -LANCZOS_A + 1; k <= LANCZOS_A; k += 1) {
      const sampleIndex = x0 + k
      if (sampleIndex < 0 || sampleIndex >= samples.length) continue
      sum += (samples[sampleIndex] as number) * lanczosKernel(x - sampleIndex)
    }
    output[i] = sum
  }

  return output
}
