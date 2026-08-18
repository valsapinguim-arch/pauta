import type { QuantizedNote } from '@/lib/types'

/**
 * Histograma das doze classes de altura, ponderado por duração — decisão 1:
 * "ponderar por duração e não por contagem: uma nota longa define a
 * tonalidade mais do que uma nota de passagem rápida" (guardrail em
 * `AGENTS.md`). Pausas (`pitchMidi === null`) não contribuem.
 */
export function pitchClassHistogram(notes: QuantizedNote[]): number[] {
  const histogram = new Array<number>(12).fill(0)

  for (const note of notes) {
    if (note.pitchMidi === null) continue
    const pitchClass = ((note.pitchMidi % 12) + 12) % 12
    histogram[pitchClass] = (histogram[pitchClass] ?? 0) + note.durationTicks
  }

  return histogram
}
