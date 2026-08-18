import { describe, expect, it } from 'vitest'
import { normalizePeak } from './normalizePeak'

describe('normalizePeak', () => {
  it('leva o pico exatamente ao alvo em dBFS', () => {
    const samples = new Float32Array([0.1, -0.2, 0.05])
    const targetDbfs = -1
    const targetLinear = 10 ** (targetDbfs / 20)

    const result = normalizePeak(samples, targetDbfs)
    const peak = Math.max(...Array.from(result, Math.abs))

    expect(peak).toBeCloseTo(targetLinear, 5)
  })

  it('preserva as relações de amplitude entre amostras', () => {
    const samples = new Float32Array([0.1, 0.2, 0.4])
    const result = normalizePeak(samples, -1)

    expect((result[1] as number) / (result[0] as number)).toBeCloseTo(2, 5)
    expect((result[2] as number) / (result[0] as number)).toBeCloseTo(4, 5)
  })

  it('preserva o sinal de cada amostra', () => {
    const samples = new Float32Array([0.5, -0.5])
    const result = normalizePeak(samples, -1)

    expect(result[0]).toBeGreaterThan(0)
    expect(result[1]).toBeLessThan(0)
  })

  it('devolve silêncio inalterado, sem dividir por zero', () => {
    const samples = new Float32Array([0, 0, 0])
    const result = normalizePeak(samples, -1)
    expect(result).toBe(samples)
  })
})
