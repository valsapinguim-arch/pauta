import { describe, expect, it } from 'vitest'
import type { NoteEvent } from '@/lib/types'
import { computeConfidence } from './computeConfidence'

function note(durationSec: number, amplitude: number): NoteEvent {
  return { pitchMidi: 60, startSec: 0, durationSec, amplitude }
}

describe('computeConfidence', () => {
  it('devolve 0 para entrada original vazia, sem lançar', () => {
    expect(computeConfidence([], [])).toBe(0)
  })

  it('devolve um valor alto quando nada foi descartado e as notas são estáveis e fortes', () => {
    const notes = [note(0.3, 0.9), note(0.3, 0.85), note(0.3, 0.9)]
    const confidence = computeConfidence(notes, notes)
    expect(confidence).toBeGreaterThan(0.85)
  })

  it('penaliza descartar muitas notas', () => {
    const original = [note(0.3, 0.9), note(0.3, 0.9), note(0.3, 0.9), note(0.3, 0.9)]
    const cleaned = [note(0.3, 0.9)]
    const confidence = computeConfidence(original, cleaned)
    const keepAll = computeConfidence(original, original)
    expect(confidence).toBeLessThan(keepAll)
  })

  it('penaliza durações instáveis', () => {
    const stable = [note(0.3, 0.7), note(0.3, 0.7), note(0.3, 0.7)]
    const unstable = [note(0.05, 0.7), note(0.5, 0.7), note(0.9, 0.7)]
    expect(computeConfidence(stable, stable)).toBeGreaterThan(computeConfidence(unstable, unstable))
  })

  it('fica sempre em [0, 1]', () => {
    const notes = [note(0.3, 1)]
    const confidence = computeConfidence(notes, notes)
    expect(confidence).toBeGreaterThanOrEqual(0)
    expect(confidence).toBeLessThanOrEqual(1)
  })

  it('não lança quando tudo foi descartado', () => {
    const original = [note(0.3, 0.9)]
    expect(() => computeConfidence(original, [])).not.toThrow()
    expect(computeConfidence(original, [])).toBe(0)
  })
})
