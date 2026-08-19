import { describe, expect, it } from 'vitest'
import type { TempoMap } from '@/lib/types'
import { secondsToTicks, ticksToSeconds } from './ticks'

const tempoMap: TempoMap = {
  bpm: 120,
  timeSignature: { numerator: 4, denominator: 4 },
  firstBeatSec: 0,
  confidence: 0.9,
  source: 'detected',
}

describe('secondsToTicks', () => {
  it('converte um segundo a 120 BPM em 960 ticks (duas semínimas)', () => {
    expect(secondsToTicks(1, tempoMap)).toBe(960)
  })

  it('desconta firstBeatSec — o tick 0 é o primeiro tempo forte', () => {
    const shifted: TempoMap = { ...tempoMap, firstBeatSec: 2 }
    expect(secondsToTicks(2, shifted)).toBe(0)
    expect(secondsToTicks(3, shifted)).toBe(960)
  })

  it('arredonda a um tick inteiro', () => {
    expect(Number.isInteger(secondsToTicks(0.333, tempoMap))).toBe(true)
  })
})

describe('ticksToSeconds', () => {
  it('é a inversa de secondsToTicks', () => {
    expect(ticksToSeconds(960, tempoMap)).toBeCloseTo(1, 5)
  })

  it('respeita firstBeatSec como origem', () => {
    const shifted: TempoMap = { ...tempoMap, firstBeatSec: 2 }
    expect(ticksToSeconds(0, shifted)).toBeCloseTo(2, 5)
  })
})
