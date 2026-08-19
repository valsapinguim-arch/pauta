/**
 * Constantes da deteção de tonalidade — Tarefa 11, mesma convenção de
 * `TEMPO` (Tarefa 9) e `QUANTIZE` (Tarefa 10): um só sítio, provisórias até
 * afinação com áudio real (Tarefa 13).
 */
export const KEY = {
  /** Abaixo disto não há evidência suficiente para correlacionar com
   *  perfis de tonalidade (decisão 5, "muito poucas notas"). */
  MIN_NOTES_FOR_ESTIMATE: 5,

  /** Normaliza a margem entre a melhor e a segunda melhor correlação
   *  (decisão 5) para uma confiança em [0, 1]. Margens típicas em melodias
   *  tonais claras rondam 0.1–0.2 (Pearson); esta escala não é um valor
   *  publicado, é calibração provisória própria. */
  MARGIN_SCALE: 0.15,

  /** Confiança mínima para aceitar a tonalidade como `detected`; abaixo
   *  disto usa-se o caminho alternativo da decisão 5 (dó maior, `assumed`). */
  MIN_CONFIDENCE: 0.3,
} as const
