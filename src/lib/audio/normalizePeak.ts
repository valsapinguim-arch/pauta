/**
 * Normalização de pico — um ganho único e uniforme aplicado a toda a
 * gravação, calculado a partir do pico absoluto (Tarefa 6, decisão 6).
 * Nunca compressão nem *gating*: essas alterariam as relações de amplitude
 * entre notas, que a Tarefa 8 usa para filtrar e que uma futura dinâmica
 * poderia usar. Um ganho único preserva essas relações exatamente.
 */
export function normalizePeak(samples: Float32Array, targetDbfs: number): Float32Array {
  let peak = 0
  for (let i = 0; i < samples.length; i += 1) {
    const abs = Math.abs(samples[i] as number)
    if (abs > peak) peak = abs
  }

  // Sinal em silêncio (pico 0): não há ganho nenhum que faça sentido — um
  // ganho infinito amplificaria só ruído numérico. Devolve inalterado.
  if (peak === 0) return samples

  const targetLinear = Math.pow(10, targetDbfs / 20)
  const gain = targetLinear / peak

  const output = new Float32Array(samples.length)
  for (let i = 0; i < samples.length; i += 1) {
    output[i] = (samples[i] as number) * gain
  }
  return output
}
