import { describe, expect, it } from 'vitest'
import type { ScoreDocument } from '@/lib/types'
import { applyTitle } from './applyTitle'

const document: ScoreDocument = {
  metadata: {
    schemaVersion: 1,
    title: 'Título original',
    createdAt: '2026-01-01T00:00:00.000Z',
    sourceName: null,
    durationSec: 4,
    confidence: { overall: 1, notes: 1, tempo: 1, key: 1 },
  },
  tempo: {
    bpm: 96,
    timeSignature: { numerator: 4, denominator: 4 },
    firstBeatSec: 0,
    confidence: 1,
    source: 'detected',
  },
  key: { tonic: 0, mode: 'major', sharpsOrFlats: 0, confidence: 1, source: 'detected' },
  clef: 'treble',
  measures: [],
}

describe('applyTitle', () => {
  it('substitui o título', () => {
    expect(applyTitle(document, 'Novo título').metadata.title).toBe('Novo título')
  })

  it('remove espaços em branco nas pontas', () => {
    expect(applyTitle(document, '  Com espaços  ').metadata.title).toBe('Com espaços')
  })

  it('rejeita um título em branco, mantendo o original', () => {
    expect(applyTitle(document, '   ').metadata.title).toBe('Título original')
    expect(applyTitle(document, '')).toEqual(document)
  })

  it('não muta o documento original', () => {
    applyTitle(document, 'Outro título')
    expect(document.metadata.title).toBe('Título original')
  })

  it('preserva o resto do documento', () => {
    const result = applyTitle(document, 'Novo título')
    expect(result.tempo).toEqual(document.tempo)
    expect(result.key).toEqual(document.key)
  })
})
