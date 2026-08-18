import { TICKS_PER_QUARTER } from '@/lib/types'
import type { TempoMap } from '@/lib/types'

/**
 * Conversão entre segundos (unidade da Tarefa 8/9) e ticks (unidade interna
 * de notação a partir daqui — Âmbito técnico da Tarefa 10). `tempoMap.bpm`
 * dá a taxa; `tempoMap.firstBeatSec` é a origem — o tick 0 é o primeiro
 * tempo forte, não o início absoluto da gravação.
 */
export function secondsToTicks(seconds: number, tempoMap: TempoMap): number {
  const ticksPerSecond = (tempoMap.bpm / 60) * TICKS_PER_QUARTER
  return Math.round((seconds - tempoMap.firstBeatSec) * ticksPerSecond)
}

export function ticksToSeconds(ticks: number, tempoMap: TempoMap): number {
  const ticksPerSecond = (tempoMap.bpm / 60) * TICKS_PER_QUARTER
  return ticks / ticksPerSecond + tempoMap.firstBeatSec
}
