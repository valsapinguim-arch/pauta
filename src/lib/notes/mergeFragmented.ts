import type { NoteEvent } from '@/lib/types'

/**
 * Funde notas repetidas fragmentadas — Tarefa 8, decisão 6. Duas notas
 * consecutivas com a mesma altura, separadas por menos de `maxGapMs`
 * (incluindo sobreposição, gap negativo), tornam-se uma só nota que cobre a
 * gama inteira. A amplitude fundida é o máximo das amostras fundidas — o
 * pico de intensidade do que era uma nota sustentada só, não uma média
 * diluída por um fragmento fraco.
 *
 * Assume a entrada já ordenada por início (`sortByOnset`) — segunda etapa de
 * `cleanNotes` (decisão 8).
 */
export function mergeFragmented(notes: NoteEvent[], maxGapMs: number): NoteEvent[] {
  if (notes.length === 0) return []

  const maxGapSec = maxGapMs / 1000
  const [first, ...rest] = notes as [NoteEvent, ...NoteEvent[]]
  const merged: NoteEvent[] = []
  let current = first

  for (const next of rest) {
    const currentEnd = current.startSec + current.durationSec
    const gapSec = next.startSec - currentEnd

    if (next.pitchMidi === current.pitchMidi && gapSec < maxGapSec) {
      const nextEnd = next.startSec + next.durationSec
      current = {
        ...current,
        durationSec: Math.max(currentEnd, nextEnd) - current.startSec,
        amplitude: Math.max(current.amplitude, next.amplitude),
      }
    } else {
      merged.push(current)
      current = next
    }
  }
  merged.push(current)

  return merged
}
