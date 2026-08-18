import { describe, expect, it } from 'vitest'
import { keySignatureFor } from './keySignatureFor'

describe('keySignatureFor', () => {
  it('dó maior não tem armação', () => {
    expect(keySignatureFor(0, 'major')).toBe(0)
  })

  it('sol maior tem um sustenido', () => {
    expect(keySignatureFor(7, 'major')).toBe(1)
  })

  it('ré bemol maior tem cinco bemóis', () => {
    expect(keySignatureFor(1, 'major')).toBe(-5)
  })

  it('lá menor partilha a armação de dó maior (relativas)', () => {
    expect(keySignatureFor(9, 'minor')).toBe(keySignatureFor(0, 'major'))
  })

  it('mi menor partilha a armação de sol maior (relativas)', () => {
    expect(keySignatureFor(4, 'minor')).toBe(keySignatureFor(7, 'major'))
  })

  it('nunca excede a gama de -7 a 7', () => {
    for (let tonic = 0; tonic < 12; tonic++) {
      expect(Math.abs(keySignatureFor(tonic, 'major'))).toBeLessThanOrEqual(7)
      expect(Math.abs(keySignatureFor(tonic, 'minor'))).toBeLessThanOrEqual(7)
    }
  })
})
