import { describe, expect, it } from 'vitest'
import { pearsonCorrelation } from './pearsonCorrelation'

describe('pearsonCorrelation', () => {
  it('devolve 1 para vetores idênticos', () => {
    expect(pearsonCorrelation([1, 2, 3, 4], [1, 2, 3, 4])).toBeCloseTo(1, 10)
  })

  it('devolve -1 para vetores perfeitamente inversos', () => {
    expect(pearsonCorrelation([1, 2, 3, 4], [4, 3, 2, 1])).toBeCloseTo(-1, 10)
  })

  it('devolve 0 quando um vetor não tem variância', () => {
    expect(pearsonCorrelation([5, 5, 5, 5], [1, 2, 3, 4])).toBe(0)
  })

  it('é simétrico', () => {
    const a = [1, 3, 2, 5, 4]
    const b = [2, 1, 4, 3, 5]
    expect(pearsonCorrelation(a, b)).toBeCloseTo(pearsonCorrelation(b, a), 10)
  })
})
