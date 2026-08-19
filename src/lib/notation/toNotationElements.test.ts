import { describe, expect, it } from 'vitest'
import type { KeyAnalysis, QuantizedNote } from '@/lib/types'
import { toNotationElements } from './toNotationElements'

const cMajor: KeyAnalysis = {
  tonic: 0,
  mode: 'major',
  sharpsOrFlats: 0,
  confidence: 1,
  source: 'detected',
}

function note(overrides: Partial<QuantizedNote> = {}): QuantizedNote {
  return {
    pitchMidi: 60,
    startTick: 0,
    durationTicks: 480,
    noteType: 'quarter',
    dots: 0,
    isRest: false,
    tiedToNext: false,
    tiedFromPrevious: false,
    sourceIndex: 0,
    measureIndex: 0,
    ...overrides,
  }
}

describe('toNotationElements', () => {
  it('converte uma nota simples', () => {
    const result = toNotationElements([note()], cMajor)
    expect(result[0]).toEqual({
      kind: 'note',
      step: 'C',
      alter: 0,
      octave: 4,
      pitchMidi: 60,
      noteType: 'quarter',
      dots: 0,
      accidental: null,
      tie: null,
      sourceIndex: 0,
    })
  })

  it('converte uma pausa', () => {
    const result = toNotationElements(
      [note({ pitchMidi: null, isRest: true, sourceIndex: null })],
      cMajor,
    )
    expect(result[0]).toEqual({ kind: 'rest', noteType: 'quarter', dots: 0 })
  })

  it('mapeia tiedToNext + tiedFromPrevious para os papéis certos', () => {
    const notes = [
      note({ tiedToNext: true }),
      note({ tiedFromPrevious: true, tiedToNext: true, measureIndex: 1 }),
      note({ tiedFromPrevious: true, measureIndex: 2 }),
    ]
    const result = toNotationElements(notes, cMajor)
    expect(result.map((el) => (el.kind === 'note' ? el.tie : null))).toEqual([
      'start',
      'continue',
      'stop',
    ])
  })

  it('preserva a ordem e o comprimento, incluindo mistura de notas e pausas', () => {
    const notes = [note(), note({ pitchMidi: null, isRest: true, sourceIndex: null }), note()]
    const result = toNotationElements(notes, cMajor)
    expect(result).toHaveLength(3)
    expect(result[1]?.kind).toBe('rest')
  })

  it('lista vazia devolve vazio', () => {
    expect(toNotationElements([], cMajor)).toEqual([])
  })
})
