import { describe, expect, it } from 'vitest'
import type { NoteEvent } from '@/lib/types'
import { removeHarmonics } from './removeHarmonics'

function note(pitchMidi: number, startSec: number, amplitude: number): NoteEvent {
  return { pitchMidi, startSec, durationSec: 0.3, amplitude }
}

describe('removeHarmonics', () => {
  it('remove um harmónico de oitava e mantém a fundamental', () => {
    const fundamental = note(60, 0, 0.8)
    const octaveHarmonic = note(72, 0.005, 0.3)
    const result = removeHarmonics([fundamental, octaveHarmonic])

    expect(result).toEqual([fundamental])
  })

  it('remove um harmónico de duodécima (19 semitons)', () => {
    const fundamental = note(48, 0, 0.8)
    const twelfthHarmonic = note(67, 0, 0.3)
    const result = removeHarmonics([fundamental, twelfthHarmonic])

    expect(result).toEqual([fundamental])
  })

  it('mantém as duas notas se o intervalo não for harmónico (ex.: quinta)', () => {
    const notes = [note(60, 0, 0.8), note(67, 0, 0.3)]
    expect(removeHarmonics(notes)).toEqual(notes)
  })

  it('mantém as duas notas se o início estiver longe demais', () => {
    const notes = [note(60, 0, 0.8), note(72, 0.5, 0.3)]
    expect(removeHarmonics(notes)).toEqual(notes)
  })

  it('mantém as duas notas se a mais aguda não for suficientemente mais fraca', () => {
    const notes = [note(60, 0, 0.5), note(72, 0, 0.45)]
    expect(removeHarmonics(notes)).toEqual(notes)
  })

  it('devolve vazio para entrada vazia', () => {
    expect(removeHarmonics([])).toEqual([])
  })
})
