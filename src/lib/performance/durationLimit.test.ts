import { describe, expect, it } from 'vitest'
import { chooseDurationLimitMs, MAX_DURATION_MS, MIN_DURATION_MS } from './durationLimit'

describe('chooseDurationLimitMs', () => {
  it('devolve o teto quando não há nenhum sinal de capacidade', () => {
    expect(chooseDurationLimitMs({ hardwareConcurrency: null, deviceMemoryGb: null })).toBe(
      MAX_DURATION_MS,
    )
  })

  it('devolve o teto num dispositivo capaz', () => {
    expect(chooseDurationLimitMs({ hardwareConcurrency: 8, deviceMemoryGb: 8 })).toBe(
      MAX_DURATION_MS,
    )
  })

  it('baixa o limite com pouca memória, mesmo com muitos núcleos', () => {
    expect(chooseDurationLimitMs({ hardwareConcurrency: 8, deviceMemoryGb: 2 })).toBe(
      MIN_DURATION_MS,
    )
  })

  it('baixa o limite com poucos núcleos, mesmo com muita memória', () => {
    expect(chooseDurationLimitMs({ hardwareConcurrency: 2, deviceMemoryGb: 8 })).toBe(
      MIN_DURATION_MS,
    )
  })

  it('nunca bloqueia — devolve sempre um valor, nunca null/0', () => {
    const result = chooseDurationLimitMs({ hardwareConcurrency: 1, deviceMemoryGb: 0.5 })
    expect(result).toBeGreaterThan(0)
  })
})
