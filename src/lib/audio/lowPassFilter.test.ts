import { describe, expect, it } from 'vitest'
import { lowPassFilter } from './lowPassFilter'

const SAMPLE_RATE = 48_000
const CUTOFF_HZ = 10_500

function sineWave(freqHz: number, durationSec: number, sampleRate: number): Float32Array {
  const length = Math.round(durationSec * sampleRate)
  const wave = new Float32Array(length)
  for (let i = 0; i < length; i += 1) {
    wave[i] = Math.sin((2 * Math.PI * freqHz * i) / sampleRate)
  }
  return wave
}

/** Magnitude do sinal numa única frequência — um DFT de um só ponto (bin),
 *  bom o suficiente para comparar "muita" vs. "pouca" energia numa
 *  frequência conhecida sem precisar de uma FFT completa. Só para teste. */
function magnitudeAt(signal: Float32Array, sampleRate: number, freqHz: number): number {
  const omega = (2 * Math.PI * freqHz) / sampleRate
  let re = 0
  let im = 0
  for (let n = 0; n < signal.length; n += 1) {
    const sample = signal[n] as number
    re += sample * Math.cos(omega * n)
    im -= sample * Math.sin(omega * n)
  }
  return Math.sqrt(re * re + im * im) / signal.length
}

describe('lowPassFilter', () => {
  it('deixa passar quase sem atenuação uma frequência bem abaixo do cutoff', () => {
    const wave = sineWave(1000, 0.1, SAMPLE_RATE)
    const filtered = lowPassFilter(wave, SAMPLE_RATE, CUTOFF_HZ)

    const before = magnitudeAt(wave, SAMPLE_RATE, 1000)
    const after = magnitudeAt(filtered, SAMPLE_RATE, 1000)

    expect(after).toBeGreaterThan(before * 0.9)
  })

  it('atenua fortemente uma frequência bem acima do cutoff', () => {
    const wave = sineWave(18_000, 0.1, SAMPLE_RATE)
    const filtered = lowPassFilter(wave, SAMPLE_RATE, CUTOFF_HZ)

    const before = magnitudeAt(wave, SAMPLE_RATE, 18_000)
    const after = magnitudeAt(filtered, SAMPLE_RATE, 18_000)

    expect(after).toBeLessThan(before * 0.1)
  })

  it('devolve o mesmo comprimento à entrada', () => {
    const wave = sineWave(440, 0.05, SAMPLE_RATE)
    expect(lowPassFilter(wave, SAMPLE_RATE, CUTOFF_HZ).length).toBe(wave.length)
  })

  it('não rebenta com um array vazio', () => {
    expect(lowPassFilter(new Float32Array(0), SAMPLE_RATE, CUTOFF_HZ)).toEqual(new Float32Array(0))
  })
})
