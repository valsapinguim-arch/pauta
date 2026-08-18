/**
 * Constantes da deteção de tempo — Tarefa 9, mesma convenção de
 * `NOTE_CLEANUP` (Tarefa 8): um só sítio, provisórias até afinação com áudio
 * real (Tarefa 13).
 */
export const TEMPO = {
  /** Gama de ambiguidade de oitava métrica (decisão 3): qualquer candidato
   *  fora daqui é dobrado ou dividido até caber. A maioria da música popular
   *  vive aqui. */
  MIN_BPM: 60,
  MAX_BPM: 200,

  /** Andamento assumido quando a confiança é baixa (decisão 5). */
  DEFAULT_BPM: 120,

  /** Abaixo disto não há evidência suficiente para estimar nada (decisão 5,
   *  "menos de ~8 onsets"). */
  MIN_ONSETS_FOR_ESTIMATE: 8,

  /** Intervalos entre onsets maiores do que isto não entram no histograma —
   *  acima de ~2 s já não é plausível como intervalo métrico de interesse
   *  (equivale a 30 BPM, bem abaixo da gama depois de normalizado). */
  MAX_INTERVAL_SEC: 2,

  /** Largura de cada caixa do histograma de intervalos, em segundos. */
  HISTOGRAM_BIN_SEC: 0.02,

  /** Confiança mínima para aceitar uma estimativa como `detected`; abaixo
   *  disto usa-se o caminho alternativo da decisão 5. */
  MIN_CONFIDENCE: 0.5,

  /** Tolerância, como fração do período do tempo, para um onset contar como
   *  alinhado com a grelha em `computeTempoConfidence`. */
  GRID_ALIGNMENT_TOLERANCE: 0.15,

  /** Gama aceite para a correção manual do BPM (decisão 6) — deliberadamente
   *  mais larga do que `MIN_BPM`/`MAX_BPM`: essa gama resolve ambiguidade de
   *  deteção, não limita o que o utilizador sabe que tocou. */
  MANUAL_MIN_BPM: 20,
  MANUAL_MAX_BPM: 400,
} as const
