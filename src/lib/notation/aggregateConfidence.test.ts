import { describe, expect, it } from 'vitest'
import { aggregateConfidence } from './aggregateConfidence'

describe('aggregateConfidence', () => {
  it('mantém as três confianças detalhadas', () => {
    const result = aggregateConfidence(0.8, 0.6, 1)
    expect(result.notes).toBe(0.8)
    expect(result.tempo).toBe(0.6)
    expect(result.key).toBe(1)
  })

  it('o agregado é a média simples', () => {
    expect(aggregateConfidence(1, 0.5, 0)).toMatchObject({ overall: 0.5 })
    expect(aggregateConfidence(0, 0, 0)).toMatchObject({ overall: 0 })
    expect(aggregateConfidence(1, 1, 1)).toMatchObject({ overall: 1 })
  })
})
