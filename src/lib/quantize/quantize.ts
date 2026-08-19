import type { NoteEvent, QuantizedNote, TempoMap } from '@/lib/types'
import { QUANTIZE } from './constants'
import { fillRests } from './fillRests'
import { nearestNoteDuration } from './noteDurations'
import { padFinalMeasure } from './padFinalMeasure'
import { resolveOverlaps } from './resolveOverlaps'
import { snapOnset } from './snapOnset'
import { splitAcrossBarlines } from './splitAcrossBarlines'
import { secondsToTicks } from './ticks'
import type { WorkingNote } from './workingNote'

export interface QuantizeResult {
  notes: QuantizedNote[]
  /** Em [0, 1] — quanto os onsets originais se afastaram da grelha (decisão
   *  2). Só informativa, como `confidence` da Tarefa 8: nunca bloqueia o
   *  pipeline. Baixa quase sempre significa BPM errado (Tarefa 9), não um
   *  problema desta etapa — ver Notas da Tarefa 10. */
  rhythmConfidence: number
}

/** Metade da subdivisão mínima: o desvio máximo "razoável" antes de se
 *  considerar que a grelha está a forçar bastante (decisão 2). Usado só
 *  para normalizar `rhythmConfidence`, não para decidir nada no encadeamento
 *  em si — `snapOnset` já aceita qualquer desvio. */
const MAX_REASONABLE_DEVIATION_TICKS = QUANTIZE.MIN_SUBDIVISION_TICKS / 2

function clamp01(value: number): number {
  if (Number.isNaN(value)) return 0
  return Math.min(1, Math.max(0, value))
}

/**
 * Encadeia a quantização rítmica — Tarefa 10, Âmbito técnico:
 *
 *   snap dos inícios → escolher figura por duração real → resolver
 *   sobreposições → dividir e ligar sobre barras → preencher pausas
 *   → completar o último compasso → validar
 *
 * `notes` tem de vir já limpo (Tarefa 8); `tempoMap` vem da Tarefa 9. A
 * ordem não é opcional — ver decisão 3 (início e duração quantizados
 * independentemente) e a nota da Tarefa 8 sobre a ordem fixa de `cleanNotes`
 * ser a mesma ideia.
 */
export function quantize(notes: NoteEvent[], tempoMap: TempoMap): QuantizeResult {
  if (notes.length === 0) return { notes: [], rhythmConfidence: 0 }

  const sorted = [...notes].sort((a, b) => a.startSec - b.startSec)

  let totalDeviationRatio = 0
  const draft: WorkingNote[] = sorted.map((note, sourceIndex) => {
    const rawStartTick = secondsToTicks(note.startSec, tempoMap)
    const rawEndTick = secondsToTicks(note.startSec + note.durationSec, tempoMap)
    const { tick: startTick, deviationTicks } = snapOnset(
      rawStartTick,
      QUANTIZE.MIN_SUBDIVISION_TICKS,
    )
    totalDeviationRatio += clamp01(deviationTicks / MAX_REASONABLE_DEVIATION_TICKS)

    const { noteType, dots, ticks } = nearestNoteDuration(rawEndTick - rawStartTick)

    return {
      pitchMidi: note.pitchMidi,
      startTick,
      durationTicks: ticks,
      noteType,
      dots,
      isRest: false,
      tiedToNext: false,
      tiedFromPrevious: false,
      sourceIndex,
    }
  })

  const resolved = resolveOverlaps(draft)
  const split = splitAcrossBarlines(resolved, QUANTIZE.MEASURE_TICKS)
  const filled = fillRests(split, QUANTIZE.MEASURE_TICKS)
  const padded = padFinalMeasure(filled, QUANTIZE.MEASURE_TICKS)

  const withMeasures = padded.map((note) => ({
    ...note,
    measureIndex: Math.floor(note.startTick / QUANTIZE.MEASURE_TICKS),
  }))

  validateMeasureSums(withMeasures)

  const rhythmConfidence = clamp01(1 - totalDeviationRatio / sorted.length)

  return { notes: withMeasures, rhythmConfidence }
}

/** Rede de segurança da decisão 8 — Notas da Tarefa 10: "a validação da soma
 *  de compassos é a única rede de segurança automática, não a tratar como
 *  opcional". Falha explicitamente; nunca produzir silenciosamente um
 *  `ScoreDocument` com um compasso incompleto ou a mais. */
function validateMeasureSums(notes: QuantizedNote[]): void {
  const sums = new Map<number, number>()
  for (const note of notes) {
    sums.set(note.measureIndex, (sums.get(note.measureIndex) ?? 0) + note.durationTicks)
  }

  for (const [measureIndex, sum] of sums) {
    if (sum !== QUANTIZE.MEASURE_TICKS) {
      throw new Error(
        `[quantize] compasso ${measureIndex} soma ${sum} ticks, esperado ${QUANTIZE.MEASURE_TICKS}`,
      )
    }
  }
}
