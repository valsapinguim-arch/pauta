import { describe, expect, it } from 'vitest'
import { resolveOverlaps } from './resolveOverlaps'
import type { WorkingNote } from './workingNote'

function note(
  startTick: number,
  durationTicks: number,
  noteType: WorkingNote['noteType'],
): WorkingNote {
  return {
    pitchMidi: 60,
    startTick,
    durationTicks,
    noteType,
    dots: 0,
    isRest: false,
    tiedToNext: false,
    tiedFromPrevious: false,
    sourceIndex: 0,
  }
}

describe('resolveOverlaps', () => {
  it('não altera notas que não se sobrepõem', () => {
    const notes = [note(0, 480, 'quarter'), note(480, 480, 'quarter')]
    expect(resolveOverlaps(notes)).toEqual(notes)
  })

  it('encurta a nota anterior quando invade a seguinte, nunca desloca a seguinte', () => {
    const notes = [note(0, 960, 'half'), note(480, 480, 'quarter')]
    const result = resolveOverlaps(notes)
    expect(result[0]).toMatchObject({ startTick: 0, durationTicks: 480, noteType: 'quarter' })
    expect(result[1]).toEqual(notes[1])
  })

  it('o encurtamento é sempre uma figura válida da tabela, não um corte arbitrário', () => {
    // gap de 300 ticks: nem meia nem semínima cabem — maior figura válida é a corchea com ponto (360>300 não cabe), corchea (240) cabe
    const notes = [note(0, 960, 'half'), note(300, 480, 'quarter')]
    const result = resolveOverlaps(notes)
    expect(result[0]).toMatchObject({ durationTicks: 240, noteType: 'eighth', dots: 0 })
  })

  it('não muta a entrada', () => {
    const notes = [note(0, 960, 'half'), note(480, 480, 'quarter')]
    const snapshot = structuredClone(notes)
    resolveOverlaps(notes)
    expect(notes).toEqual(snapshot)
  })

  it('lista vazia ou de uma nota não faz nada', () => {
    expect(resolveOverlaps([])).toEqual([])
    const single = [note(0, 480, 'quarter')]
    expect(resolveOverlaps(single)).toEqual(single)
  })
})
