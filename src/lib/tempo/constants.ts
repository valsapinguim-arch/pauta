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

  /** Margem mínima entre a melhor e a segunda melhor fase de compasso para
   *  aceitar uma anacruse (`estimateDownbeat`). A Tarefa 9, decisão 8,
   *  recusava detetar anacruse porque "uma tentativa de adivinhar que falhe"
   *  é pior do que assumir que a música começa no tempo forte. O argumento
   *  continua de pé, e não há controlo manual para corrigir um palpite
   *  errado — por isso na dúvida comporta-se como antes (`pickupBeats: 0`).
   *
   *  O valor NÃO é arbitrário: a margem foi medida sobre melodias sintéticas
   *  e os regimes separam-se por uma ordem de grandeza —
   *    anacruse real e clara ....... 0,34 a 0,39 (e sempre a fase certa)
   *    evidência fraca (~5% de acento) ... 0,024
   *    sem evidência (notas iguais) ...... 0,000
   *  0,25 fica ~10× acima do ruído e com folga abaixo do que é atingível.
   *
   *  Não subir isto à espera de "mais certeza": ~0,5 é um TETO estrutural em
   *  4/4, não um alvo. A hipótese rival é sempre a que põe os tempos fortes
   *  no tempo 3, que vale 0,5 contra 1,0 (`METRICAL_WEIGHTS_4_4`) — a
   *  ambiguidade de meio compasso é real em música, não um defeito do
   *  algoritmo. Um limiar de 0,6 nunca dispararia. */
  DOWNBEAT_MIN_CONFIDENCE: 0.25,

  /** Pesos métricos de cada tempo do compasso em 4/4 (`estimateDownbeat`):
   *  o primeiro tempo é o mais forte, o terceiro é o meio-forte, os outros
   *  dois são fracos. Só usados para PONTUAR uma hipótese de fase — não
   *  alteram nada da notação. */
  METRICAL_WEIGHTS_4_4: [1, 0.25, 0.5, 0.25],

  /** Gama aceite para a correção manual do BPM (decisão 6) — deliberadamente
   *  mais larga do que `MIN_BPM`/`MAX_BPM`: essa gama resolve ambiguidade de
   *  deteção, não limita o que o utilizador sabe que tocou. */
  MANUAL_MIN_BPM: 20,
  MANUAL_MAX_BPM: 400,
} as const
