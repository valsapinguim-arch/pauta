import type { NoteEvent, TempoMap } from '@/lib/types'
import { computeTempoConfidence } from './computeTempoConfidence'
import { TEMPO } from './constants'
import { estimateBpm } from './estimateBpm'
import { interOnsetIntervals } from './interOnsetIntervals'
import { normalizeToRange } from './normalizeToRange'

/** Compasso assumido 4/4 sem tentar detetar (decisão 4). */
const TIME_SIGNATURE = { numerator: 4, denominator: 4 }

/** Caminho alternativo da decisão 5: BPM por omissão, `source: 'assumed'`,
 *  nunca lança mesmo com entrada vazia (decisão 5 e caso degenerado do
 *  Âmbito técnico — "lista com uma só nota"). */
function assumedTempoMap(sortedNotes: NoteEvent[]): TempoMap {
  return {
    bpm: TEMPO.DEFAULT_BPM,
    timeSignature: TIME_SIGNATURE,
    firstBeatSec: sortedNotes[0]?.startSec ?? 0,
    confidence: 0,
    source: 'assumed',
  }
}

/**
 * Encadeia a deteção de tempo — Tarefa 9, Âmbito técnico. `notes` tem de vir
 * já limpo (Tarefa 8) e ordenado por início; o primeiro tempo forte é o
 * primeiro onset que sobreviveu à limpeza, sem tentar detetar anacruse
 * (decisão 8).
 */
export function buildTempoMap(notes: NoteEvent[]): TempoMap {
  const sorted = [...notes].sort((a, b) => a.startSec - b.startSec)

  if (sorted.length < TEMPO.MIN_ONSETS_FOR_ESTIMATE) {
    return assumedTempoMap(sorted)
  }

  const intervals = interOnsetIntervals(sorted)
  const { bpm: rawBpm } = estimateBpm(intervals)
  if (rawBpm <= 0) {
    return assumedTempoMap(sorted)
  }

  const bpm = normalizeToRange(rawBpm, TEMPO.MIN_BPM, TEMPO.MAX_BPM)
  const confidence = computeTempoConfidence(sorted, bpm)

  if (confidence < TEMPO.MIN_CONFIDENCE) {
    return assumedTempoMap(sorted)
  }

  return {
    bpm,
    timeSignature: TIME_SIGNATURE,
    firstBeatSec: (sorted[0] as NoteEvent).startSec,
    confidence,
    source: 'detected',
  }
}
