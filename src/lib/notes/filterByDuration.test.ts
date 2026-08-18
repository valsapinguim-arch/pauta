import { describe, expect, it } from 'vitest'
import type { NoteEvent } from '@/lib/types'
import { filterByDuration } from './filterByDuration'

function note(durationSec: number): NoteEvent {
  return { pitchMidi: 60, startSec: 0, durationSec, amplitude: 0.5 }
}

describe('filterByDuration', () => {
  it('descarta um transiente de 20 ms com um mínimo de 60 ms', () => {
    expect(filterByDuration([note(0.02)], 60)).toEqual([])
  })

  it('mantém uma nota igual ao mínimo', () => {
    const notes = [note(0.06)]
    expect(filterByDuration(notes, 60)).toEqual(notes)
  })

  it('mantém notas mais longas do que o mínimo', () => {
    const notes = [note(0.5)]
    expect(filterByDuration(notes, 60)).toEqual(notes)
  })

  it('devolve vazio para entrada vazia', () => {
    expect(filterByDuration([], 60)).toEqual([])
  })
})
