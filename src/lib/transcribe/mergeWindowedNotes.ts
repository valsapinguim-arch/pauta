import { mergeFragmented } from '@/lib/notes/mergeFragmented'
import { sortByOnset } from '@/lib/notes/sortByOnset'
import type { NoteEvent } from '@/lib/types'

/**
 * Junta os resultados de várias janelas (Tarefa 19, decisão 5) numa só
 * linha do tempo — concatena, ordena por início (`sortByOnset`, Tarefa 8) e
 * funde fragmentos da mesma altura próximos ou sobrepostos
 * (`mergeFragmented`, Tarefa 8, decisão 6, reaproveitada tal e qual). Uma
 * nota cortada pela fronteira de duas janelas aparece como dois
 * fragmentos consecutivos da mesma altura, muito próximos ou sobrepostos
 * (a sobreposição de `planWindows` garante isto) — exatamente o que
 * `mergeFragmented` já sabe fundir numa nota só.
 */
export function mergeWindowedNotes(windowNotes: NoteEvent[][], mergeGapMs: number): NoteEvent[] {
  return mergeFragmented(sortByOnset(windowNotes.flat()), mergeGapMs)
}
