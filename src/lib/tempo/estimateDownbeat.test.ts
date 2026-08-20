import { describe, expect, it } from 'vitest'
import type { NoteEvent } from '@/lib/types'
import { TEMPO } from './constants'
import { estimateDownbeat } from './estimateDownbeat'

const BPM = 120
const BEAT = 60 / BPM // 0.5s
const BEATS_PER_MEASURE = 4

/**
 * Constrói uma melodia em 4/4 com `pickupBeats` tempos de anacruse: as notas
 * que caem em tempo forte saem longas e fortes, as outras curtas e fracas —
 * é essa diferença de acento que `estimateDownbeat` procura. A primeira nota
 * fica sempre em `startSec: 0`, como acontece depois da limpeza.
 *
 * Uma anacruse de `k` tempos põe a primeira nota `k` tempos ANTES do tempo
 * forte, ou seja na posição `BEATS_PER_MEASURE - k` do compasso. Escrever
 * isto ao contrário (primeira nota na posição `k`) faria o gerador e o
 * algoritmo partilharem a mesma convenção errada e os testes passariam à
 * mesma sem detetar nada — foi exatamente o que aconteceu antes de se
 * verificar de ponta a ponta com áudio real.
 */
function melodyWithPickup(pickupBeats: number, measures = 4): NoteEvent[] {
  const notes: NoteEvent[] = []
  const totalBeats = pickupBeats + measures * BEATS_PER_MEASURE
  const firstNotePosition = (BEATS_PER_MEASURE - pickupBeats) % BEATS_PER_MEASURE

  for (let beat = 0; beat < totalBeats; beat += 1) {
    const positionInMeasure = (beat + firstNotePosition) % BEATS_PER_MEASURE
    const isDownbeat = positionInMeasure === 0
    const isHalfStrong = positionInMeasure === 2

    notes.push({
      pitchMidi: 60 + positionInMeasure,
      startSec: beat * BEAT,
      durationSec: isDownbeat ? BEAT : BEAT / 4,
      amplitude: isDownbeat ? 0.9 : isHalfStrong ? 0.6 : 0.3,
    })
  }

  return notes
}

describe('estimateDownbeat', () => {
  it.each([1, 2, 3])('encontra uma anacruse de %i tempos', (pickupBeats) => {
    const result = estimateDownbeat(melodyWithPickup(pickupBeats), BPM, BEATS_PER_MEASURE)
    expect(result.pickupBeats).toBe(pickupBeats)
    expect(result.confidence).toBeGreaterThanOrEqual(TEMPO.DOWNBEAT_MIN_CONFIDENCE)
  })

  it('música que começa no tempo forte não inventa anacruse', () => {
    expect(estimateDownbeat(melodyWithPickup(0), BPM, BEATS_PER_MEASURE).pickupBeats).toBe(0)
  })

  it.each([0, 1, 2, 3])(
    'anacruse de %i tempos põe as notas ACENTUADAS no tempo forte do compasso',
    (pickupBeats) => {
      /* O teste que faltava: não basta o número devolvido bater certo, tem
         de bater certo a POSIÇÃO em que a nota acaba por cair. Sem isto, uma
         convenção trocada entre `estimateDownbeat` e `buildTempoMap` passa
         despercebida — a primeira nota ia parar à posição `k` em vez de
         `beatsPerMeasure - k`, e a pauta saía deslocada apesar de todos os
         números parecerem certos. */
      const notes = melodyWithPickup(pickupBeats)
      const { pickupBeats: detected } = estimateDownbeat(notes, BPM, BEATS_PER_MEASURE)
      expect(detected).toBe(pickupBeats)

      // Reproduz o que `buildTempoMap` faz com o resultado.
      const beatsBeforeFirstNote = (BEATS_PER_MEASURE - detected) % BEATS_PER_MEASURE
      const firstBeatSec = (notes[0] as NoteEvent).startSec - beatsBeforeFirstNote * BEAT

      // Toda a nota longa (a que o gerador acentuou) tem de cair no tempo 1.
      const accented = notes.filter((n) => n.durationSec === BEAT)
      expect(accented.length).toBeGreaterThan(0)
      for (const note of accented) {
        const beatsFromOrigin = (note.startSec - firstBeatSec) / BEAT
        expect(Math.round(beatsFromOrigin) % BEATS_PER_MEASURE).toBe(0)
      }
    },
  )

  it('sem acentos que distingam as fases, não arrisca (devolve 0)', () => {
    // Todas as notas iguais: as quatro hipóteses de fase pontuam o mesmo, a
    // margem é nula. É exatamente o caso que a decisão 8 da Tarefa 9 dizia
    // para não adivinhar.
    const flat: NoteEvent[] = Array.from({ length: 16 }, (_, i) => ({
      pitchMidi: 60,
      startSec: i * BEAT,
      durationSec: BEAT / 2,
      amplitude: 0.5,
    }))

    const result = estimateDownbeat(flat, BPM, BEATS_PER_MEASURE)
    expect(result.pickupBeats).toBe(0)
  })

  it('notas fora da grelha não contam como evidência e levam a 0', () => {
    const offGrid: NoteEvent[] = Array.from({ length: 16 }, (_, i) => ({
      pitchMidi: 60,
      startSec: i * BEAT + BEAT * 0.4, // bem além de GRID_ALIGNMENT_TOLERANCE
      durationSec: BEAT,
      amplitude: 0.9,
    }))
    // O deslocamento é constante, por isso a primeira nota define a origem e
    // as restantes continuam alinhadas entre si — o que se testa aqui é que
    // notas desalinhadas do tempo não passam a valer como prova de fase.
    const shifted = offGrid.map((n, i) => ({ ...n, startSec: n.startSec + (i % 2) * BEAT * 0.3 }))
    expect(estimateDownbeat(shifted, BPM, BEATS_PER_MEASURE).pickupBeats).toBe(0)
  })

  it('poucas notas não chegam para estimar fase nenhuma', () => {
    const few = melodyWithPickup(1).slice(0, TEMPO.MIN_ONSETS_FOR_ESTIMATE - 1)
    expect(estimateDownbeat(few, BPM, BEATS_PER_MEASURE)).toEqual({
      pickupBeats: 0,
      confidence: 0,
    })
  })

  it('entrada vazia ou BPM inválido não lança', () => {
    expect(estimateDownbeat([], BPM, BEATS_PER_MEASURE).pickupBeats).toBe(0)
    expect(estimateDownbeat(melodyWithPickup(1), 0, BEATS_PER_MEASURE).pickupBeats).toBe(0)
    expect(estimateDownbeat(melodyWithPickup(1), BPM, 0).pickupBeats).toBe(0)
  })

  it('nunca devolve uma anacruse tão longa como o próprio compasso', () => {
    for (const pickup of [0, 1, 2, 3]) {
      const { pickupBeats } = estimateDownbeat(melodyWithPickup(pickup), BPM, BEATS_PER_MEASURE)
      expect(pickupBeats).toBeGreaterThanOrEqual(0)
      expect(pickupBeats).toBeLessThan(BEATS_PER_MEASURE)
    }
  })
})
