import { describe, expect, it } from 'vitest'
import type { NoteEvent } from '@/lib/types'
import { reduceToMonophonic } from './reduceToMonophonic'

function note(pitchMidi: number, startSec: number, durationSec = 0.3): NoteEvent {
  return { pitchMidi, startSec, durationSec, amplitude: 0.5 }
}

describe('reduceToMonophonic', () => {
  it('reduz um acorde de três notas à mais aguda', () => {
    const chord = [note(60, 0), note(64, 0), note(67, 0)]
    expect(reduceToMonophonic(chord)).toEqual([note(67, 0)])
  })

  it('mantém notas que não se sobrepõem', () => {
    const melody = [note(60, 0, 0.2), note(62, 0.2, 0.2), note(64, 0.4, 0.2)]
    expect(reduceToMonophonic(melody)).toEqual(melody)
  })

  it('junta um grupo transitivo (A-B e B-C sobrepostas, A-C não)', () => {
    // A: 0-0.5, B: 0.4-0.9, C: 0.8-1.2 — A e C não se tocam diretamente,
    // mas A-B e B-C sobrepõem-se, por isso as três formam um só grupo.
    const a = note(60, 0, 0.5)
    const b = note(72, 0.4, 0.5) // a mais aguda do grupo
    const c = note(65, 0.8, 0.4)
    expect(reduceToMonophonic([a, b, c])).toEqual([b])
  })

  it('não precisa de entrada já ordenada', () => {
    const chord = [note(64, 0), note(67, 0), note(60, 0)]
    expect(reduceToMonophonic(chord)).toEqual([note(67, 0)])
  })

  it('devolve vazio para entrada vazia', () => {
    expect(reduceToMonophonic([])).toEqual([])
  })
})
