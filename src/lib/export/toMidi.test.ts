import { describe, expect, it } from 'vitest'
import type { NotationNote, NotationRest, ScoreDocument } from '@/lib/types'
import { toMidi } from './toMidi'

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
      title: 't',
      createdAt: '2024-01-01T00:00:00.000Z',
      sourceName: null,
      durationSec: 0,
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
    measures: [],
    ...overrides,
  }
}

interface ParsedEvent {
  tick: number
  type: 'noteOn' | 'noteOff' | 'meta' | 'other'
  metaType?: number
  data: number[]
}

/** Interpretador mínimo do MIDI produzido, só para verificação nos testes
 *  — não é parte do produto, não substitui abrir o ficheiro num programa
 *  real (Tarefa 15, decisão 9). */
function parse(bytes: Uint8Array): {
  division: number
  format: number
  ntrks: number
  events: ParsedEvent[]
} {
  const format = ((bytes[8] as number) << 8) | (bytes[9] as number)
  const ntrks = ((bytes[10] as number) << 8) | (bytes[11] as number)
  const division = ((bytes[12] as number) << 8) | (bytes[13] as number)

  const trackLength =
    ((bytes[18] as number) << 24) |
    ((bytes[19] as number) << 16) |
    ((bytes[20] as number) << 8) |
    (bytes[21] as number)

  let i = 22
  const end = i + trackLength
  const events: ParsedEvent[] = []
  let tick = 0

  while (i < end) {
    let delta = 0
    for (;;) {
      const b = bytes[i] as number
      i += 1
      delta = (delta << 7) | (b & 0x7f)
      if (!(b & 0x80)) break
    }
    tick += delta

    const status = bytes[i] as number
    if (status === 0xff) {
      i += 1
      const metaType = bytes[i] as number
      i += 1
      let length = 0
      for (;;) {
        const b = bytes[i] as number
        i += 1
        length = (length << 7) | (b & 0x7f)
        if (!(b & 0x80)) break
      }
      const data = Array.from(bytes.slice(i, i + length))
      i += length
      events.push({ tick, type: 'meta', metaType, data })
    } else {
      i += 1
      const d1 = bytes[i] as number
      i += 1
      const d2 = bytes[i] as number
      i += 1
      const kind = status & 0xf0
      events.push({
        tick,
        type: kind === 0x90 ? 'noteOn' : kind === 0x80 ? 'noteOff' : 'other',
        data: [d1, d2],
      })
    }
  }

  return { format, ntrks, division, events }
}

describe('toMidi', () => {
  it('produz um cabeçalho válido: MThd, formato 0, uma track, divisão 480', () => {
    const doc = document({ measures: [{ number: 1, elements: [note()] }] })
    const bytes = toMidi(doc)

    expect(String.fromCharCode(...bytes.slice(0, 4))).toBe('MThd')
    expect(String.fromCharCode(...bytes.slice(14, 18))).toBe('MTrk')

    const parsed = parse(bytes)
    expect(parsed.format).toBe(0)
    expect(parsed.ntrks).toBe(1)
    expect(parsed.division).toBe(480)
  })

  it('termina sempre com fim de faixa (FF 2F 00)', () => {
    const doc = document({ measures: [{ number: 1, elements: [note()] }] })
    const { events } = parse(toMidi(doc))
    const last = events.at(-1)
    expect(last?.type).toBe('meta')
    expect(last?.metaType).toBe(0x2f)
  })

  it('inclui set tempo, time signature e key signature no início', () => {
    const doc = document({
      tempo: {
        bpm: 120,
        timeSignature: { numerator: 3, denominator: 4 },
        firstBeatSec: 0,
        confidence: 1,
        source: 'detected',
      },
      key: { tonic: 9, mode: 'minor', sharpsOrFlats: 0, confidence: 1, source: 'detected' },
      measures: [{ number: 1, elements: [note()] }],
    })
    const { events } = parse(toMidi(doc))
    const metaTypes = events.filter((e) => e.type === 'meta').map((e) => e.metaType)

    expect(metaTypes).toContain(0x51) // set tempo
    expect(metaTypes).toContain(0x58) // time signature
    expect(metaTypes).toContain(0x59) // key signature

    const timeSig = events.find((e) => e.metaType === 0x58)
    expect(timeSig?.data.slice(0, 2)).toEqual([3, 2]) // 3/4 -> numerador 3, log2(4)=2

    const keySig = events.find((e) => e.metaType === 0x59)
    expect(keySig?.data).toEqual([0, 1]) // sharpsOrFlats 0, modo menor

    const tempoMeta = events.find((e) => e.metaType === 0x51)
    const [b0, b1, b2] = tempoMeta?.data ?? []
    const microsecondsPerQuarter = ((b0 as number) << 16) | ((b1 as number) << 8) | (b2 as number)
    expect(Math.round(60_000_000 / microsecondsPerQuarter)).toBe(120)
  })

  it('MIDI de dó central contém a nota 60', () => {
    const doc = document({
      measures: [{ number: 1, elements: [note({ pitchMidi: 60 })] }],
    })
    const { events } = parse(toMidi(doc))
    const noteOn = events.find((e) => e.type === 'noteOn')

    expect(noteOn?.data[0]).toBe(60)
  })

  it('gera um par note on/note off por nota, na ordem esperada', () => {
    const doc = document({
      measures: [{ number: 1, elements: [note({ pitchMidi: 60 }), note({ pitchMidi: 64 })] }],
    })
    const { events } = parse(toMidi(doc))
    const noteEvents = events.filter((e) => e.type === 'noteOn' || e.type === 'noteOff')

    expect(noteEvents.map((e) => e.type)).toEqual(['noteOn', 'noteOff', 'noteOn', 'noteOff'])
    expect(noteEvents.map((e) => e.data[0])).toEqual([60, 60, 64, 64])
  })

  it('pausas não geram evento, mas avançam o tick da nota seguinte', () => {
    const doc = document({
      measures: [
        { number: 1, elements: [note({ pitchMidi: 60 }), rest(), note({ pitchMidi: 62 })] },
      ],
    })
    const { events } = parse(toMidi(doc))
    const noteOns = events.filter((e) => e.type === 'noteOn')

    expect(noteOns).toHaveLength(2)
    expect(noteOns[0]?.tick).toBe(0)
    expect(noteOns[1]?.tick).toBe(960) // 480 (nota) + 480 (pausa)
  })

  it('notas ligadas fundem-se num só par note on/off com a duração somada', () => {
    const doc = document({
      measures: [
        {
          number: 1,
          elements: [
            note({ pitchMidi: 67, tie: 'start', sourceIndex: 1 }),
            note({ pitchMidi: 67, tie: 'stop', sourceIndex: 1 }),
          ],
        },
      ],
    })
    const { events } = parse(toMidi(doc))
    const noteEvents = events.filter((e) => e.type === 'noteOn' || e.type === 'noteOff')

    expect(noteEvents).toHaveLength(2)
    expect(noteEvents[0]).toMatchObject({ type: 'noteOn', tick: 0 })
    expect(noteEvents[1]).toMatchObject({ type: 'noteOff', tick: 960 })
  })
})
