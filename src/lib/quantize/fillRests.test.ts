import { describe, expect, it } from 'vitest'
import { fillRests } from './fillRests'
import type { WorkingNote } from './workingNote'

const MEASURE_TICKS = 1920

function note(startTick: number, durationTicks: number): WorkingNote {
  return {
    pitchMidi: 60,
    startTick,
    durationTicks,
    noteType: 'quarter',
    dots: 0,
    isRest: false,
    tiedToNext: false,
    tiedFromPrevious: false,
    sourceIndex: 0,
  }
}

describe('fillRests', () => {
  it('não insere nada quando as notas já são contíguas desde o início', () => {
    const notes = [note(0, 480), note(480, 480)]
    const result = fillRests(notes, MEASURE_TICKS)
    expect(result).toEqual(notes)
  })

  it('insere uma pausa antes da primeira nota, se não começar em 0', () => {
    const notes = [note(480, 480)]
    const result = fillRests(notes, MEASURE_TICKS)
    expect(result[0]).toMatchObject({ isRest: true, startTick: 0, durationTicks: 480 })
    expect(result[1]).toEqual(notes[0])
  })

  it('insere uma pausa num espaço entre duas notas', () => {
    const notes = [note(0, 480), note(960, 480)]
    const result = fillRests(notes, MEASURE_TICKS)
    expect(result).toHaveLength(3)
    expect(result[1]).toMatchObject({ isRest: true, startTick: 480, durationTicks: 480 })
  })

  it('lista vazia devolve vazio', () => {
    expect(fillRests([], MEASURE_TICKS)).toEqual([])
  })
})
