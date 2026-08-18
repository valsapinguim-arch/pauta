/**
 * Coeficiente de correlação de Pearson entre dois vetores do mesmo
 * comprimento — a métrica de semelhança do método de Krumhansl-Schmuckler
 * (decisão 1). `0` quando qualquer um dos vetores não tem variância (todos
 * os valores iguais) — não há correlação definida, e `0` é neutro em vez de
 * `NaN` a propagar-se para `detectKey`.
 */
export function pearsonCorrelation(a: readonly number[], b: readonly number[]): number {
  const n = a.length
  const meanA = a.reduce((sum, x) => sum + x, 0) / n
  const meanB = b.reduce((sum, x) => sum + x, 0) / n

  let numerator = 0
  let varianceA = 0
  let varianceB = 0

  for (let i = 0; i < n; i++) {
    const diffA = (a[i] as number) - meanA
    const diffB = (b[i] as number) - meanB
    numerator += diffA * diffB
    varianceA += diffA * diffA
    varianceB += diffB * diffB
  }

  const denominator = Math.sqrt(varianceA * varianceB)
  if (denominator === 0) return 0

  return numerator / denominator
}
