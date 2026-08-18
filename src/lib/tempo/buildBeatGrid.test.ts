import { describe, expect, it } from 'vitest'
import type { TempoMap } from '@/lib/types'
import { buildBeatGrid } from './buildBeatGrid'

const tempoMap: TempoMap = {
  bpm: 120,
  timeSignature: { numerator: 4, denominator: 4 },
  firstBeatSec: 0,
  confidence: 0.9,
  source: 'detected',
}

describe('buildBeatGrid', () => {
  it('produz um tempo a cada período do BPM', () => {
    const grid = buildBeatGrid(tempoMap, 2)
    // 120 BPM → período de 0.5s → tempos em 0, 0.5, 1, 1.5, 2
    expect(grid.beatsSec).toEqual([0, 0.5, 1, 1.5, 2])
  })

  it('limites de compasso a intervalos exatos de 4 tempos (4/4)', () => {
    const grid = buildBeatGrid(tempoMap, 4)
    // 9 tempos (0..4 em passos de 0.5) → limites nos índices 0, 4, 8
    expect(grid.measureBoundariesSec).toEqual([0, 2, 4])
  })

  it('respeita firstBeatSec diferente de zero', () => {
    const grid = buildBeatGrid({ ...tempoMap, firstBeatSec: 1 }, 2)
    expect(grid.beatsSec[0]).toBe(1)
  })

  it('devolve grelha vazia quando a duração é anterior ao primeiro tempo', () => {
    const grid = buildBeatGrid({ ...tempoMap, firstBeatSec: 5 }, 1)
    expect(grid.beatsSec).toEqual([])
    expect(grid.measureBoundariesSec).toEqual([])
  })

  it('respeita um compasso diferente de 4/4', () => {
    const grid = buildBeatGrid(
      { ...tempoMap, timeSignature: { numerator: 3, denominator: 4 } },
      1.5,
    )
    expect(grid.beatsSec).toEqual([0, 0.5, 1, 1.5])
    expect(grid.measureBoundariesSec).toEqual([0, 1.5])
  })
})
