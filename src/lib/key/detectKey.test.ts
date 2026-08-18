import { describe, expect, it } from 'vitest'
import { detectKey } from './detectKey'

function histogramFrom(entries: Array<[pitchClass: number, weight: number]>): number[] {
  const histogram = new Array(12).fill(0)
  for (const [pc, weight] of entries) histogram[pc] += weight
  return histogram
}

describe('detectKey', () => {
  it('melodia diatónica em sol maior deteta sol maior, com confiança alta', () => {
    // sol maior: G A B C D E F# G G (tónica reforçada), classes 7 9 11 0 2 4 6
    const histogram = histogramFrom([
      [7, 480],
      [9, 480],
      [11, 480],
      [0, 480],
      [2, 480],
      [4, 480],
      [6, 960],
      [7, 960],
    ])
    const result = detectKey(histogram)
    expect(result.tonic).toBe(7)
    expect(result.mode).toBe('major')
    expect(result.confidence).toBeGreaterThan(0.9)
  })

  it('a mesma melodia com fá natural em vez de fá sustenido não deteta sol maior', () => {
    // mesmas notas, mas o fá (que distingue sol maior de dó maior) é natural
    // e tem a duração mais longa — decisão 1, ponderar por duração
    const histogram = histogramFrom([
      [7, 480],
      [9, 480],
      [11, 480],
      [0, 480],
      [2, 480],
      [4, 480],
      [5, 960], // fá natural, não fá#
      [7, 960],
    ])
    const result = detectKey(histogram)
    expect(result.tonic === 7 && result.mode === 'major').toBe(false)
  })

  it('um histograma vazio não lança', () => {
    expect(() => detectKey(new Array(12).fill(0))).not.toThrow()
  })
})
