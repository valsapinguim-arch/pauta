import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { NoteEvent } from '@/lib/types'
import { cleanNotes } from './cleanNotes'

function note(
  pitchMidi: number,
  startSec: number,
  durationSec: number,
  amplitude = 0.7,
): NoteEvent {
  return { pitchMidi, startSec, durationSec, amplitude }
}

describe('cleanNotes', () => {
  beforeEach(() => {
    // A limpeza avisa em DEV com as contagens por etapa (Âmbito técnico da
    // Tarefa 8) — testado à parte; aqui só se silencia o ruído.
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('uma escala monofónica limpa passa intacta', () => {
    const scale = [
      note(60, 0, 0.3),
      note(62, 0.3, 0.3),
      note(64, 0.6, 0.3),
      note(65, 0.9, 0.3),
      note(67, 1.2, 0.3),
    ]
    const result = cleanNotes(scale)

    expect(result.notes).toEqual(scale)
    expect(result.confidence).toBeGreaterThan(0.5)
  })

  it('nota com harmónico de oitava perde o harmónico e mantém a fundamental', () => {
    const fundamental = note(60, 0, 0.5, 0.9)
    const octaveHarmonic = note(72, 0.005, 0.5, 0.3)
    const result = cleanNotes([fundamental, octaveHarmonic])

    expect(result.notes).toEqual([fundamental])
  })

  it('acorde de três notas reduz-se à mais aguda', () => {
    const chord = [note(60, 0, 0.3), note(64, 0, 0.3), note(67, 0, 0.3)]
    const result = cleanNotes(chord)

    expect(result.notes).toEqual([note(67, 0, 0.3)])
  })

  it('nota partida em três fragmentos volta a ser uma', () => {
    const fragments = [note(60, 0, 0.2), note(60, 0.21, 0.2), note(60, 0.42, 0.2)]
    const result = cleanNotes(fragments)

    expect(result.notes).toHaveLength(1)
    expect(result.notes[0]).toMatchObject({ pitchMidi: 60, startSec: 0 })
    expect(result.notes[0]?.durationSec).toBeCloseTo(0.62, 5)
  })

  it('um transiente de 20 ms desaparece', () => {
    const melody = [note(60, 0, 0.3), note(64, 0.5, 0.02), note(67, 1, 0.3)]
    const result = cleanNotes(melody)

    expect(result.notes.map((n) => n.pitchMidi)).toEqual([60, 67])
  })

  it('entrada vazia devolve vazio e confiança 0, sem lançar', () => {
    expect(() => cleanNotes([])).not.toThrow()
    expect(cleanNotes([])).toEqual({ notes: [], confidence: 0 })
  })
})
