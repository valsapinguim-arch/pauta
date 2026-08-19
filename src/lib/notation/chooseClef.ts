import type { Clef, QuantizedNote } from '@/lib/types'

/** Dó central — o ponto de viragem entre clave de sol e clave de fá. */
const MIDDLE_C = 60

/**
 * Escolhe a clave pela tessitura — Tarefa 12, decisão 3. Média das alturas
 * (pausas não contam); abaixo de dó central vai a clave de fá, senão a de
 * sol. Sem notas, clave de sol por omissão — é a mais comum e não há
 * tessitura nenhuma para decidir ao contrário.
 */
export function chooseClef(notes: QuantizedNote[]): Clef {
  const pitches = notes
    .filter((note): note is QuantizedNote & { pitchMidi: number } => note.pitchMidi !== null)
    .map((note) => note.pitchMidi)

  if (pitches.length === 0) return 'treble'

  const average = pitches.reduce((sum, pitch) => sum + pitch, 0) / pitches.length
  return average < MIDDLE_C ? 'bass' : 'treble'
}
