import type { KeyAnalysis, Step } from '@/lib/types'
import { FLAT_SPELLING, SHARP_SPELLING } from './pitchSpelling'

export interface SpelledPitch {
  step: Step
  alter: -1 | 0 | 1
  octave: number
}

/**
 * Decide como escrever uma altura MIDI — Âmbito técnico da Tarefa 11.
 * Sustenidos em tonalidades de sustenidos, bemóis em tonalidades de bemóis
 * (decisão 3); `sharpsOrFlats === 0` (dó maior/lá menor) usa sustenidos por
 * convenção neutra. Convenção científica: dó central (MIDI 60) é C4.
 */
export function spellPitch(pitchMidi: number, keyAnalysis: KeyAnalysis): SpelledPitch {
  const pitchClass = ((pitchMidi % 12) + 12) % 12
  const octave = Math.floor(pitchMidi / 12) - 1
  const table = keyAnalysis.sharpsOrFlats < 0 ? FLAT_SPELLING : SHARP_SPELLING
  const { step, alter } = table[pitchClass] as { step: Step; alter: -1 | 0 | 1 }

  return { step, alter, octave }
}
