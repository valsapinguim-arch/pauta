import type { NoteEvent } from '@/lib/types'
import { NOTE_CLEANUP } from './constants'

/**
 * Remove notas que são provavelmente harmónicos de outra mais grave —
 * Tarefa 8, decisão 3. Uma nota é candidata a harmónico se: começar
 * aproximadamente ao mesmo tempo que outra mais grave, estiver a um
 * intervalo de oitava ou de duodécima acima, e tiver amplitude
 * sensivelmente menor.
 *
 * Corre sempre ANTES de `reduceToMonophonic` (decisão 8) — pela ordem
 * inversa, a regra "mantém-se a mais aguda" escolheria sistematicamente o
 * harmónico em vez da fundamental, e a pauta sairia uma oitava acima em
 * passagens inteiras.
 */
export function removeHarmonics(notes: NoteEvent[]): NoteEvent[] {
  const onsetToleranceSec = NOTE_CLEANUP.HARMONIC_ONSET_TOLERANCE_MS / 1000
  const toRemove = new Set<number>()

  for (let i = 0; i < notes.length; i += 1) {
    const fundamental = notes[i] as NoteEvent

    for (let j = 0; j < notes.length; j += 1) {
      if (i === j) continue
      const candidate = notes[j] as NoteEvent

      const interval = candidate.pitchMidi - fundamental.pitchMidi
      if (!(NOTE_CLEANUP.HARMONIC_INTERVALS_SEMITONES as readonly number[]).includes(interval)) {
        continue
      }

      const onsetDiffSec = Math.abs(candidate.startSec - fundamental.startSec)
      if (onsetDiffSec > onsetToleranceSec) continue

      if (
        candidate.amplitude >=
        fundamental.amplitude * NOTE_CLEANUP.HARMONIC_MAX_AMPLITUDE_RATIO
      ) {
        continue
      }

      toRemove.add(j)
    }
  }

  return notes.filter((_, index) => !toRemove.has(index))
}
