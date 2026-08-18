/**
 * Filtro passa-baixo por convolução com um núcleo sinc janelado (Hamming) —
 * ver Tarefa 6, decisão 4. Aplicado sempre ANTES de reduzir a taxa de
 * amostragem: sem isto, frequências acima da nova Nyquist dobram para dentro
 * da banda audível como componentes falsos, que o modelo vê como notas que
 * nunca existiram (ver `resample.ts` para o outro lado deste contrato).
 *
 * Não é `OfflineAudioContext` nem nenhuma API do browser — ver Tarefa 6,
 * decisão 3: o algoritmo tem de ser determinístico e testável em Node.
 */

/** Número de coeficientes do núcleo (ímpar, centrado). Mais coeficientes =
 *  transição mais íngreme e mais trabalho por amostra; 63 é um meio-termo
 *  razoável para 60 s de áudio num worker — a Tarefa 19 mede e ajusta se
 *  precisar. */
const TAP_COUNT = 63

function sinc(x: number): number {
  if (x === 0) return 1
  const px = Math.PI * x
  return Math.sin(px) / px
}

/** Janela de Hamming — reduz o *ripple* do núcleo sinc truncado (efeito de
 *  Gibbs) à custa de uma transição ligeiramente menos íngreme do que uma
 *  janela retangular. */
function hamming(n: number, span: number): number {
  return 0.54 - 0.46 * Math.cos((2 * Math.PI * n) / span)
}

function buildKernel(sampleRate: number, cutoffHz: number): Float64Array {
  const normalizedCutoff = cutoffHz / sampleRate
  const span = TAP_COUNT - 1
  const center = span / 2
  const kernel = new Float64Array(TAP_COUNT)

  let sum = 0
  for (let n = 0; n < TAP_COUNT; n += 1) {
    const value = sinc(2 * normalizedCutoff * (n - center)) * hamming(n, span)
    kernel[n] = value
    sum += value
  }

  // Normaliza para ganho unitário em DC — sem isto o filtro também alteraria
  // o volume geral do sinal, confundindo-se com a normalização (decisão 8:
  // a ordem das etapas importa precisamente para evitar este tipo de mistura).
  for (let n = 0; n < TAP_COUNT; n += 1) {
    kernel[n] = (kernel[n] as number) / sum
  }

  return kernel
}

export function lowPassFilter(
  samples: Float32Array,
  sampleRate: number,
  cutoffHz: number,
): Float32Array {
  if (samples.length === 0) return samples

  const kernel = buildKernel(sampleRate, cutoffHz)
  const center = Math.floor((TAP_COUNT - 1) / 2)
  const output = new Float32Array(samples.length)

  for (let i = 0; i < samples.length; i += 1) {
    let acc = 0
    for (let k = 0; k < TAP_COUNT; k += 1) {
      const sampleIndex = i - center + k
      if (sampleIndex >= 0 && sampleIndex < samples.length) {
        acc += (kernel[k] as number) * (samples[sampleIndex] as number)
      }
    }
    output[i] = acc
  }

  return output
}
