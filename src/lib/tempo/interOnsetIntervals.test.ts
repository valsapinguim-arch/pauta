import { describe, expect, it } from 'vitest'
import type { NoteEvent } from '@/lib/types'
import { interOnsetIntervals } from './interOnsetIntervals'

function note(startSec: number): NoteEvent {
  return { pitchMidi: 60, startSec, durationSec: 0.2, amplitude: 0.5 }
}

describe('interOnsetIntervals', () => {
  it('inclui intervalos entre pares não consecutivos, não só vizinhos', () => {
    const notes = [note(0), note(0.5), note(1)]
    const result = interOnsetIntervals(notes)
    expect(result).toEqual(expect.arrayContaining([0.5, 0.5, 1]))
    expect(result).toHaveLength(3)
  })

  it('para de considerar pares além do limite máximo', () => {
    const notes = [note(0), note(0.5), note(3)]
    const result = interOnsetIntervals(notes)
    // 0→0.5 e 0.5→3 (2.5s) excedem ou não conforme o limite; 0→3 (3s) excede sempre
    expect(result).not.toContain(3)
  })

  it('devolve vazio para entrada vazia ou de um só elemento', () => {
    expect(interOnsetIntervals([])).toEqual([])
    expect(interOnsetIntervals([note(0)])).toEqual([])
  })
})
