import { describe, expect, it } from 'vitest'
import type { NoteEvent, TempoMap } from '@/lib/types'
import { QUANTIZE } from './constants'
import { quantize } from './quantize'

const tempoMap: TempoMap = {
  bpm: 120,
  timeSignature: { numerator: 4, denominator: 4 },
  firstBeatSec: 0,
  confidence: 0.9,
  source: 'detected',
}

function note(startSec: number, durationSec: number, pitchMidi = 60): NoteEvent {
  return { pitchMidi, startSec, durationSec, amplitude: 0.6 }
}

function measureSums(notes: ReturnType<typeof quantize>['notes']): Map<number, number> {
  const sums = new Map<number, number>()
  for (const n of notes) sums.set(n.measureIndex, (sums.get(n.measureIndex) ?? 0) + n.durationTicks)
  return sums
}

describe('quantize', () => {
  it('quatro semínimas a 120 BPM dão quatro semínimas exatas', () => {
    // a 120 BPM cada semínima dura 0.5s
    const notes = [note(0, 0.5), note(0.5, 0.5), note(1, 0.5), note(1.5, 0.5)]
    const result = quantize(notes, tempoMap)

    expect(result.notes).toHaveLength(4)
    for (const n of result.notes) {
      expect(n).toMatchObject({ noteType: 'quarter', dots: 0, durationTicks: 480 })
    }
    expect(result.rhythmConfidence).toBeCloseTo(1, 5)
  })

  it('uma nota de 1.5 tempos dá semínima com ponto', () => {
    const notes = [note(0, 0.75)] // 1.5 tempos a 120 BPM = 0.75s
    const result = quantize(notes, tempoMap)
    expect(result.notes[0]).toMatchObject({ noteType: 'quarter', dots: 1, durationTicks: 720 })
  })

  it('nota a começar no tempo 4 com duração de 2 tempos divide-se e liga-se sobre a barra', () => {
    // tempo 4 do compasso 1 a 120 BPM: 1.5s (3 semínimas); duração de 2 tempos = 1s
    const notes = [note(1.5, 1)]
    const result = quantize(notes, tempoMap)

    const real = result.notes.filter((n) => !n.isRest)
    expect(real).toHaveLength(2)
    expect(real[0]).toMatchObject({ measureIndex: 0, tiedToNext: true, sourceIndex: 0 })
    expect(real[1]).toMatchObject({
      measureIndex: 1,
      tiedFromPrevious: true,
      tiedToNext: false,
      sourceIndex: 0,
    })
  })

  it('último compasso incompleto é preenchido com pausas', () => {
    const notes = [note(0, 0.5)] // uma semínima só; falta o resto do compasso
    const result = quantize(notes, tempoMap)
    const sums = measureSums(result.notes)
    expect(sums.get(0)).toBe(QUANTIZE.MEASURE_TICKS)
    expect(result.notes.some((n) => n.isRest)).toBe(true)
  })

  it('todo o compasso de qualquer resultado soma measureTicks — várias notas e espaços', () => {
    const notes = [note(0, 0.25), note(0.5, 0.4), note(1.9, 0.3), note(3.1, 0.2)]
    const result = quantize(notes, tempoMap)
    const sums = measureSums(result.notes)
    for (const sum of sums.values()) {
      expect(sum).toBe(QUANTIZE.MEASURE_TICKS)
    }
  })

  it('uma nota de 10ms é promovida a semicorchea, não eliminada', () => {
    const notes = [note(0, 0.01), note(1, 0.5)]
    const result = quantize(notes, tempoMap)
    expect(result.notes.some((n) => !n.isRest && n.noteType === 'sixteenth')).toBe(true)
    // sobreviveu — não foi eliminada
    expect(result.notes.filter((n) => !n.isRest)).toHaveLength(2)
  })

  it('notas alternadas G4/A4 que deixam um intervalo interior menor que a semicorchea não estoiram a soma do compasso', () => {
    // Bug real (Tarefa 20, fixtures de áudio): [0.4, 0.2, 0.2, 0.2, 0.2] a
    // alternar de altura. A dotted-sixteenth (180 ticks) atribuída à segunda
    // nota (0.2s) termina fora da grelha de 120 ticks do snap de início;
    // isso deixa um intervalo interior de só 60 ticks antes da nota
    // seguinte — menos do que a semicorchea (120), a menor figura da tabela.
    // `decomposeRestTicks` decompunha esse intervalo com uma pausa de 120
    // ticks na mesma (decisão 5 de `noteDurations.ts`: promover, nunca
    // eliminar), invadindo os 60 ticks da nota seguinte e fazendo o
    // compasso somar 1980/2100 em vez de 1920.
    const G4 = 67
    const A4 = 69
    const durations = [0.4, 0.2, 0.2, 0.2, 0.2]
    let t = 0
    const notes = durations.map((d, i) => {
      const n = note(t, d, i % 2 === 0 ? G4 : A4)
      t += d
      return n
    })

    const result = quantize(notes, tempoMap)
    const sums = measureSums(result.notes)
    for (const sum of sums.values()) {
      expect(sum).toBe(QUANTIZE.MEASURE_TICKS)
    }
  })

  it('mesmo intervalo apertado com outra combinação de durações não estoira a soma do compasso', () => {
    const G4 = 67
    const A4 = 69
    const durations = [0.8, 0.4, 0.2, 0.2, 0.4]
    let t = 0
    const notes = durations.map((d, i) => {
      const n = note(t, d, i % 2 === 0 ? G4 : A4)
      t += d
      return n
    })

    const result = quantize(notes, tempoMap)
    const sums = measureSums(result.notes)
    for (const sum of sums.values()) {
      expect(sum).toBe(QUANTIZE.MEASURE_TICKS)
    }
  })

  it('lista vazia não lança e devolve resultado vazio', () => {
    expect(quantize([], tempoMap)).toEqual({ notes: [], rhythmConfidence: 0 })
  })

  it('mantém a ligação sourceIndex → NoteEvent original', () => {
    const notes = [note(0, 0.5, 62), note(0.5, 0.5, 64)]
    const result = quantize(notes, tempoMap)
    const real = result.notes.filter((n) => !n.isRest)
    expect(real[0]).toMatchObject({ sourceIndex: 0, pitchMidi: 62 })
    expect(real[1]).toMatchObject({ sourceIndex: 1, pitchMidi: 64 })
  })
})
