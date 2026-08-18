import { describe, expect, it } from 'vitest'
import type { NoteEvent } from '@/lib/types'
import { sortByOnset } from './sortByOnset'

function note(startSec: number): NoteEvent {
  return { pitchMidi: 60, startSec, durationSec: 0.2, amplitude: 0.5 }
}

describe('sortByOnset', () => {
  it('ordena por início ascendente', () => {
    const result = sortByOnset([note(0.5), note(0.1), note(0.3)])
    expect(result.map((n) => n.startSec)).toEqual([0.1, 0.3, 0.5])
  })

  it('não muta o array recebido', () => {
    const notes = [note(0.5), note(0.1)]
    const snapshot = [...notes]
    sortByOnset(notes)
    expect(notes).toEqual(snapshot)
  })

  it('devolve vazio para entrada vazia', () => {
    expect(sortByOnset([])).toEqual([])
  })
})
