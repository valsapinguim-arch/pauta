import { describe, expect, it } from 'vitest'
import { largestNoteDurationAtMost, nearestNoteDuration } from './noteDurations'

describe('nearestNoteDuration', () => {
  it('encontra a figura exata', () => {
    expect(nearestNoteDuration(480)).toMatchObject({ noteType: 'quarter', dots: 0 })
  })

  it('1.5 tempos dá semínima com ponto', () => {
    expect(nearestNoteDuration(720)).toMatchObject({ noteType: 'quarter', dots: 1 })
  })

  it('uma duração muito curta (10ms convertidos) promove-se à menor figura', () => {
    expect(nearestNoteDuration(5)).toMatchObject({ noteType: 'sixteenth', dots: 0 })
    expect(nearestNoteDuration(0)).toMatchObject({ noteType: 'sixteenth', dots: 0 })
  })

  it('uma duração muito longa aproxima-se da maior figura', () => {
    expect(nearestNoteDuration(100_000)).toMatchObject({ noteType: 'whole', dots: 1 })
  })
})

describe('largestNoteDurationAtMost', () => {
  it('devolve a maior figura que cabe no limite', () => {
    expect(largestNoteDurationAtMost(500)).toMatchObject({ noteType: 'quarter', dots: 0 })
  })

  it('devolve a figura exata quando o limite coincide com uma figura', () => {
    expect(largestNoteDurationAtMost(960)).toMatchObject({ noteType: 'half', dots: 0 })
  })

  it('nunca devolve nada maior do que o limite quando o limite chega à menor figura', () => {
    expect(largestNoteDurationAtMost(120).ticks).toBeLessThanOrEqual(120)
    expect(largestNoteDurationAtMost(200).ticks).toBeLessThanOrEqual(200)
  })

  it('abaixo da menor figura devolve a menor figura na mesma (decisão 5)', () => {
    expect(largestNoteDurationAtMost(10)).toMatchObject({ noteType: 'sixteenth', dots: 0 })
    expect(largestNoteDurationAtMost(0)).toMatchObject({ noteType: 'sixteenth', dots: 0 })
  })
})
