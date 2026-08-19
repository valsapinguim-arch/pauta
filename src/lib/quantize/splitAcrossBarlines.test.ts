import { describe, expect, it } from 'vitest'
import { splitAcrossBarlines } from './splitAcrossBarlines'
import type { WorkingNote } from './workingNote'

const MEASURE_TICKS = 1920 // 4/4, semínima = 480

function note(startTick: number, durationTicks: number): WorkingNote {
  return {
    pitchMidi: 67,
    startTick,
    durationTicks,
    noteType: 'half',
    dots: 0,
    isRest: false,
    tiedToNext: false,
    tiedFromPrevious: false,
    sourceIndex: 3,
  }
}

describe('splitAcrossBarlines', () => {
  it('não divide uma nota que cabe dentro de um só compasso', () => {
    const notes = [note(0, 960)]
    expect(splitAcrossBarlines(notes, MEASURE_TICKS)).toEqual(notes)
  })

  it('nota a começar no tempo 4 com duração de 2 tempos divide-se e liga-se sobre a barra', () => {
    const notes = [note(1440, 960)]
    const result = splitAcrossBarlines(notes, MEASURE_TICKS)

    expect(result).toHaveLength(2)
    expect(result[0]).toMatchObject({
      startTick: 1440,
      durationTicks: 480,
      tiedFromPrevious: false,
      tiedToNext: true,
    })
    expect(result[1]).toMatchObject({
      startTick: 1920,
      durationTicks: 480,
      tiedFromPrevious: true,
      tiedToNext: false,
    })
  })

  it('as partes ligadas mantêm o pitch e o sourceIndex da nota original', () => {
    const notes = [note(1440, 960)]
    const result = splitAcrossBarlines(notes, MEASURE_TICKS)
    expect(result[0]?.pitchMidi).toBe(67)
    expect(result[1]?.pitchMidi).toBe(67)
    expect(result[0]?.sourceIndex).toBe(3)
    expect(result[1]?.sourceIndex).toBe(3)
  })

  it('a soma das partes é sempre igual à duração original', () => {
    const notes = [note(1440, 960)]
    const result = splitAcrossBarlines(notes, MEASURE_TICKS)
    const total = result.reduce((sum, n) => sum + n.durationTicks, 0)
    expect(total).toBe(960)
  })

  it('uma nota que atravessa duas barras produz três partes ligadas em cadeia', () => {
    const notes = [note(1440, MEASURE_TICKS * 2)] // atravessa 2 barras
    const result = splitAcrossBarlines(notes, MEASURE_TICKS)
    expect(result).toHaveLength(3)
    expect(result.map((n) => n.durationTicks).reduce((a, b) => a + b, 0)).toBe(MEASURE_TICKS * 2)
    expect(result[0]).toMatchObject({ tiedFromPrevious: false, tiedToNext: true })
    expect(result[1]).toMatchObject({ tiedFromPrevious: true, tiedToNext: true })
    expect(result[2]).toMatchObject({ tiedFromPrevious: true, tiedToNext: false })
  })

  it('nunca mexe em pausas', () => {
    const rest: WorkingNote = {
      ...note(1440, 960),
      isRest: true,
      pitchMidi: null,
      sourceIndex: null,
    }
    expect(splitAcrossBarlines([rest], MEASURE_TICKS)).toEqual([rest])
  })
})
