import { describe, expect, it } from 'vitest'
import { trimSilence } from './trimSilence'

const SAMPLE_RATE = 22_050

function silence(seconds: number): Float32Array {
  return new Float32Array(Math.round(seconds * SAMPLE_RATE))
}

function loudTone(seconds: number): Float32Array {
  const length = Math.round(seconds * SAMPLE_RATE)
  const wave = new Float32Array(length)
  for (let i = 0; i < length; i += 1) {
    wave[i] = Math.sin((2 * Math.PI * 440 * i) / SAMPLE_RATE) * 0.8
  }
  return wave
}

function concat(...parts: Float32Array[]): Float32Array {
  const total = parts.reduce((sum, part) => sum + part.length, 0)
  const merged = new Float32Array(total)
  let offset = 0
  for (const part of parts) {
    merged.set(part, offset)
    offset += part.length
  }
  return merged
}

describe('trimSilence', () => {
  it('corta o silêncio inicial e devolve o deslocamento correto', () => {
    const lead = silence(0.5)
    const tone = loudTone(1)
    const input = concat(lead, tone)

    const { trimOffsetSamples } = trimSilence(input, SAMPLE_RATE)

    // Margem de 50 ms para cada lado — o corte fica perto do início do tom,
    // nunca exatamente em cima dele.
    const marginSamples = Math.round(0.05 * SAMPLE_RATE)
    expect(trimOffsetSamples).toBeGreaterThan(0)
    expect(trimOffsetSamples).toBeLessThanOrEqual(lead.length)
    expect(trimOffsetSamples).toBeGreaterThanOrEqual(lead.length - marginSamples)
  })

  it('corta o silêncio final', () => {
    const tone = loudTone(1)
    const trail = silence(0.5)
    const input = concat(tone, trail)

    const { samples } = trimSilence(input, SAMPLE_RATE)

    // O resultado não deve conter todo o silêncio final original.
    expect(samples.length).toBeLessThan(input.length)
    expect(samples.length).toBeGreaterThanOrEqual(tone.length)
  })

  it('nunca corta silêncio no meio do sinal (pausas musicais)', () => {
    const tone = loudTone(0.5)
    const pause = silence(0.5)
    const input = concat(tone, pause, tone)

    const { samples, trimOffsetSamples } = trimSilence(input, SAMPLE_RATE)

    expect(trimOffsetSamples).toBe(0)
    expect(samples.length).toBe(input.length)
  })

  it('sinal inteiramente em silêncio: nada é cortado', () => {
    const input = silence(1)
    const { samples, trimOffsetSamples } = trimSilence(input, SAMPLE_RATE)

    expect(trimOffsetSamples).toBe(0)
    expect(samples).toBe(input)
  })

  it('array vazio não rebenta', () => {
    const result = trimSilence(new Float32Array(0), SAMPLE_RATE)
    expect(result).toEqual({ samples: new Float32Array(0), trimOffsetSamples: 0 })
  })
})
