import { describe, expect, it } from 'vitest'
import type { QuantizedNote } from '@/lib/types'
import { chooseClef } from './chooseClef'

function note(pitchMidi: number | null): QuantizedNote {
  return {
    pitchMidi,
    startTick: 0,
    durationTicks: 480,
    noteType: 'quarter',
    dots: 0,
    isRest: pitchMidi === null,
    tiedToNext: false,
    tiedFromPrevious: false,
    sourceIndex: pitchMidi === null ? null : 0,
    measureIndex: 0,
  }
}

describe('chooseClef', () => {
  it('melodia aguda escolhe clave de sol', () => {
    expect(chooseClef([note(72), note(76), note(79)])).toBe('treble') // C5, E5, G5
  })

  it('melodia grave escolhe clave de fá', () => {
    expect(chooseClef([note(43), note(45), note(48)])).toBe('bass') // G2, A2, C3
  })

  it('exatamente em dó central conta como sol', () => {
    expect(chooseClef([note(60)])).toBe('treble')
  })

  it('ignora pausas no cálculo da média', () => {
    expect(chooseClef([note(72), note(null), note(76)])).toBe('treble')
  })

  it('sem notas, clave de sol por omissão', () => {
    expect(chooseClef([])).toBe('treble')
    expect(chooseClef([note(null)])).toBe('treble')
  })
})
