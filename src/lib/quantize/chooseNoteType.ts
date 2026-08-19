import type { NoteType } from '@/lib/types'
import { nearestNoteDuration } from './noteDurations'

export interface ChosenNoteType {
  noteType: NoteType
  dots: 0 | 1
}

/** Figura mais próxima de `durationTicks` — Âmbito técnico da Tarefa 10.
 *  Fina camada sobre `nearestNoteDuration` (`noteDurations.ts`) que descarta
 *  `ticks`: quem chama já sabe a duração real, só precisa da notação. */
export function chooseNoteType(durationTicks: number): ChosenNoteType {
  const { noteType, dots } = nearestNoteDuration(durationTicks)
  return { noteType, dots }
}
