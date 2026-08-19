import { decomposeRestTicks } from './decomposeRestTicks'
import type { WorkingNote } from './workingNote'

/**
 * Preenche os espaços ENTRE notas (e antes da primeira, se houver) com
 * pausas — decisão 6. Só trata o interior; o espaço depois da última nota
 * é `padFinalMeasure`, que precisa de saber onde a peça deve terminar, algo
 * que esta função não tem como assumir sozinha.
 *
 * `notes` tem de vir ordenada por `startTick`, sem sobreposições
 * (`resolveOverlaps` já correu) e sem atravessar barras
 * (`splitAcrossBarlines` já correu) — a ordem destas três etapas em
 * `quantize` não é arbitrária.
 */
export function fillRests(notes: WorkingNote[], measureTicks: number): WorkingNote[] {
  const beatTicks = measureTicks / 4
  const result: WorkingNote[] = []
  let cursor = 0

  for (const note of notes) {
    if (note.startTick > cursor) {
      result.push(...decomposeRestTicks(cursor, note.startTick, beatTicks, measureTicks))
    }
    result.push(note)
    cursor = note.startTick + note.durationTicks
  }

  return result
}
