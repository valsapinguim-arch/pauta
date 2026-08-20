import { describe, expect, it } from 'vitest'
import type { NoteEvent } from '@/lib/types'
import { buildTempoMap } from './buildTempoMap'

function note(startSec: number): NoteEvent {
  return { pitchMidi: 60, startSec, durationSec: 0.2, amplitude: 0.5 }
}

/** `count` onsets espaçados por `periodSec` — semínimas a um andamento fixo. */
function regularNotes(count: number, periodSec: number): NoteEvent[] {
  return Array.from({ length: count }, (_, i) => note(i * periodSec))
}

describe('buildTempoMap', () => {
  it('onsets a 120 BPM em semínimas dão 120', () => {
    const result = buildTempoMap(regularNotes(12, 0.5))
    expect(result.source).toBe('detected')
    expect(result.bpm).toBeCloseTo(120, 0)
    expect(result.timeSignature).toEqual({ numerator: 4, denominator: 4 })
  })

  it('a mesma sequência interpretada a 60 BPM normaliza para dentro da gama', () => {
    const result = buildTempoMap(regularNotes(12, 1))
    expect(result.source).toBe('detected')
    expect(result.bpm).toBeGreaterThanOrEqual(60)
    expect(result.bpm).toBeLessThanOrEqual(200)
  })

  it('onsets irregulares dão source "assumed" e BPM 120', () => {
    const irregular = [
      note(0),
      note(0.13),
      note(0.29),
      note(0.71),
      note(1.03),
      note(1.58),
      note(2.21),
      note(3.02),
      note(3.9),
    ]
    const result = buildTempoMap(irregular)
    expect(result.source).toBe('assumed')
    expect(result.bpm).toBe(120)
  })

  it('lista com uma só nota não lança e devolve "assumed"', () => {
    const result = buildTempoMap([note(2)])
    expect(result.source).toBe('assumed')
    expect(result.bpm).toBe(120)
    expect(result.firstBeatSec).toBe(2)
  })

  it('lista vazia não lança e devolve "assumed" com firstBeatSec 0', () => {
    const result = buildTempoMap([])
    expect(result.source).toBe('assumed')
    expect(result.firstBeatSec).toBe(0)
  })

  it('sem evidência de acento, o primeiro tempo forte continua a ser o primeiro onset', () => {
    /* `regularNotes` dá notas todas iguais — nenhuma fase de compasso pontua
       melhor do que outra, por isso `estimateDownbeat` recusa-se a adivinhar
       e mantém-se o comportamento anterior à deteção de anacruse (Tarefa 9,
       decisão 8, cujo receio de "um palpite errado" continua a valer). */
    const result = buildTempoMap(regularNotes(12, 0.5).map((n) => note(n.startSec + 3)))
    expect(result.firstBeatSec).toBe(3)
  })

  it('com uma anacruse clara, recua o primeiro tempo forte para o início do compasso', () => {
    /* Anacruse de UM tempo a 120 BPM (0,5 s): a nota de preparação cai na
       ÚLTIMA posição do compasso (posição 3 em 4/4), e o tempo forte é a
       nota seguinte. Para a anacruse caber no fim de um primeiro compasso
       completo, a origem tem de recuar 3 tempos (1,5 s) — o que sobra à
       frente dela é preenchido com pausas por `fillRests` (Tarefa 10). */
    const beat = 0.5
    const pickupBeats = 1
    const firstNotePosition = (4 - pickupBeats) % 4
    const notes: NoteEvent[] = []
    for (let i = 0; i < 17; i += 1) {
      const positionInMeasure = (i + firstNotePosition) % 4
      const isDownbeat = positionInMeasure === 0
      notes.push({
        pitchMidi: 60,
        startSec: i * beat,
        durationSec: isDownbeat ? beat : beat / 4,
        amplitude: isDownbeat ? 0.9 : positionInMeasure === 2 ? 0.6 : 0.3,
      })
    }

    const result = buildTempoMap(notes)

    expect(result.source).toBe('detected')
    expect(result.firstBeatSec).toBeCloseTo(-firstNotePosition * beat, 6)

    // O que interessa mesmo: as notas acentuadas passam a cair no tempo 1.
    for (const note of notes.filter((n) => n.durationSec === beat)) {
      const beatsFromOrigin = (note.startSec - result.firstBeatSec) / beat
      expect(Math.round(beatsFromOrigin) % 4).toBe(0)
    }
  })

  it('o caminho "assumed" nunca procura anacruse — sem BPM fiável a fase não significa nada', () => {
    const irregular = [
      note(0),
      note(0.13),
      note(0.29),
      note(0.71),
      note(1.03),
      note(1.58),
      note(2.21),
      note(3.02),
      note(3.9),
    ]
    const result = buildTempoMap(irregular)
    expect(result.source).toBe('assumed')
    expect(result.firstBeatSec).toBe(0)
  })
})
