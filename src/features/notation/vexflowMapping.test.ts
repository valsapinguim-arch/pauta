import { describe, expect, it } from 'vitest'
import {
  toVexAccidentalCode,
  toVexDuration,
  toVexKey,
  toVexKeySignatureSpec,
  toVexNoteStruct,
} from './vexflowMapping'

describe('toVexDuration', () => {
  it('mapeia as cinco figuras base', () => {
    expect(toVexDuration('whole', 0, false)).toBe('w')
    expect(toVexDuration('half', 0, false)).toBe('h')
    expect(toVexDuration('quarter', 0, false)).toBe('q')
    expect(toVexDuration('eighth', 0, false)).toBe('8')
    expect(toVexDuration('sixteenth', 0, false)).toBe('16')
  })

  it('acrescenta "d" para ponto', () => {
    expect(toVexDuration('quarter', 1, false)).toBe('qd')
  })

  it('acrescenta "r" para pausa, depois do ponto', () => {
    expect(toVexDuration('quarter', 1, true)).toBe('qdr')
    expect(toVexDuration('eighth', 0, true)).toBe('8r')
  })
})

describe('toVexKey', () => {
  it('minúscula, sem sufixo para natural', () => {
    expect(toVexKey('C', 0, 4)).toBe('c/4')
  })

  it('sufixo # para sustenido, b para bemol', () => {
    expect(toVexKey('F', 1, 4)).toBe('f#/4')
    expect(toVexKey('E', -1, 4)).toBe('eb/4')
  })
})

describe('toVexAccidentalCode', () => {
  it('mapeia os três tipos', () => {
    expect(toVexAccidentalCode('sharp')).toBe('#')
    expect(toVexAccidentalCode('flat')).toBe('b')
    expect(toVexAccidentalCode('natural')).toBe('n')
  })

  it('devolve null quando não há acidente visível', () => {
    expect(toVexAccidentalCode(null)).toBeNull()
  })
})

describe('toVexKeySignatureSpec', () => {
  it('dó maior e lá menor (relativas) têm specs diferentes mas mesma armação implícita', () => {
    expect(toVexKeySignatureSpec(0, 'major')).toBe('C')
    expect(toVexKeySignatureSpec(9, 'minor')).toBe('Am')
  })

  it('sol maior e mi menor (relativas, 1 sustenido)', () => {
    expect(toVexKeySignatureSpec(7, 'major')).toBe('G')
    expect(toVexKeySignatureSpec(4, 'minor')).toBe('Em')
  })

  it('réb maior (5 bemóis)', () => {
    expect(toVexKeySignatureSpec(1, 'major')).toBe('Db')
  })

  it('todas as 24 combinações produzem uma spec conhecida do VexFlow', () => {
    const known = new Set([
      'C',
      'Am',
      'F',
      'Dm',
      'Bb',
      'Gm',
      'Eb',
      'Cm',
      'Ab',
      'Fm',
      'Db',
      'Bbm',
      'Gb',
      'Ebm',
      'Cb',
      'Abm',
      'G',
      'Em',
      'D',
      'Bm',
      'A',
      'F#m',
      'E',
      'C#m',
      'B',
      'G#m',
      'F#',
      'D#m',
      'C#',
      'A#m',
    ])
    for (let tonic = 0; tonic < 12; tonic++) {
      expect(known.has(toVexKeySignatureSpec(tonic, 'major'))).toBe(true)
      expect(known.has(toVexKeySignatureSpec(tonic, 'minor'))).toBe(true)
    }
  })
})

describe('toVexNoteStruct', () => {
  it('converte uma nota', () => {
    expect(
      toVexNoteStruct({
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
      }),
    ).toEqual({ keys: ['c/4'], duration: 'q' })
  })

  it('converte uma pausa com a posição convencional b/4', () => {
    expect(toVexNoteStruct({ kind: 'rest', noteType: 'half', dots: 0 })).toEqual({
      keys: ['b/4'],
      duration: 'hr',
    })
  })
})
