/**
 * Constantes do processamento por blocos — Tarefa 19, decisão 5.
 *
 * **Provisório**: os valores certos dependem de medição em dispositivo
 * real (decisão 1/9 desta tarefa) — não foi possível medir em dispositivos
 * reais nesta sessão (ver `docs/performance.md`). Escolhidos por
 * raciocínio, não por medição: janelas de 10 s mantêm o pico de memória
 * de `frames`/`onsets`/`contours` (Tarefa 7) numa fração pequena da
 * duração máxima de gravação, com sobreposição suficiente para nenhuma
 * nota razoável (até ~1 s) ficar invisível às duas janelas ao mesmo tempo.
 */
export const TRANSCRIBE_WINDOW = {
  /** Duração de cada janela entregue ao modelo. */
  WINDOW_SEC: 10,
  /** Sobreposição entre janelas consecutivas — sem isto, uma nota a meio
   *  da fronteira fica invisível ao modelo em ambos os lados, não só
   *  cortada em dois fragmentos fundíveis. */
  OVERLAP_SEC: 1,
  /** Gap máximo para `mergeWindowedNotes` fundir fragmentos da mesma
   *  altura na fronteira — mais folgado do que `NOTE_CLEANUP.MERGE_GAP_MS`
   *  (Tarefa 8) porque aqui o gap pode incluir imprecisão do próprio corte
   *  da janela, não só uma respiração real entre notas. */
  BOUNDARY_MERGE_GAP_MS: 150,
} as const
