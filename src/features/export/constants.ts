/**
 * Constantes da exportação visual (PNG/PDF) — Tarefa 15. Distintas de
 * `@/lib/export/constants.ts` (MusicXML/MIDI, puras): estas dependem de
 * decisões visuais (resolução, página), não da estrutura do `ScoreDocument`.
 */
export const VISUAL_EXPORT = {
  /** PNG a 2x — nítido em ecrãs de alta densidade e para partilha, sem o
   *  ficheiro enorme que 4x produziria (Tarefa 15, decisão 4). */
  PNG_SCALE: 2,

  /** A exportação usa sempre tinta escura sobre página branca (decisão 5:
   *  A4 pensado para imprimir), independente do tema claro/escuro do ecrã
   *  — um PDF ou PNG "em modo escuro" não é o que se espera ao abrir um
   *  ficheiro para imprimir ou para abrir noutro programa de notação. */
  INK_COLOR: '#1a1a18',
  BACKGROUND_COLOR: '#ffffff',

  /** A4 retrato em milímetros (decisão 5). */
  PAGE_WIDTH_MM: 210,
  PAGE_HEIGHT_MM: 297,
  PAGE_MARGIN_MM: 15,
  /** Espaço reservado ao título no topo da página, acima da pauta. */
  TITLE_HEIGHT_MM: 12,
  TITLE_FONT_SIZE_PT: 16,
} as const
