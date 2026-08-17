import { describe, expect, it } from 'vitest'
import { assertModelInput, MODEL_SAMPLE_RATE } from './assertModelInput'

function samples(length: number, fill = 0.1): Float32Array {
  return new Float32Array(length).fill(fill)
}

describe('assertModelInput', () => {
  it('aceita uma entrada válida sem lançar', () => {
    expect(() => assertModelInput(samples(MODEL_SAMPLE_RATE), MODEL_SAMPLE_RATE)).not.toThrow()
  })

  it('rejeita uma taxa de amostragem diferente de 22050 Hz', () => {
    expect(() => assertModelInput(samples(MODEL_SAMPLE_RATE), 44_100)).toThrow(/22050/)
  })

  it('rejeita áudio demasiado curto', () => {
    expect(() => assertModelInput(samples(10), MODEL_SAMPLE_RATE)).toThrow(/curto/)
  })

  it('rejeita NaN nas amostras', () => {
    const invalid = samples(MODEL_SAMPLE_RATE)
    invalid[100] = Number.NaN
    expect(() => assertModelInput(invalid, MODEL_SAMPLE_RATE)).toThrow(/NaN/)
  })

  it('rejeita Infinity nas amostras', () => {
    const invalid = samples(MODEL_SAMPLE_RATE)
    invalid[100] = Number.POSITIVE_INFINITY
    expect(() => assertModelInput(invalid, MODEL_SAMPLE_RATE)).toThrow(/NaN/)
  })

  it('rejeita pico acima de 1.0', () => {
    const invalid = samples(MODEL_SAMPLE_RATE, 1.5)
    expect(() => assertModelInput(invalid, MODEL_SAMPLE_RATE)).toThrow(/pico/)
  })

  it('aceita pico exatamente em 1.0', () => {
    expect(() => assertModelInput(samples(MODEL_SAMPLE_RATE, 1), MODEL_SAMPLE_RATE)).not.toThrow()
  })
})
