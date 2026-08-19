import { describe, expect, it } from 'vitest'
import type { ScoreDocument } from '@/lib/types'
import { applyManualBpm } from './applyManualBpm'

const document: ScoreDocument = {
  metadata: {
    schemaVersion: 1,
    title: 'Teste',
    createdAt: '2026-01-01T00:00:00.000Z',
    sourceName: null,
    durationSec: 4,
    confidence: { overall: 0.8, notes: 0.9, tempo: 0.4, key: 0.9 },
  },
  tempo: {
    bpm: 96,
    timeSignature: { numerator: 4, denominator: 4 },
    firstBeatSec: 0,
    confidence: 0.4,
    source: 'assumed',
  },
  key: { tonic: 0, mode: 'major', sharpsOrFlats: 0, confidence: 0.9, source: 'detected' },
  clef: 'treble',
  measures: [],
}

describe('applyManualBpm', () => {
  it('substitui o bpm e marca a proveniência como manual, com confiança 1', () => {
    const result = applyManualBpm(document, 140)
    expect(result.tempo.bpm).toBe(140)
    expect(result.tempo.source).toBe('manual')
    expect(result.tempo.confidence).toBe(1)
    expect(result.metadata.confidence.tempo).toBe(1)
  })

  it('preserva o resto do tempo (compasso, primeiro tempo forte)', () => {
    const result = applyManualBpm(document, 140)
    expect(result.tempo.timeSignature).toEqual(document.tempo.timeSignature)
    expect(result.tempo.firstBeatSec).toBe(document.tempo.firstBeatSec)
  })

  it('não muta o documento original', () => {
    applyManualBpm(document, 140)
    expect(document.tempo.bpm).toBe(96)
    expect(document.tempo.source).toBe('assumed')
  })

  it('arredonda o valor recebido', () => {
    expect(applyManualBpm(document, 100.6).tempo.bpm).toBe(101)
  })

  it('confina a gama manual [20, 400]', () => {
    expect(applyManualBpm(document, 5).tempo.bpm).toBe(20)
    expect(applyManualBpm(document, 1000).tempo.bpm).toBe(400)
  })
})
