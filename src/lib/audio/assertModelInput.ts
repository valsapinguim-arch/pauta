/**
 * Última verificação antes de entregar áudio ao worker de transcrição
 * (Tarefa 7) — ver Tarefa 6, decisão 9 e `docs/architecture.md`, decisão 5:
 * "22050 Hz mono é um contrato, não uma preferência". Depois deste ponto o
 * modelo aceita qualquer coisa e devolve notas plausíveis mas erradas — o
 * pior modo de falha possível, porque não parece falha nenhuma. Por isso
 * esta função falha explicitamente (lança) em vez de tentar corrigir ou
 * ignorar o problema.
 *
 * Um só canal não é verificado aqui: `Float32Array` não tem dimensão de
 * canal — é a própria assinatura desta função (e de todo o pipeline a
 * jusante da Tarefa 6) que torna "mais do que um canal" irrepresentável.
 */

/** A taxa de amostragem que o Basic Pitch foi treinado para receber — ver
 *  `docs/architecture.md`, decisão 5. Único sítio que define este número;
 *  o worker de áudio importa-o daqui para saber para onde reamostrar. */
export const MODEL_SAMPLE_RATE = 22_050

/** Abaixo disto o áudio não tem duração suficiente para produzir uma nota
 *  sequer — um valor pequeno de propósito (100 ms): esta função só apanha
 *  entradas claramente inválidas, não decide o que é "curto demais para
 *  ser útil" (isso já foi decidido a montante, Tarefas 4/5, decisão de
 *  limite mínimo de gravação). */
const MIN_SAMPLES = Math.round(MODEL_SAMPLE_RATE * 0.1)

export function assertModelInput(samples: Float32Array, sampleRate: number): void {
  if (sampleRate !== MODEL_SAMPLE_RATE) {
    throw new Error(
      `assertModelInput: sampleRate tem de ser ${MODEL_SAMPLE_RATE} Hz, recebeu ${sampleRate}`,
    )
  }

  if (samples.length < MIN_SAMPLES) {
    throw new Error(
      `assertModelInput: áudio demasiado curto (${samples.length} amostras, mínimo ${MIN_SAMPLES})`,
    )
  }

  let peak = 0
  for (let i = 0; i < samples.length; i += 1) {
    const value = samples[i] as number
    if (!Number.isFinite(value)) {
      throw new Error('assertModelInput: encontrado NaN ou Infinity nas amostras')
    }
    const abs = Math.abs(value)
    if (abs > peak) peak = abs
  }

  if (peak > 1) {
    throw new Error(`assertModelInput: pico acima de 1.0 (${peak})`)
  }
}
