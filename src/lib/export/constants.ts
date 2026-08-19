/**
 * Constantes da exportação (Tarefa 15) — mesma convenção de `QUANTIZE`
 * (Tarefa 10) e `PLAYBACK` (Tarefa 14): um só sítio.
 */
export const EXPORT = {
  /** Nome usado quando o título, depois de sanitizado, fica vazio. */
  FALLBACK_FILENAME: 'pauta',
  /** Comprimento máximo de um nome de ficheiro sanitizado (decisão 7) —
   *  generoso o suficiente para um título completo, curto o suficiente para
   *  nunca colidir com o limite de qualquer sistema de ficheiros comum. */
  MAX_FILENAME_LENGTH: 100,

  /** Velocidade MIDI constante — o `ScoreDocument` não guarda dinâmica
   *  nenhuma (Tarefa 12), por isso não há de onde tirar uma velocidade por
   *  nota. 90 é um mezzo-forte neutro, nem sussurrado nem forçado. */
  MIDI_VELOCITY: 90,
  /** Canal 0, único usado — a peça é sempre monofónica (Tarefa 1, decisão
   *  6 do produto). */
  MIDI_CHANNEL: 0,
} as const
