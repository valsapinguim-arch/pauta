import { describe, expect, it } from 'vitest'
import type { QuantizedNote } from '@/lib/types'
import { groupIntoMeasures } from './groupIntoMeasures'

function note(measureIndex: number, startTick: number): QuantizedNote {
  return {
    pitchMidi: 60,
    startTick,
    durationTicks: 480,
    noteType: 'quarter',
    dots: 0,
    isRest: false,
    tiedToNext: false,
    tiedFromPrevious: false,
    sourceIndex: 0,
    measureIndex,
  }
}

describe('groupIntoMeasures', () => {
  it('agrupa notas pelo measureIndex, preservando a ordem', () => {
    const notes = [note(0, 0), note(0, 480), note(1, 1920), note(1, 2400)]
    const measures = groupIntoMeasures(notes)
    expect(measures).toHaveLength(2)
    expect(measures[0]).toEqual([notes[0], notes[1]])
    expect(measures[1]).toEqual([notes[2], notes[3]])
  })

  it('produz um subarray vazio para um compasso sem notas próprias reportadas', () => {
    // measureIndex 0 e 2 têm notas, 1 não aparece em nenhuma nota
    const notes = [note(0, 0), note(2, 3840)]
    const measures = groupIntoMeasures(notes)
    expect(measures).toHaveLength(3)
    expect(measures[1]).toEqual([])
  })

  it('devolve vazio para entrada vazia', () => {
    expect(groupIntoMeasures([])).toEqual([])
  })

  it('não muta a entrada', () => {
    const notes = [note(0, 0)]
    const snapshot = structuredClone(notes)
    groupIntoMeasures(notes)
    expect(notes).toEqual(snapshot)
  })
})
