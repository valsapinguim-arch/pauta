import { describe, expect, it } from 'vitest'
import type { QuantizedNote } from '@/lib/types'
import { pitchClassHistogram } from './pitchClassHistogram'

function note(pitchMidi: number | null, durationTicks: number, isRest = false): QuantizedNote {
  return {
    pitchMidi,
    startTick: 0,
    durationTicks,
    noteType: 'quarter',
    dots: 0,
    isRest,
    tiedToNext: false,
    tiedFromPrevious: false,
    sourceIndex: isRest ? null : 0,
    measureIndex: 0,
  }
}

describe('pitchClassHistogram', () => {
  it('acumula duração na classe de altura certa', () => {
    const notes = [note(60, 480), note(72, 240)] // C4 e C5 -> ambos classe 0
    const histogram = pitchClassHistogram(notes)
    expect(histogram[0]).toBe(720)
    expect(histogram.filter((v) => v > 0)).toHaveLength(1)
  })

  it('ignora pausas', () => {
    const notes = [note(60, 480), note(null, 480, true)]
    const histogram = pitchClassHistogram(notes)
    expect(histogram.reduce((sum, v) => sum + v, 0)).toBe(480)
  })

  it('pesa por duração, não por contagem', () => {
    // três notas curtas na classe 2, uma nota longa na classe 7
    const notes = [note(62, 60), note(62, 60), note(62, 60), note(67, 900)]
    const histogram = pitchClassHistogram(notes)
    expect(histogram[7] as number).toBeGreaterThan(histogram[2] as number)
  })

  it('devolve tudo a zero para entrada vazia', () => {
    expect(pitchClassHistogram([])).toEqual(new Array(12).fill(0))
  })
})
