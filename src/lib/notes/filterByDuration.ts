import type { NoteEvent } from '@/lib/types'

/** Descarta notas mais curtas do que `minMs` — Tarefa 8, decisão 4. */
export function filterByDuration(notes: NoteEvent[], minMs: number): NoteEvent[] {
  const minSec = minMs / 1000
  return notes.filter((note) => note.durationSec >= minSec)
}
