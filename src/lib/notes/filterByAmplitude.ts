import type { NoteEvent } from '@/lib/types'
import { median } from './statistics'

/**
 * Descarta notas abaixo de uma fração da amplitude MEDIANA das notas
 * detetadas — Tarefa 8, decisão 5. Relativo (nunca um limiar absoluto):
 * um limiar absoluto trata mal os dois extremos, eliminando a música toda
 * numa gravação fraca ou nada numa forte. Mediana, não média, porque uma
 * nota muito forte isolada não deve puxar o limiar para cima.
 */
export function filterByAmplitude(notes: NoteEvent[], relativeThreshold: number): NoteEvent[] {
  if (notes.length === 0) return []

  const medianAmplitude = median(notes.map((note) => note.amplitude))
  const cutoff = medianAmplitude * relativeThreshold

  return notes.filter((note) => note.amplitude >= cutoff)
}
