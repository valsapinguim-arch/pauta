import { describe, expect, it } from 'vitest'
import type { QuantizedNote } from '@/lib/types'
import { analyzeKey } from './analyzeKey'

function note(pitchMidi: number, durationTicks = 480): QuantizedNote {
  return {
    pitchMidi,
    startTick: 0,
    durationTicks,
    noteType: 'quarter',
    dots: 0,
    isRest: false,
    tiedToNext: false,
    tiedFromPrevious: false,
    sourceIndex: 0,
    measureIndex: 0,
  }
}

describe('analyzeKey', () => {
  it('três notas dão source "assumed" e dó maior', () => {
    const result = analyzeKey([note(67), note(71), note(74)])
    expect(result).toEqual({
      tonic: 0,
      mode: 'major',
      sharpsOrFlats: 0,
      confidence: 0,
      source: 'assumed',
    })
  })

  it('lista vazia não lança e devolve dó maior assumido', () => {
    expect(analyzeKey([])).toMatchObject({ source: 'assumed', sharpsOrFlats: 0 })
  })

  it('uma melodia diatónica clara em sol maior deteta sol maior detetado', () => {
    // G A B C D E F# G G, várias vezes para passar o limiar mínimo de notas
    const pcs = [67, 69, 71, 72, 74, 76, 78, 79, 79, 74, 71, 67]
    const notes = pcs.map((pitchMidi) => note(pitchMidi))
    const result = analyzeKey(notes)
    expect(result.source).toBe('detected')
    expect(result.tonic).toBe(7)
    expect(result.mode).toBe('major')
    expect(result.sharpsOrFlats).toBe(1)
  })
})
