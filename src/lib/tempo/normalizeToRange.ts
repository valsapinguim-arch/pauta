/**
 * Resolve a ambiguidade de oitava métrica (decisão 3): dobra ou divide o
 * candidato até caber em `[min, max]`. `bpm <= 0` não tem oitava nenhuma
 * para dobrar — devolve-se tal como está, quem chama já trata isso como
 * "sem estimativa" antes de chegar aqui.
 */
export function normalizeToRange(bpm: number, min: number, max: number): number {
  if (bpm <= 0) return bpm

  let normalized = bpm
  while (normalized < min) normalized *= 2
  while (normalized > max) normalized /= 2

  return normalized
}
