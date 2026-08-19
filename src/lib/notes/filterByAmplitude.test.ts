import { describe, expect, it } from 'vitest'
import type { NoteEvent } from '@/lib/types'
import { filterByAmplitude } from './filterByAmplitude'

function note(amplitude: number): NoteEvent {
  return { pitchMidi: 60, startSec: 0, durationSec: 0.3, amplitude }
}

describe('filterByAmplitude', () => {
  it('descarta notas abaixo da fração da mediana', () => {
    // mediana de [0.1, 0.5, 0.9] é 0.5; limiar 0.5 -> corte em 0.25
    const notes = [note(0.1), note(0.5), note(0.9)]
    const result = filterByAmplitude(notes, 0.5)
    expect(result.map((n) => n.amplitude)).toEqual([0.5, 0.9])
  })

  it('não elimina nada numa gravação forte (limiar relativo, não absoluto)', () => {
    const notes = [note(0.6), note(0.7), note(0.8)]
    const result = filterByAmplitude(notes, 0.25)
    expect(result).toHaveLength(3)
  })

  it('uma nota isolada muito forte não distorce o corte (mediana, não média)', () => {
    const notes = [note(0.1), note(0.12), note(0.11), note(1.0)]
    // mediana ~0.115, corte baixo — as três notas fracas mas plausíveis sobrevivem
    const result = filterByAmplitude(notes, 0.5)
    expect(result).toHaveLength(4)
  })

  it('devolve vazio para entrada vazia', () => {
    expect(filterByAmplitude([], 0.25)).toEqual([])
  })
})
