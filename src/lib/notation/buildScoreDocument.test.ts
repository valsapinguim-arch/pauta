import { describe, expect, it } from 'vitest'
import type { KeyAnalysis, QuantizedNote, TempoMap } from '@/lib/types'
import { buildScoreDocument } from './buildScoreDocument'
import type { BuildScoreDocumentMetadata } from './buildScoreDocument'
import { ScoreDocumentValidationError } from './validateScoreDocument'

const tempoMap: TempoMap = {
  bpm: 120,
  timeSignature: { numerator: 4, denominator: 4 },
  firstBeatSec: 0,
  confidence: 0.9,
  source: 'detected',
}

const cMajor: KeyAnalysis = {
  tonic: 0,
  mode: 'major',
  sharpsOrFlats: 0,
  confidence: 0.9,
  source: 'detected',
}

const metadata: BuildScoreDocumentMetadata = {
  title: 'Melodia de teste',
  createdAt: '2026-01-01T00:00:00.000Z',
  sourceName: null,
  durationSec: 4,
  notesConfidence: 0.85,
}

/** Duas semibreves — dois compassos válidos completos, sem ligaduras. */
function twoMeasuresOfWholeNotes(pitches: [number, number]): QuantizedNote[] {
  return pitches.map((pitchMidi, measureIndex) => ({
    pitchMidi,
    startTick: measureIndex * 1920,
    durationTicks: 1920,
    noteType: 'whole',
    dots: 0,
    isRest: false,
    tiedToNext: false,
    tiedFromPrevious: false,
    sourceIndex: measureIndex,
    measureIndex,
  }))
}

describe('buildScoreDocument', () => {
  it('constrói um documento com o número de compassos esperado', () => {
    const document = buildScoreDocument({
      quantizedNotes: twoMeasuresOfWholeNotes([60, 62]),
      tempoMap,
      keyAnalysis: cMajor,
      metadata,
    })
    expect(document.measures).toHaveLength(2)
    expect(document.measures[0]?.number).toBe(1)
    expect(document.measures[1]?.number).toBe(2)
  })

  it('escolhe a clave pela tessitura das notas', () => {
    const trebleDoc = buildScoreDocument({
      quantizedNotes: twoMeasuresOfWholeNotes([72, 76]),
      tempoMap,
      keyAnalysis: cMajor,
      metadata,
    })
    expect(trebleDoc.clef).toBe('treble')

    const bassDoc = buildScoreDocument({
      quantizedNotes: twoMeasuresOfWholeNotes([43, 45]),
      tempoMap,
      keyAnalysis: cMajor,
      metadata,
    })
    expect(bassDoc.clef).toBe('bass')
  })

  it('agrega a confiança das três fontes e preserva o título', () => {
    const document = buildScoreDocument({
      quantizedNotes: twoMeasuresOfWholeNotes([60, 62]),
      tempoMap,
      keyAnalysis: cMajor,
      metadata,
    })
    expect(document.metadata.title).toBe('Melodia de teste')
    expect(document.metadata.confidence.notes).toBe(0.85)
    expect(document.metadata.confidence.tempo).toBe(0.9)
    expect(document.metadata.confidence.key).toBe(0.9)
    expect(document.metadata.schemaVersion).toBe(1)
  })

  it('lança quando o documento resultante é estruturalmente inválido', () => {
    const brokenNote: QuantizedNote = {
      pitchMidi: 60,
      startTick: 0,
      durationTicks: 480, // só 1/4 de compasso, nunca preenche 1920
      noteType: 'quarter',
      dots: 0,
      isRest: false,
      tiedToNext: false,
      tiedFromPrevious: false,
      sourceIndex: 0,
      measureIndex: 0,
    }
    expect(() =>
      buildScoreDocument({
        quantizedNotes: [brokenNote],
        tempoMap,
        keyAnalysis: cMajor,
        metadata,
      }),
    ).toThrow(ScoreDocumentValidationError)
  })

  it('é determinístico: a mesma entrada dá exatamente o mesmo documento', () => {
    const notes = twoMeasuresOfWholeNotes([60, 64])
    const a = buildScoreDocument({ quantizedNotes: notes, tempoMap, keyAnalysis: cMajor, metadata })
    const b = buildScoreDocument({ quantizedNotes: notes, tempoMap, keyAnalysis: cMajor, metadata })
    expect(a).toEqual(b)
  })

  it('o documento devolvido está congelado', () => {
    const document = buildScoreDocument({
      quantizedNotes: twoMeasuresOfWholeNotes([60, 62]),
      tempoMap,
      keyAnalysis: cMajor,
      metadata,
    })
    expect(Object.isFrozen(document)).toBe(true)
    expect(Object.isFrozen(document.measures)).toBe(true)
    expect(Object.isFrozen(document.measures[0])).toBe(true)
    expect(Object.isFrozen(document.measures[0]?.elements)).toBe(true)
    expect(Object.isFrozen(document.measures[0]?.elements[0])).toBe(true)
  })

  it('sem notas produz um documento sem compassos, sem lançar', () => {
    const document = buildScoreDocument({
      quantizedNotes: [],
      tempoMap,
      keyAnalysis: cMajor,
      metadata,
    })
    expect(document.measures).toEqual([])
  })
})
