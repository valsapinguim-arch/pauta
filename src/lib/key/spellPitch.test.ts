import { describe, expect, it } from 'vitest'
import type { KeyAnalysis } from '@/lib/types'
import { spellPitch } from './spellPitch'

function keyAnalysis(sharpsOrFlats: number): KeyAnalysis {
  return { tonic: 0, mode: 'major', sharpsOrFlats, confidence: 1, source: 'detected' }
}

describe('spellPitch', () => {
  it('dó central (MIDI 60) escreve-se C4, em qualquer tonalidade', () => {
    expect(spellPitch(60, keyAnalysis(0))).toEqual({ step: 'C', alter: 0, octave: 4 })
    expect(spellPitch(60, keyAnalysis(-5))).toEqual({ step: 'C', alter: 0, octave: 4 })
  })

  it('em tonalidades de sustenidos, uma nota preta escreve-se com sustenido', () => {
    // MIDI 66 = classe 6 (Fá#/Solb), sol maior tem 1 sustenido
    expect(spellPitch(66, keyAnalysis(1))).toEqual({ step: 'F', alter: 1, octave: 4 })
  })

  it('em ré bemol maior, a nota correspondente escreve-se como bemol, não sustenido', () => {
    // MIDI 63 = classe 3 (Ré#/Mib), réb maior tem 5 bemóis
    const result = spellPitch(63, keyAnalysis(-5))
    expect(result).toEqual({ step: 'E', alter: -1, octave: 4 })
    expect(result.step).not.toBe('D')
  })

  it('respeita a oitava científica nas fronteiras', () => {
    expect(spellPitch(59, keyAnalysis(0))).toMatchObject({ step: 'B', octave: 3 })
    expect(spellPitch(72, keyAnalysis(0))).toMatchObject({ step: 'C', octave: 5 })
  })
})
