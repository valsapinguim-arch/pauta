import { decomposeRestTicks } from './decomposeRestTicks'
import type { WorkingNote } from './workingNote'

/**
 * Completa o último compasso com pausas até ao fim (decisão 8) — um
 * compasso incompleto é notação inválida. Chamar por último, depois de
 * `fillRests`: o espaço a preencher aqui é só o que sobra depois da última
 * nota ou pausa, nunca um espaço interior.
 */
export function padFinalMeasure(notes: WorkingNote[], measureTicks: number): WorkingNote[] {
  if (notes.length === 0) return notes

  const last = notes[notes.length - 1] as WorkingNote
  const endTick = last.startTick + last.durationTicks
  const measureEnd = Math.ceil(endTick / measureTicks) * measureTicks

  if (measureEnd === endTick) return notes

  const beatTicks = measureTicks / 4
  const padding = decomposeRestTicks(endTick, measureEnd, beatTicks, measureTicks)

  return [...notes, ...padding]
}
