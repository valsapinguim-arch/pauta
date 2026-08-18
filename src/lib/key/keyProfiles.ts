/**
 * Perfis de tonalidade de Krumhansl-Schmuckler (decisão 1) — Âmbito técnico
 * da Tarefa 11: "dados, com a fonte citada". Não afinar por tentativa e
 * erro (guardrail em `AGENTS.md`).
 *
 * Fonte: Krumhansl, C. L., & Kessler, E. J. (1982). "Tracing the dynamic
 * changes in perceived tonal organization in a spatial representation of
 * musical keys." Psychological Review, 89(4), 334–368. Valores empíricos de
 * quão bem cada uma das doze classes de altura "encaixa" numa tonalidade
 * maior ou menor, índice 0 = tónica.
 */
export const MAJOR_KEY_PROFILE: readonly number[] = [
  6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88,
]

export const MINOR_KEY_PROFILE: readonly number[] = [
  6.33, 2.68, 3.52, 5.38, 2.6, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17,
]
