import { describe, expect, it } from 'vitest'
import { formatElapsed } from './formatElapsed'

describe('formatElapsed', () => {
  it.each([
    [0, '00:00'],
    [999, '00:00'],
    [1000, '00:01'],
    [12000, '00:12'],
    [60000, '01:00'],
    [125000, '02:05'],
    [-500, '00:00'],
  ])('%i ms → %s', (input, want) => {
    expect(formatElapsed(input)).toBe(want)
  })
})
