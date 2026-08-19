import type { NoteEvent } from '@/lib/types'
import { sortByOnset } from './sortByOnset'

function pickHighest(cluster: NoteEvent[]): NoteEvent {
  return cluster.reduce((best, note) => (note.pitchMidi > best.pitchMidi ? note : best))
}

/**
 * Reduz notas simultâneas a uma única voz — Tarefa 8, decisões 1 e 2. Notas
 * que se sobrepõem no tempo formam um grupo (a sobreposição é transitiva:
 * A-B e B-C sobrepostas juntam A, B e C no mesmo grupo, mesmo que A e C não
 * se toquem); de cada grupo mantém-se só a nota de `pitchMidi` mais alto — as
 * restantes são DESCARTADAS por inteiro, nunca cortadas ou ajustadas
 * (decisão 9: nada de "corrigir" a melodia).
 *
 * Corre sempre DEPOIS de `removeHarmonics` (decisão 8) — ver a nota nesse
 * ficheiro.
 */
export function reduceToMonophonic(notes: NoteEvent[]): NoteEvent[] {
  if (notes.length === 0) return []

  const sorted = sortByOnset(notes)
  const result: NoteEvent[] = []

  const [first, ...rest] = sorted as [NoteEvent, ...NoteEvent[]]
  let cluster: NoteEvent[] = [first]
  let clusterEnd = first.startSec + first.durationSec

  for (const note of rest) {
    if (note.startSec < clusterEnd) {
      cluster.push(note)
      clusterEnd = Math.max(clusterEnd, note.startSec + note.durationSec)
    } else {
      result.push(pickHighest(cluster))
      cluster = [note]
      clusterEnd = note.startSec + note.durationSec
    }
  }
  result.push(pickHighest(cluster))

  return result
}
