import type { NoteEvent } from '@/lib/types'
import { TEMPO } from './constants'

/**
 * Todos os intervalos entre pares de onsets próximos (decisão 2) — não só
 * consecutivos: uma nota perdida entre duas outras não deve destruir a
 * evidência do andamento, só reduzi-la. `notes` tem de vir ordenada por
 * início (mesma pré-condição de `cleanNotes`, Tarefa 8).
 *
 * Limitado a `TEMPO.MAX_INTERVAL_SEC`: como os onsets estão ordenados, os
 * intervalos só crescem à medida que `j` avança — assim que um excede o
 * limite, nenhum `j` seguinte para o mesmo `i` pode voltar a ficar dentro
 * dele.
 */
export function interOnsetIntervals(notes: NoteEvent[]): number[] {
  const intervals: number[] = []

  for (let i = 0; i < notes.length; i++) {
    for (let j = i + 1; j < notes.length; j++) {
      const interval = (notes[j] as NoteEvent).startSec - (notes[i] as NoteEvent).startSec
      if (interval > TEMPO.MAX_INTERVAL_SEC) break
      intervals.push(interval)
    }
  }

  return intervals
}
