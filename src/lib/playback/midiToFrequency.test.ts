import { describe, expect, it } from 'vitest'
import { midiToFrequency } from './midiToFrequency'

describe('midiToFrequency', () => {
  it('MIDI 69 (Lá central) dá 440 Hz', () => {
    expect(midiToFrequency(69)).toBeCloseTo(440, 5)
  })

  it('uma oitava acima duplica a frequência', () => {
    expect(midiToFrequency(81)).toBeCloseTo(880, 5)
  })

  it('uma oitava abaixo divide a frequência por dois', () => {
    expect(midiToFrequency(57)).toBeCloseTo(220, 5)
  })

  it('dó central (MIDI 60) dá aproximadamente 261.63 Hz', () => {
    expect(midiToFrequency(60)).toBeCloseTo(261.6256, 3)
  })
})
