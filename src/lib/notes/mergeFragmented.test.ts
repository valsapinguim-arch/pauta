import { describe, expect, it } from 'vitest'
import type { NoteEvent } from '@/lib/types'
import { mergeFragmented } from './mergeFragmented'

function note(
  pitchMidi: number,
  startSec: number,
  durationSec: number,
  amplitude = 0.5,
): NoteEvent {
  return { pitchMidi, startSec, durationSec, amplitude }
}

describe('mergeFragmented', () => {
  it('funde três fragmentos da mesma altura numa só nota', () => {
    const notes = [note(60, 0, 0.2, 0.4), note(60, 0.21, 0.2, 0.6), note(60, 0.42, 0.2, 0.3)]
    const result = mergeFragmented(notes, 50)

    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({ pitchMidi: 60, startSec: 0 })
    expect(result[0]?.durationSec).toBeCloseTo(0.62, 5)
    expect(result[0]?.amplitude).toBe(0.6)
  })

  it('não funde alturas diferentes, mesmo sem intervalo', () => {
    const notes = [note(60, 0, 0.2), note(64, 0.2, 0.2)]
    expect(mergeFragmented(notes, 50)).toHaveLength(2)
  })

  it('não funde a mesma altura separada por um intervalo grande', () => {
    const notes = [note(60, 0, 0.2), note(60, 1, 0.2)]
    expect(mergeFragmented(notes, 50)).toHaveLength(2)
  })

  it('funde notas sobrepostas da mesma altura', () => {
    const notes = [note(60, 0, 0.3), note(60, 0.2, 0.3)]
    const result = mergeFragmented(notes, 50)
    expect(result).toHaveLength(1)
    expect(result[0]?.durationSec).toBeCloseTo(0.5, 5)
  })

  it('devolve vazio para entrada vazia', () => {
    expect(mergeFragmented([], 50)).toEqual([])
  })

  it('devolve a mesma nota para uma entrada de um só elemento', () => {
    const notes = [note(60, 0, 0.2)]
    expect(mergeFragmented(notes, 50)).toEqual(notes)
  })
})
