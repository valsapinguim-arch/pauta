import type { NoteEvent, TempoMap } from '@/lib/types'
import { computeTempoConfidence } from './computeTempoConfidence'
import { TEMPO } from './constants'
import { estimateBpm } from './estimateBpm'
import { estimateDownbeat } from './estimateDownbeat'
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
 * já limpo (Tarefa 8) e ordenado por início.
 *
 * O primeiro tempo forte já NÃO é sempre o primeiro onset: a decisão 8
 * ("sem anacruse") foi revista depois de se ver, com gravações reais, que
 * começar com uma nota de preparação desloca todas as barras de compasso. A
 * deteção vive em `estimateDownbeat` e só age com folga clara — sem isso
 * devolve o comportamento original. O receio da decisão 8 continua válido e
 * é ele que justifica o limiar conservador (ver `DOWNBEAT_MIN_CONFIDENCE`);
 * o caminho `assumed` abaixo nunca tenta detetar fase nenhuma, porque com um
 * BPM assumido a grelha não significa nada.
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
    firstBeatSec: firstBeatSecWithPickup(sorted, bpm),
    confidence,
    source: 'detected',
  }
}

/**
 * Origem da grelha, já a contar com uma eventual anacruse.
 *
 * `firstBeatSec` é a origem dos ticks (`@/lib/quantize/ticks`) e é dela que
 * sai toda a fase dos compassos. Com uma anacruse de `k` tempos, o primeiro
 * tempo forte não é a primeira nota — mas pô-lo DEPOIS dela daria ticks
 * negativos, que nada a jusante trata (o compasso `-1` faria
 * `validateMeasureSums` rebentar). Em vez disso recua-se a origem para o
 * início do compasso que contém a anacruse: a primeira nota passa a cair
 * num tick > 0, `fillRests` (Tarefa 10) preenche sozinho o que vem antes
 * dela com pausas, e todo o compasso continua a somar `MEASURE_TICKS`.
 *
 * A anacruse fica assim escrita como um primeiro compasso completo com
 * pausas à cabeça, em vez do compasso encurtado da convenção de gravura —
 * metricamente é a mesma coisa, e não exige compassos parciais em nenhum
 * dos consumidores (VexFlow, MusicXML, MIDI, reprodução).
 *
 * Os tempos de REPRODUÇÃO das notas não mudam: `scoreToEvents` calcula
 * `firstBeatSec + tick × segundosPorTick`, e recuar a origem em Δ faz o
 * tick de cada nota avançar exatamente Δ. Só o metrónomo se desloca — para
 * os tempos fortes certos, que é o objetivo.
 */
function firstBeatSecWithPickup(sorted: NoteEvent[], bpm: number): number {
  const firstOnsetSec = (sorted[0] as NoteEvent).startSec
  const { pickupBeats } = estimateDownbeat(sorted, bpm, TIME_SIGNATURE.numerator)
  if (pickupBeats === 0) return firstOnsetSec

  const beatsBeforeFirstNote = TIME_SIGNATURE.numerator - pickupBeats
  return firstOnsetSec - beatsBeforeFirstNote * (60 / bpm)
}
