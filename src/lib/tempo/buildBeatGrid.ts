import type { BeatGrid, TempoMap } from '@/lib/types'

/**
 * Grelha de tempos e limites de compasso sobre a qual a Tarefa 10 trabalha —
 * Âmbito técnico da Tarefa 9. Construída por índice (não por acumulação em
 * ciclo) para não sofrer deriva de vírgula flutuante em peças longas.
 *
 * `durationSec` anterior a `tempoMap.firstBeatSec` devolve uma grelha vazia
 * — não há tempo nenhum dentro de uma duração negativa.
 */
export function buildBeatGrid(tempoMap: TempoMap, durationSec: number): BeatGrid {
  const beatPeriodSec = 60 / tempoMap.bpm
  const beatCount = Math.max(
    0,
    Math.floor((durationSec - tempoMap.firstBeatSec) / beatPeriodSec) + 1,
  )

  const beatsSec = Array.from(
    { length: beatCount },
    (_, index) => tempoMap.firstBeatSec + index * beatPeriodSec,
  )

  const beatsPerMeasure = tempoMap.timeSignature.numerator
  const measureBoundariesSec = beatsSec.filter((_, index) => index % beatsPerMeasure === 0)

  return { beatsSec, measureBoundariesSec }
}
