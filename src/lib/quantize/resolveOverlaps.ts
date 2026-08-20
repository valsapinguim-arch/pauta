import { largestNoteDurationAtMost, nearestNoteDuration } from './noteDurations'
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
      // Tal como em `decomposeRestTicks`: quando `gap` é menor que a
      // semicorchea, `largestNoteDurationAtMost` promove-a na mesma (decisão
      // 5, `noteDurations.ts`) e pode devolver mais ticks do que `gap`. Deixar
      // isso passar invadiria o início da nota seguinte — o oposto da decisão
      // 4 deste ficheiro. A duração real fica presa a `gap`; a figura é só a
      // aproximação visual mais próxima.
      current.durationTicks = Math.min(shortened.ticks, gap)
      const visual =
        current.durationTicks === shortened.ticks
          ? shortened
          : nearestNoteDuration(current.durationTicks)
      current.noteType = visual.noteType
      current.dots = visual.dots
    }
  }

  return result
}
