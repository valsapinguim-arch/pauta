import { describe, expect, it } from 'vitest'
import type { NoteEvent } from '@/lib/types'
import { mergeWindowedNotes } from './mergeWindowedNotes'
import { planWindows } from './planWindows'

const SAMPLE_RATE = 22_050
const MERGE_GAP_MS = 150

/** Simula o que um modelo real veria: uma nota só é visível a uma janela
 *  dentro de `[offsetSec, offsetSec + durationSec)` — o resto fica de fora
 *  (é isso que "cortar" uma nota na fronteira significa). Devolve `null`
 *  quando a nota não tem sobreposição nenhuma com a janela. */
function clipToWindow(
  note: NoteEvent,
  windowStartSec: number,
  windowEndSec: number,
): NoteEvent | null {
  const noteEnd = note.startSec + note.durationSec
  const clippedStart = Math.max(note.startSec, windowStartSec)
  const clippedEnd = Math.min(noteEnd, windowEndSec)
  if (clippedEnd <= clippedStart) return null

  return { ...note, startSec: clippedStart, durationSec: clippedEnd - clippedStart }
}

/** "Modelo falso" para o teste: em vez de correr o `BasicPitch` a sério,
 *  recorta as notas verdadeiras (`groundTruth`) ao intervalo de cada
 *  janela — exatamente a fragmentação que um modelo real produziria numa
 *  nota a meio de uma fronteira. */
function transcribeWindowed(groundTruth: NoteEvent[], totalSamples: number): NoteEvent[] {
  const windows = planWindows(totalSamples, SAMPLE_RATE, 10, 1)
  const perWindow = windows.map((window) => {
    const windowStartSec = window.startSample / SAMPLE_RATE
    const windowEndSec = window.endSample / SAMPLE_RATE
    return groundTruth
      .map((note) => clipToWindow(note, windowStartSec, windowEndSec))
      .filter((note): note is NoteEvent => note !== null)
  })
  return mergeWindowedNotes(perWindow, MERGE_GAP_MS)
}

describe('mergeWindowedNotes', () => {
  it('processamento por janelas reproduz o mesmo resultado que um só bloco quando não há fronteira nenhuma', () => {
    const totalSamples = 5 * SAMPLE_RATE // mais curto do que uma janela — planWindows devolve uma só
    const groundTruth: NoteEvent[] = [
      { pitchMidi: 60, startSec: 0.5, durationSec: 1, amplitude: 0.8 },
      { pitchMidi: 64, startSec: 2, durationSec: 1, amplitude: 0.7 },
    ]

    const result = transcribeWindowed(groundTruth, totalSamples)

    expect(result).toEqual(groundTruth)
  })

  it('uma nota cortada exatamente na fronteira entre duas janelas é reposta inteira depois da fusão', () => {
    // Janela de 10s com sobreposição de 1s → primeira janela cobre [0, 10)s.
    // Uma nota a atravessar os 10s fica fragmentada em duas janelas.
    const totalSamples = 25 * SAMPLE_RATE
    const spanningNote: NoteEvent = { pitchMidi: 67, startSec: 9.5, durationSec: 1, amplitude: 0.9 }
    const groundTruth: NoteEvent[] = [
      { pitchMidi: 60, startSec: 1, durationSec: 1, amplitude: 0.8 },
      spanningNote,
      { pitchMidi: 72, startSec: 20, durationSec: 1, amplitude: 0.6 },
    ]

    const result = transcribeWindowed(groundTruth, totalSamples)

    // A nota que atravessa a fronteira volta a ser uma só, com a duração
    // (ou mais, nunca menos) da original — nunca duas notas partidas.
    const matching = result.filter((note) => note.pitchMidi === 67)
    expect(matching).toHaveLength(1)
    expect(matching[0]?.startSec).toBeCloseTo(spanningNote.startSec, 1)
    expect(matching[0]?.durationSec).toBeGreaterThanOrEqual(spanningNote.durationSec - 0.01)

    // As notas longe de qualquer fronteira não mudam nada.
    expect(result.find((note) => note.pitchMidi === 60)).toEqual(groundTruth[0])
    expect(result.find((note) => note.pitchMidi === 72)).toEqual(groundTruth[2])
  })

  it('não introduz nem perde notas quando várias janelas estão envolvidas', () => {
    const totalSamples = 35 * SAMPLE_RATE
    const groundTruth: NoteEvent[] = [
      { pitchMidi: 60, startSec: 0.5, durationSec: 0.5, amplitude: 0.8 },
      { pitchMidi: 62, startSec: 5, durationSec: 0.5, amplitude: 0.8 },
      { pitchMidi: 64, startSec: 12, durationSec: 0.5, amplitude: 0.8 },
      { pitchMidi: 65, startSec: 19, durationSec: 0.5, amplitude: 0.8 },
      { pitchMidi: 67, startSec: 26, durationSec: 0.5, amplitude: 0.8 },
      { pitchMidi: 69, startSec: 33, durationSec: 0.5, amplitude: 0.8 },
    ]

    const result = transcribeWindowed(groundTruth, totalSamples)

    expect(result).toHaveLength(groundTruth.length)
    expect(result.map((note) => note.pitchMidi).sort()).toEqual(
      groundTruth.map((note) => note.pitchMidi).sort(),
    )
  })
})
