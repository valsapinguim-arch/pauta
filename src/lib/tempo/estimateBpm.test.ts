import { describe, expect, it } from 'vitest'
import { estimateBpm } from './estimateBpm'

describe('estimateBpm', () => {
  it('encontra o candidato dominante num histograma concentrado', () => {
    // período de 0.5 s repetido — 120 BPM
    const intervals = [0.5, 0.5, 0.5, 0.5, 1, 1.5]
    const result = estimateBpm(intervals)
    expect(result.bpm).toBeCloseTo(120, 0)
    expect(result.concentration).toBeGreaterThan(0.5)
  })

  it('devolve concentração baixa quando os intervalos estão espalhados', () => {
    const intervals = [0.31, 0.52, 0.77, 0.98, 1.21, 1.44]
    const result = estimateBpm(intervals)
    expect(result.concentration).toBeLessThan(0.34)
  })

  it('devolve bpm 0 para entrada vazia', () => {
    expect(estimateBpm([])).toEqual({ bpm: 0, concentration: 0 })
  })

  it('ignora intervalos não positivos', () => {
    expect(estimateBpm([0, -0.1])).toEqual({ bpm: 0, concentration: 0 })
  })
})
