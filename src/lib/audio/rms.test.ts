import { describe, expect, it } from 'vitest'
import { calculateRms } from './rms'

describe('calculateRms', () => {
  it('silêncio dá zero', () => {
    expect(calculateRms(new Float32Array([0, 0, 0, 0]))).toBe(0)
  })

  it('onda constante dá o próprio valor absoluto', () => {
    expect(calculateRms(new Float32Array([0.5, 0.5, 0.5]))).toBeCloseTo(0.5)
  })

  it('valores negativos contam com o mesmo peso que positivos', () => {
    expect(calculateRms(new Float32Array([0.5, -0.5, 0.5, -0.5]))).toBeCloseTo(0.5)
  })

  it('onda quadrada de amplitude 1 dá RMS 1', () => {
    expect(calculateRms(new Float32Array([1, -1, 1, -1]))).toBeCloseTo(1)
  })

  it('array vazio dá zero, sem lançar', () => {
    expect(calculateRms(new Float32Array([]))).toBe(0)
  })
})
