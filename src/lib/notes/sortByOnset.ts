import type { NoteEvent } from '@/lib/types'

/** Primeiro passo de `cleanNotes` (Tarefa 8, decisão 8) — todas as etapas
 *  seguintes assumem notas ordenadas por início. Nova array; nunca muta a
 *  entrada. */
export function sortByOnset(notes: NoteEvent[]): NoteEvent[] {
  return [...notes].sort((a, b) => a.startSec - b.startSec)
}
