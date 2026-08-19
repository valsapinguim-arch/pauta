import { describe, expect, it } from 'vitest'
import type { KeyAnalysis, QuantizedNote } from '@/lib/types'
import { applyAccidentals } from './applyAccidentals'

/** Sol maior — 1 sustenido (fá#), para que um fá natural seja sempre um
 *  acidente a mostrar. */
const gMajor: KeyAnalysis = {
  tonic: 7,
  mode: 'major',
  sharpsOrFlats: 1,
  confidence: 1,
  source: 'detected',
}

function note(
  pitchMidi: number | null,
  measureIndex: number,
  overrides: Partial<QuantizedNote> = {},
): QuantizedNote {
  return {
    pitchMidi,
    startTick: 0,
    durationTicks: 480,
    noteType: 'quarter',
    dots: 0,
    isRest: pitchMidi === null,
    tiedToNext: false,
    tiedFromPrevious: false,
    sourceIndex: pitchMidi === null ? null : 0,
    measureIndex,
    ...overrides,
  }
}

describe('applyAccidentals', () => {
  it('uma nota que difere da armação leva acidente', () => {
    const result = applyAccidentals([note(65, 0)], gMajor) // F4 natural
    expect(result[0]).toMatchObject({ step: 'F', alter: 0, accidental: 'natural' })
  })

  it('uma nota que coincide com a armação não leva acidente', () => {
    const result = applyAccidentals([note(66, 0)], gMajor) // F#4
    expect(result[0]).toMatchObject({ step: 'F', alter: 1, accidental: null })
  })

  it('duas notas iguais alteradas no mesmo compasso só levam um acidente', () => {
    const result = applyAccidentals([note(65, 0), note(65, 0)], gMajor)
    expect(result[0]?.accidental).toBe('natural')
    expect(result[1]?.accidental).toBeNull()
  })

  it('uma nota alterada num compasso não afeta o compasso seguinte', () => {
    const result = applyAccidentals([note(65, 0), note(65, 1)], gMajor)
    expect(result[0]?.accidental).toBe('natural')
    expect(result[1]?.accidental).toBe('natural')
  })

  it('uma nota ligada sobre a barra não repete o acidente', () => {
    const notes = [note(65, 0, { tiedToNext: true }), note(65, 1, { tiedFromPrevious: true })]
    const result = applyAccidentals(notes, gMajor)
    expect(result[0]?.accidental).toBe('natural')
    expect(result[1]?.accidental).toBeNull()
  })

  it('depois de uma nota ligada, uma nova ocorrência não ligada no mesmo compasso também não repete', () => {
    const notes = [
      note(65, 0, { tiedToNext: true }),
      note(65, 1, { tiedFromPrevious: true }),
      note(65, 1), // outra ocorrência, já não ligada, mesmo compasso da parte ligada
    ]
    const result = applyAccidentals(notes, gMajor)
    expect(result[2]?.accidental).toBeNull()
  })

  it('pausas devolvem null e não interferem na memória do compasso', () => {
    const notes = [note(65, 0), note(null, 0), note(65, 0)]
    const result = applyAccidentals(notes, gMajor)
    expect(result[1]).toBeNull()
    expect(result[2]?.accidental).toBeNull()
  })

  it('devolve bequadro ao regressar à armação depois de um acidente no mesmo compasso', () => {
    const notes = [note(65, 0), note(66, 0)] // F natural depois F#
    const result = applyAccidentals(notes, gMajor)
    expect(result[0]?.accidental).toBe('natural')
    expect(result[1]?.accidental).toBe('sharp')
  })

  it('lista vazia devolve vazio', () => {
    expect(applyAccidentals([], gMajor)).toEqual([])
  })
})
