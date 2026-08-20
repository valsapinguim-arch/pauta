import { describe, expect, it } from 'vitest'
import { SCHEMA_VERSION, type ScoreDocument } from '@/lib/types'
import { migrateDocument } from './migrateDocument'

function document(): ScoreDocument {
  return {
    metadata: {
      schemaVersion: SCHEMA_VERSION,
      title: 'Escala de Dó maior',
      createdAt: '2024-03-15T10:30:00.000Z',
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
}

describe('migrateDocument', () => {
  it('com a versão atual devolve o documento intacto', () => {
    const doc = document()
    const result = migrateDocument(doc, SCHEMA_VERSION)

    expect(result).toEqual({ legible: true, document: doc })
  })

  it('com versão superior devolve marcação de ilegível, sem lançar', () => {
    expect(() => migrateDocument(document(), SCHEMA_VERSION + 1)).not.toThrow()
    expect(migrateDocument(document(), SCHEMA_VERSION + 1)).toEqual({ legible: false })
  })

  it('com versão inferior sem migração registada devolve ilegível, sem lançar', () => {
    expect(() => migrateDocument({ ancient: true }, SCHEMA_VERSION - 1)).not.toThrow()
    expect(migrateDocument({ ancient: true }, SCHEMA_VERSION - 1)).toEqual({ legible: false })
  })
})
