import { NOTE_DURATIONS } from '@/lib/quantize/noteDurations'
import { QUANTIZE } from '@/lib/quantize/constants'
import type { NotationElement, ScoreDocument, TieRole } from '@/lib/types'
import { TICKS_PER_QUARTER } from '@/lib/types'
import { midiToFrequency } from './midiToFrequency'

/** `${noteType}-${dots}` → ticks, construída a partir da tabela canónica de
 *  `@/lib/quantize/noteDurations` — não duplica os valores, só os indexa de
 *  outra forma (por figura, não por proximidade de duração). */
const TICKS_BY_FIGURE = new Map(
  NOTE_DURATIONS.map((duration) => [`${duration.noteType}-${duration.dots}`, duration.ticks]),
)

function ticksForElement(element: NotationElement): number {
  const ticks = TICKS_BY_FIGURE.get(`${element.noteType}-${element.dots}`)
  if (ticks === undefined) {
    throw new Error(`Figura desconhecida: ${element.noteType} com ${element.dots} ponto(s)`)
  }
  return ticks
}

/**
 * Um evento de reprodução por `NotationNote` (Tarefa 14, Âmbito técnico) —
 * pausas não geram evento, mas contam para a posição das notas seguintes.
 * `tie`/`sourceIndex` replicam os campos homónimos de `NotationNote`: são o
 * que `mergeTiedNotes` precisa para saber quais eventos fundir, sem ter de
 * voltar a percorrer o `ScoreDocument`.
 */
export interface PlaybackEvent {
  frequencyHz: number
  startSec: number
  durationSec: number
  measureIndex: number
  elementIndex: number
  tie: TieRole
  sourceIndex: number | null
}

/**
 * `ScoreDocument` → eventos de reprodução, já com a `speed` aplicada
 * (decisão 6 da Tarefa 14: multiplica as durações agendadas, nunca as
 * frequências). Não funde notas ligadas — isso é `mergeTiedNotes`, chamada à
 * parte por quem agenda o som.
 */
export function scoreToEvents(scoreDocument: ScoreDocument, speed: number): PlaybackEvent[] {
  const { tempo, measures } = scoreDocument
  const secondsPerTick = 60 / tempo.bpm / TICKS_PER_QUARTER
  const events: PlaybackEvent[] = []

  measures.forEach((measure, measureIndex) => {
    let ticksWithinMeasure = 0

    measure.elements.forEach((element, elementIndex) => {
      const ticks = ticksForElement(element)

      if (element.kind === 'note') {
        const startTick = measureIndex * QUANTIZE.MEASURE_TICKS + ticksWithinMeasure
        events.push({
          frequencyHz: midiToFrequency(element.pitchMidi),
          startSec: (tempo.firstBeatSec + startTick * secondsPerTick) / speed,
          durationSec: (ticks * secondsPerTick) / speed,
          measureIndex,
          elementIndex,
          tie: element.tie,
          sourceIndex: element.sourceIndex,
        })
      }

      ticksWithinMeasure += ticks
    })
  })

  return events
}
