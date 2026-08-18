/**
 * Pequenos utilitários estatísticos partilhados por `filterByAmplitude` e
 * `computeConfidence` — puros, sem ligação nenhuma ao domínio de notas.
 */

/** Mediana de uma lista de números. `0` para uma lista vazia — quem chama
 *  decide se isso é um caso válido (ver `filterByAmplitude`, que trata a
 *  entrada vazia antes de chegar aqui). */
export function median(values: number[]): number {
  if (values.length === 0) return 0

  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)

  if (sorted.length % 2 === 0) {
    return ((sorted[mid - 1] as number) + (sorted[mid] as number)) / 2
  }
  return sorted[mid] as number
}

/** Confina um valor a [0, 1] — `NaN` conta como `0` (ver `session.reducer.ts`,
 *  mesma razão: um valor fora de gama a chegar à UI produz um estado visual
 *  quebrado em vez de um erro). */
export function clamp01(value: number): number {
  if (Number.isNaN(value)) return 0
  return Math.min(1, Math.max(0, value))
}
