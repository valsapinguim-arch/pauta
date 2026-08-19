import { largestNoteDurationAtMost } from './noteDurations'
import type { WorkingNote } from './workingNote'

/**
 * Encurta uma nota que invade a seguinte — decisão 4: nunca desloca o
 * início da nota seguinte, só encurta a anterior. `notes` tem de vir
 * ordenada por `startTick`, cada uma já com a figura escolhida por
 * `chooseNoteType` (a partir da duração real, decisão 3).
 *
 * O encurtamento usa `largestNoteDurationAtMost` (não um corte aritmético
 * cru): o resultado tem sempre de ser uma figura válida, nunca um número de
 * ticks arbitrário.
 */
export function resolveOverlaps(notes: WorkingNote[]): WorkingNote[] {
  const result = notes.map((note) => ({ ...note }))

  for (let i = 0; i < result.length - 1; i++) {
    const current = result[i] as WorkingNote
    const next = result[i + 1] as WorkingNote
    const gap = next.startTick - current.startTick

    if (current.durationTicks > gap) {
      const shortened = largestNoteDurationAtMost(gap)
      current.durationTicks = shortened.ticks
      current.noteType = shortened.noteType
      current.dots = shortened.dots
    }
  }

  return result
}
