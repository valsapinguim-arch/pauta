// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import type { ScoreDocument } from '@/lib/types'
import { drawScore } from './drawScore'
import type { VexFlowModule } from './drawScore'

let vf: VexFlowModule

beforeEach(async () => {
  vf = await import('vexflow')
})

const baseDocument: ScoreDocument = {
  metadata: {
    schemaVersion: 1,
    title: 'Teste',
    createdAt: '2026-01-01T00:00:00.000Z',
    sourceName: null,
    durationSec: 8,
    confidence: { overall: 0.9, notes: 0.9, tempo: 0.9, key: 0.9 },
  },
  tempo: {
    bpm: 96,
    timeSignature: { numerator: 4, denominator: 4 },
    firstBeatSec: 0,
    confidence: 0.9,
    source: 'detected',
  },
  key: { tonic: 7, mode: 'major', sharpsOrFlats: 1, confidence: 0.9, source: 'detected' },
  clef: 'treble',
  measures: [
    {
      number: 1,
      elements: [
        {
          kind: 'note',
          step: 'G',
          alter: 0,
          octave: 4,
          pitchMidi: 67,
          noteType: 'quarter',
          dots: 0,
          accidental: null,
          tie: null,
          sourceIndex: 0,
        },
        {
          kind: 'note',
          step: 'F',
          alter: 1,
          octave: 4,
          pitchMidi: 66,
          noteType: 'eighth',
          dots: 0,
          accidental: null,
          tie: null,
          sourceIndex: 1,
        },
        {
          kind: 'note',
          step: 'F',
          alter: 0,
          octave: 4,
          pitchMidi: 65,
          noteType: 'eighth',
          dots: 0,
          accidental: 'natural',
          tie: 'start',
          sourceIndex: 2,
        },
        { kind: 'rest', noteType: 'quarter', dots: 0 },
        {
          kind: 'note',
          step: 'B',
          alter: 0,
          octave: 4,
          pitchMidi: 71,
          noteType: 'quarter',
          dots: 0,
          accidental: null,
          tie: null,
          sourceIndex: 4,
        },
      ],
    },
    {
      number: 2,
      elements: [
        {
          kind: 'note',
          step: 'F',
          alter: 0,
          octave: 4,
          pitchMidi: 65,
          noteType: 'quarter',
          dots: 0,
          accidental: null,
          tie: 'stop',
          sourceIndex: 2,
        },
        { kind: 'rest', noteType: 'half', dots: 1 },
      ],
    },
  ],
}

describe('drawScore', () => {
  it('desenha um documento sem lançar e produz um SVG', () => {
    const container = document.createElement('div')
    const result = drawScore(vf, container, baseDocument, 600)

    expect(container.querySelector('svg')).not.toBeNull()
    expect(result.totalHeight).toBeGreaterThan(0)
  })

  it('atribui data-measure e data-element a cada nota/pausa desenhada', () => {
    const container = document.createElement('div')
    drawScore(vf, container, baseDocument, 600)

    const measure1Elements = container.querySelectorAll('[data-measure="1"]')
    const measure2Elements = container.querySelectorAll('[data-measure="2"]')
    expect(measure1Elements.length).toBe(5)
    expect(measure2Elements.length).toBe(2)
    expect(container.querySelector('[data-measure="1"][data-element="0"]')).not.toBeNull()
  })

  it('desenha uma ligadura entre a nota "start" e a "stop" correspondente', () => {
    const container = document.createElement('div')
    drawScore(vf, container, baseDocument, 600)
    expect(container.querySelectorAll('.vf-stavetie')).toHaveLength(1)
  })

  it('largura estreita produz mais linhas (mais altura) do que largura generosa', () => {
    const threeMeasures: ScoreDocument = {
      ...baseDocument,
      measures: [
        ...baseDocument.measures,
        { ...(baseDocument.measures[1] as ScoreDocument['measures'][number]), number: 3 },
      ],
    }
    const narrow = drawScore(vf, document.createElement('div'), threeMeasures, 250)
    const wide = drawScore(vf, document.createElement('div'), threeMeasures, 2000)
    expect(narrow.totalHeight).toBeGreaterThan(wide.totalHeight)
  })

  it('redesenha por completo: chamar duas vezes não deixa nós antigos', () => {
    const container = document.createElement('div')
    drawScore(vf, container, baseDocument, 600)
    drawScore(vf, container, baseDocument, 600)
    expect(container.querySelectorAll('svg')).toHaveLength(1)
  })

  it('um documento com um só compasso e uma só nota não lança', () => {
    const minimal: ScoreDocument = {
      ...baseDocument,
      measures: [
        {
          number: 1,
          elements: [{ kind: 'rest', noteType: 'whole', dots: 0 }],
        },
      ],
    }
    const container = document.createElement('div')
    expect(() => drawScore(vf, container, minimal, 600)).not.toThrow()
  })
})
