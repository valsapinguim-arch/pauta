import { describe, expect, it } from 'vitest'
import type { Measure, NotationElement, ScoreDocument } from '@/lib/types'
import { ScoreDocumentValidationError, validateScoreDocument } from './validateScoreDocument'

function noteEl(overrides: Partial<NotationElement & { kind: 'note' }> = {}): NotationElement {
  return {
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
    ...overrides,
  }
}

function restEl(overrides: Partial<NotationElement & { kind: 'rest' }> = {}): NotationElement {
  return { kind: 'rest', noteType: 'quarter', dots: 0, ...overrides }
}

function documentWith(measures: Measure[]): ScoreDocument {
  return {
    metadata: {
      schemaVersion: 1,
      title: 'Teste',
      createdAt: '2026-01-01T00:00:00.000Z',
      sourceName: null,
      durationSec: 4,
      confidence: { overall: 1, notes: 1, tempo: 1, key: 1 },
    },
    tempo: {
      bpm: 120,
      timeSignature: { numerator: 4, denominator: 4 },
      firstBeatSec: 0,
      confidence: 1,
      source: 'detected',
    },
    key: { tonic: 0, mode: 'major', sharpsOrFlats: 0, confidence: 1, source: 'detected' },
    clef: 'treble',
    measures,
  }
}

describe('validateScoreDocument', () => {
  it('aceita um documento válido sem lançar', () => {
    const document = documentWith([
      { number: 1, elements: [noteEl(), noteEl(), noteEl(), noteEl()] },
    ])
    expect(() => validateScoreDocument(document)).not.toThrow()
  })

  it('aceita pausas a preencher o compasso', () => {
    const document = documentWith([{ number: 1, elements: [restEl({ noteType: 'whole' })] }])
    expect(() => validateScoreDocument(document)).not.toThrow()
  })

  it('falha quando um compasso não soma measureTicks', () => {
    const document = documentWith([{ number: 1, elements: [noteEl()] }]) // só 1/4, faltam 3/4
    expect(() => validateScoreDocument(document)).toThrow(ScoreDocumentValidationError)
  })

  it('falha com uma ligadura "start" sem "stop" correspondente', () => {
    const document = documentWith([
      {
        number: 1,
        elements: [noteEl({ tie: 'start', noteType: 'whole' })],
      },
    ])
    expect(() => validateScoreDocument(document)).toThrow(ScoreDocumentValidationError)
  })

  it('aceita uma ligadura start/stop bem emparelhada entre compassos', () => {
    const document = documentWith([
      { number: 1, elements: [noteEl({ tie: 'start', noteType: 'whole' })] },
      { number: 2, elements: [noteEl({ tie: 'stop', noteType: 'whole' })] },
    ])
    expect(() => validateScoreDocument(document)).not.toThrow()
  })

  it('falha com uma ligadura "stop" sem "start" correspondente', () => {
    const document = documentWith([
      { number: 1, elements: [noteEl({ tie: 'stop', noteType: 'whole' })] },
    ])
    expect(() => validateScoreDocument(document)).toThrow(ScoreDocumentValidationError)
  })

  it('falha com uma altura fora da gama plausível', () => {
    const document = documentWith([
      { number: 1, elements: [noteEl({ pitchMidi: 200, noteType: 'whole' })] },
    ])
    expect(() => validateScoreDocument(document)).toThrow(ScoreDocumentValidationError)
  })

  it('falha com uma figura não permitida', () => {
    const document = documentWith([
      { number: 1, elements: [noteEl({ noteType: 'thirty-second' as unknown as 'sixteenth' })] },
    ])
    expect(() => validateScoreDocument(document)).toThrow(ScoreDocumentValidationError)
  })

  it('um documento sem compassos é válido (nada a somar, nenhuma ligadura pendente)', () => {
    expect(() => validateScoreDocument(documentWith([]))).not.toThrow()
  })
})
