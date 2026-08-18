/**
 * Alinha um início ao ponto de grelha mais próximo (decisão 2). Aceita a
 * distância mesmo quando excede metade da subdivisão — não há alternativa
 * melhor; é `deviationTicks` que regista isso para `rhythmConfidence`, não
 * uma recusa.
 */
export interface SnappedOnset {
  tick: number
  /** `|tick original - tick alinhado|` — quanto maior, mais a grelha está a
   *  forçar (decisão 2). */
  deviationTicks: number
}

export function snapOnset(tick: number, gridTicks: number): SnappedOnset {
  const snapped = Math.round(tick / gridTicks) * gridTicks
  return { tick: snapped, deviationTicks: Math.abs(tick - snapped) }
}
