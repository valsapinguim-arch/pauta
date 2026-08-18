import { describe, expect, it } from 'vitest'
import type { ScoreDocument } from '@/lib/types'
import { applyManualKey } from './applyManualKey'

const document: ScoreDocument = {
  metadata: {
    schemaVersion: 1,
    title: 'Teste',
    createdAt: '2026-01-01T00:00:00.000Z',
    sourceName: null,
    durationSec: 4,
    confidence: { overall: 0.8, notes: 0.9, tempo: 0.9, key: 0.2 },
  },
  tempo: {
    bpm: 96,
    timeSignature: { numerator: 4, denominator: 4 },
    firstBeatSec: 0,
    confidence: 0.9,
    source: 'detected',
  },
  key: { tonic: 0, mode: 'major', sharpsOrFlats: 0, confidence: 0.2, source: 'assumed' },
  clef: 'treble',
  measures: [],
}

describe('applyManualKey', () => {
  it('substitui a tonalidade e marca a proveniência como manual, com confiança 1', () => {
    const result = applyManualKey(document, 7, 'major')
    expect(result.key).toEqual({
      tonic: 7,
      mode: 'major',
      sharpsOrFlats: 1,
      confidence: 1,
      source: 'manual',
    })
    expect(result.metadata.confidence.key).toBe(1)
  })

  it('calcula a armação correta para a nova tonalidade', () => {
    expect(applyManualKey(document, 1, 'major').key.sharpsOrFlats).toBe(-5)
  })

  it('não muta o documento original', () => {
    applyManualKey(document, 7, 'major')
    expect(document.key.tonic).toBe(0)
    expect(document.key.source).toBe('assumed')
  })

  it('preserva o resto do documento', () => {
    const result = applyManualKey(document, 7, 'major')
    expect(result.tempo).toEqual(document.tempo)
    expect(result.clef).toBe(document.clef)
  })
})
