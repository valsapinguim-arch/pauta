import { describe, expect, it } from 'vitest'
import { lowPassFilter } from './lowPassFilter'
import { resample } from './resample'

const FROM_RATE = 48_000
const TO_RATE = 22_050

function sineWave(freqHz: number, durationSec: number, sampleRate: number): Float32Array {
  const length = Math.round(durationSec * sampleRate)
  const wave = new Float32Array(length)
  for (let i = 0; i < length; i += 1) {
    wave[i] = Math.sin((2 * Math.PI * freqHz * i) / sampleRate)
  }
  return wave
}

/** Ver a mesma função em `lowPassFilter.test.ts` — duplicada de propósito
 *  (só para teste, sem ligação nenhuma entre os dois ficheiros de teste). */
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

describe('resample', () => {
  it('devolve o mesmo array quando as taxas coincidem', () => {
    const wave = sineWave(440, 0.05, FROM_RATE)
    expect(resample(wave, FROM_RATE, FROM_RATE)).toBe(wave)
  })

  it('produz o comprimento esperado pela razão de taxas', () => {
    const wave = sineWave(440, 1, FROM_RATE)
    const resampled = resample(wave, FROM_RATE, TO_RATE)
    const expectedLength = Math.round(wave.length * (TO_RATE / FROM_RATE))
    expect(resampled.length).toBe(expectedLength)
  })

  it('mantém a frequência de um sinal sintético conhecido', () => {
    const freqHz = 1000
    const wave = sineWave(freqHz, 0.2, FROM_RATE)
    const resampled = resample(wave, FROM_RATE, TO_RATE)

    const atOriginalFreq = magnitudeAt(resampled, TO_RATE, freqHz)
    const atUnrelatedFreq = magnitudeAt(resampled, TO_RATE, 4000)

    // O sinal continua a ter a maior parte da sua energia na frequência
    // original — não migrou para outra frequência qualquer.
    expect(atOriginalFreq).toBeGreaterThan(0.3)
    expect(atUnrelatedFreq).toBeLessThan(atOriginalFreq * 0.1)
  })

  it('sem filtro prévio, uma frequência acima da nova Nyquist produz um componente falso (aliasing)', () => {
    // 15000 Hz está acima da Nyquist da taxa de destino (22050/2 = 11025 Hz).
    // Sem filtrar antes, essa energia dobra para dentro da banda como
    // |22050 - 15000| = 7050 Hz — uma nota que nunca existiu no áudio
    // original. Este teste prova a AUSÊNCIA de proteção quando se pula o
    // filtro, para o próximo teste provar a sua PRESENÇA quando ele corre.
    const wave = sineWave(15_000, 0.2, FROM_RATE)
    const resampledWithoutFilter = resample(wave, FROM_RATE, TO_RATE)
    const aliasMagnitude = magnitudeAt(resampledWithoutFilter, TO_RATE, 7050)

    expect(aliasMagnitude).toBeGreaterThan(0.1)
  })

  it('com o filtro passa-baixo antes, o componente acima de Nyquist não gera falso alias', () => {
    const wave = sineWave(15_000, 0.2, FROM_RATE)
    const filtered = lowPassFilter(wave, FROM_RATE, 10_500)
    const resampled = resample(filtered, FROM_RATE, TO_RATE)
    const aliasMagnitude = magnitudeAt(resampled, TO_RATE, 7050)

    expect(aliasMagnitude).toBeLessThan(0.02)
  })
})
