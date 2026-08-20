/**
 * Constantes da limpeza de notas — ver Tarefa 8, Âmbito técnico ("Definir as
 * constantes num só sítio"). Todas provisórias, tal como `MODEL_THRESHOLDS`
 * (Tarefa 7) e `NOTE_CLEANUP` original do plano: só se sabe o valor certo
 * depois de ouvir e comparar com áudio real, o que só é possível a sério
 * quando a pauta se desenha (Tarefa 13). Interagem com `MODEL_THRESHOLDS`:
 * apertar um permite aliviar o outro — afinar os dois em conjunto.
 */
export const NOTE_CLEANUP = {
  /** Notas repetidas à mesma altura, separadas por menos disto, fundem-se
   *  numa só (decisão 6) — vibrato/tremolo parte notas longas em fragmentos. */
  MAX_FRAGMENT_GAP_MS: 50,

  /** Candidato a harmónico: início a menos disto de outra nota mais grave
   *  (decisão 3, "aproximadamente ao mesmo tempo"). */
  HARMONIC_ONSET_TOLERANCE_MS: 30,

  /** Intervalos considerados harmónicos, em semitons: oitava e duodécima
   *  (decisão 3). */
  HARMONIC_INTERVALS_SEMITONES: [12, 19],

  /** Um candidato a harmónico só é removido se a sua amplitude for menor do
   *  que esta fração da amplitude da nota mais grave (decisão 3,
   *  "sensivelmente menor"). */
  HARMONIC_MAX_AMPLITUDE_RATIO: 0.7,

  /** Duração mínima, em ms, para uma nota sobreviver (decisão 4) — mais
   *  permissivo do que `MIN_NOTE_LENGTH_MS` do modelo (Tarefa 7) de
   *  propósito: o corte definitivo acontece aqui, testável, não dentro do
   *  modelo. */
  MIN_NOTE_DURATION_MS: 60,

  /** Duas notas atacadas a menos disto uma da outra contam como SIMULTÂNEAS
   *  (um acorde) para `reduceToMonophonic` — decisões 1 e 2.
   *
   *  Tem de ficar ABAIXO de `MIN_NOTE_DURATION_MS`: assim nunca funde duas
   *  notas que ambas sobreviveriam como eventos separados, por mais rápida
   *  que seja a passagem. É esse o critério do valor, não uma afinação
   *  contra uma gravação específica — 50 ms é também o limiar perceptivo
   *  habitual de simultaneidade. */
  SIMULTANEOUS_ONSET_MS: 50,

  /** Fração da amplitude mediana das notas detetadas abaixo da qual uma nota
   *  é descartada (decisão 5) — relativa, nunca absoluta. */
  MIN_RELATIVE_AMPLITUDE: 0.25,
} as const
