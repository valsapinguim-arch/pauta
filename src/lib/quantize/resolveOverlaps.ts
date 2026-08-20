import { largestNoteDurationAtMost } from './noteDurations'
import type { WorkingNote } from './workingNote'

/**
 * Encurta uma nota que invade a seguinte — decisão 4: nunca desloca o
 * início da nota seguinte, só encurta a anterior. `notes` tem de vir
 * ordenada por `startTick`, cada uma já com a figura escolhida por
 * `chooseNoteType` (a partir da duração real, decisão 3).
 *
 * O encurtamento usa `largestNoteDurationAtMost` (não um corte aritmético
 * cru): o resultado tem sempre de ser uma figura VÁLIDA e EXATA, nunca um
 * número de ticks arbitrário — `validateScoreDocument` (Tarefa 12) soma
 * cada compasso a partir das figuras, por isso uma duração sem figura
 * própria faz a validação falhar mesmo com as durações reais certas
 * (Tarefa 21, bug real com gravações).
 *
 * Quando nem a menor figura cabe no espaço disponível, a nota é
 * DESCARTADA em vez de encurtada: duas notas tão próximas que não cabe uma
 * semicolcheia entre elas são, na prática, simultâneas — e a monofonia
 * (Tarefa 8) já decidiu que só uma sobrevive. Emitir uma duração
 * impossível de notar seria pior do que perder a nota.
 */
export function resolveOverlaps(notes: WorkingNote[]): WorkingNote[] {
  const result: WorkingNote[] = []

  for (let i = 0; i < notes.length; i++) {
    const current = { ...(notes[i] as WorkingNote) }
    const next = notes[i + 1]

    if (next) {
      const gap = next.startTick - current.startTick

      if (current.durationTicks > gap) {
        const shortened = largestNoteDurationAtMost(gap)
        // Não cabe nem a menor figura — ver nota acima.
        if (shortened.ticks > gap) continue

        current.durationTicks = shortened.ticks
        current.noteType = shortened.noteType
        current.dots = shortened.dots
      }
    }

    result.push(current)
  }

  return result
}
