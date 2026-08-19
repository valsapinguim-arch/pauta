import { describe, expect, it } from 'vitest'
import { padFinalMeasure } from './padFinalMeasure'
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

describe('padFinalMeasure', () => {
  it('completa um último compasso incompleto com pausas', () => {
    const notes = [note(0, 480)] // só o primeiro tempo do compasso preenchido
    const result = padFinalMeasure(notes, MEASURE_TICKS)
    const total = result.reduce((sum, n) => sum + n.durationTicks, 0)
    expect(total).toBe(MEASURE_TICKS)
    expect(result[result.length - 1]?.isRest).toBe(true)
  })

  it('não adiciona nada quando o compasso já está completo', () => {
    const notes = [note(0, MEASURE_TICKS)]
    expect(padFinalMeasure(notes, MEASURE_TICKS)).toEqual(notes)
  })

  it('completa apenas o compasso final quando há vários compassos', () => {
    const notes = [note(0, MEASURE_TICKS), note(MEASURE_TICKS, 480)]
    const result = padFinalMeasure(notes, MEASURE_TICKS)
    const total = result.reduce((sum, n) => sum + n.durationTicks, 0)
    expect(total).toBe(MEASURE_TICKS * 2)
  })

  it('lista vazia devolve vazio', () => {
    expect(padFinalMeasure([], MEASURE_TICKS)).toEqual([])
  })
})
