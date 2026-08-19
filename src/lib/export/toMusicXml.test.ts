// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import type { NotationNote, NotationRest, ScoreDocument } from '@/lib/types'
import { toMusicXml } from './toMusicXml'

function note(overrides: Partial<NotationNote> = {}): NotationNote {
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
    sourceIndex: null,
    ...overrides,
  }
}

function rest(overrides: Partial<NotationRest> = {}): NotationRest {
  return { kind: 'rest', noteType: 'quarter', dots: 0, ...overrides }
}

function document(overrides: Partial<ScoreDocument> = {}): ScoreDocument {
  return {
    metadata: {
      schemaVersion: 1,
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
    ...overrides,
  }
}

function parse(xml: string): Document {
  const parsed = new DOMParser().parseFromString(xml, 'application/xml')
  const parseError = parsed.querySelector('parsererror')
  if (parseError) throw new Error(`XML mal formado: ${parseError.textContent}`)
  return parsed
}

describe('toMusicXml', () => {
  it('produz XML bem formado', () => {
    const doc = document({ measures: [{ number: 1, elements: [note()] }] })
    expect(() => parse(toMusicXml(doc))).not.toThrow()
  })

  it('inclui divisions igual a TICKS_PER_QUARTER, clave, armação e compasso', () => {
    const doc = document({
      clef: 'bass',
      key: { tonic: 2, mode: 'minor', sharpsOrFlats: -3, confidence: 1, source: 'detected' },
      measures: [{ number: 1, elements: [note()] }],
    })
    const xml = parse(toMusicXml(doc))

    expect(xml.querySelector('divisions')?.textContent).toBe('480')
    expect(xml.querySelector('clef sign')?.textContent).toBe('F')
    expect(xml.querySelector('clef line')?.textContent).toBe('4')
    expect(xml.querySelector('key fifths')?.textContent).toBe('-3')
    expect(xml.querySelector('key mode')?.textContent).toBe('minor')
    expect(xml.querySelector('time beats')?.textContent).toBe('4')
    expect(xml.querySelector('time beat-type')?.textContent).toBe('4')
    expect(xml.querySelector('sound')?.getAttribute('tempo')).toBe('96')
  })

  it('uma melodia conhecida gera step/alter/octave corretos', () => {
    const doc = document({
      measures: [
        {
          number: 1,
          elements: [
            note({ step: 'C', alter: 0, octave: 4, pitchMidi: 60 }),
            note({ step: 'F', alter: 1, octave: 3, pitchMidi: 54 }),
            note({ step: 'B', alter: -1, octave: 5, pitchMidi: 82 }),
          ],
        },
      ],
    })
    const xml = parse(toMusicXml(doc))
    const notes = [...xml.querySelectorAll('note')]

    expect(notes[0]?.querySelector('step')?.textContent).toBe('C')
    expect(notes[0]?.querySelector('alter')).toBeNull()
    expect(notes[0]?.querySelector('octave')?.textContent).toBe('4')

    expect(notes[1]?.querySelector('step')?.textContent).toBe('F')
    expect(notes[1]?.querySelector('alter')?.textContent).toBe('1')
    expect(notes[1]?.querySelector('octave')?.textContent).toBe('3')

    expect(notes[2]?.querySelector('step')?.textContent).toBe('B')
    expect(notes[2]?.querySelector('alter')?.textContent).toBe('-1')
    expect(notes[2]?.querySelector('octave')?.textContent).toBe('5')
  })

  it('uma pausa gera <rest/> sem altura', () => {
    const doc = document({ measures: [{ number: 1, elements: [rest({ noteType: 'half' })] }] })
    const xml = parse(toMusicXml(doc))
    const noteEl = xml.querySelector('note')

    expect(noteEl?.querySelector('rest')).not.toBeNull()
    expect(noteEl?.querySelector('pitch')).toBeNull()
    expect(noteEl?.querySelector('type')?.textContent).toBe('half')
  })

  it('ligadura start/stop gera um par de tie e um par de tied', () => {
    const doc = document({
      measures: [
        {
          number: 1,
          elements: [note({ tie: 'start', sourceIndex: 1 }), note({ tie: 'stop', sourceIndex: 1 })],
        },
      ],
    })
    const xml = parse(toMusicXml(doc))
    const notes = [...xml.querySelectorAll('note')]

    expect(notes[0]?.querySelector('tie')?.getAttribute('type')).toBe('start')
    expect(notes[0]?.querySelector('notations tied')?.getAttribute('type')).toBe('start')
    expect(notes[1]?.querySelector('tie')?.getAttribute('type')).toBe('stop')
    expect(notes[1]?.querySelector('notations tied')?.getAttribute('type')).toBe('stop')
  })

  it('ligadura continue gera dois tie e dois tied (fecha e reabre)', () => {
    const doc = document({
      measures: [{ number: 1, elements: [note({ tie: 'continue', sourceIndex: 1 })] }],
    })
    const xml = parse(toMusicXml(doc))
    const noteEl = xml.querySelector('note')
    const ties = [...(noteEl?.querySelectorAll('tie') ?? [])]
    const tied = [...(noteEl?.querySelectorAll('notations tied') ?? [])]

    expect(ties.map((t) => t.getAttribute('type'))).toEqual(['stop', 'start'])
    expect(tied.map((t) => t.getAttribute('type'))).toEqual(['stop', 'start'])
  })

  it('nota pontuada gera <dot/>', () => {
    const doc = document({
      measures: [{ number: 1, elements: [note({ noteType: 'quarter', dots: 1 })] }],
    })
    const xml = parse(toMusicXml(doc))
    expect(xml.querySelector('note dot')).not.toBeNull()
  })

  it('acidente visível é incluído; ausência de acidente não escreve o elemento', () => {
    const doc = document({
      measures: [
        {
          number: 1,
          elements: [note({ accidental: 'sharp' }), note({ accidental: null })],
        },
      ],
    })
    const xml = parse(toMusicXml(doc))
    const notes = [...xml.querySelectorAll('note')]

    expect(notes[0]?.querySelector('accidental')?.textContent).toBe('sharp')
    expect(notes[1]?.querySelector('accidental')).toBeNull()
  })

  it('escapa o título no XML', () => {
    const doc = document({
      measures: [{ number: 1, elements: [note()] }],
      metadata: {
        schemaVersion: 1,
        title: 'Tom & Jerry <live>',
        createdAt: '2024-03-15T10:30:00.000Z',
        sourceName: null,
        durationSec: 4,
        confidence: { overall: 1, notes: 1, tempo: 1, key: 1 },
      },
    })
    const xml = toMusicXml(doc)
    expect(xml).toContain('Tom &amp; Jerry &lt;live&gt;')
    expect(() => parse(xml)).not.toThrow()
  })

  it('usa a data de metadata.createdAt como encoding-date, não a data atual', () => {
    const doc = document({ measures: [{ number: 1, elements: [note()] }] })
    const xml = parse(toMusicXml(doc))
    expect(xml.querySelector('encoding-date')?.textContent).toBe('2024-03-15')
  })

  it('só a primeira medida leva <attributes> e o andamento', () => {
    const doc = document({
      measures: [
        { number: 1, elements: [note()] },
        { number: 2, elements: [note()] },
      ],
    })
    const xml = parse(toMusicXml(doc))
    const measures = [...xml.querySelectorAll('measure')]

    expect(measures[0]?.querySelector('attributes')).not.toBeNull()
    expect(measures[0]?.querySelector('sound')).not.toBeNull()
    expect(measures[1]?.querySelector('attributes')).toBeNull()
    expect(measures[1]?.querySelector('sound')).toBeNull()
  })
})
