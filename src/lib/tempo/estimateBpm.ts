import { TEMPO } from './constants'

export interface BpmEstimate {
  bpm: number
  /** Fração dos intervalos que caem na caixa vencedora do histograma, em
   *  [0, 1] — quão concentrada é a evidência à volta do candidato. */
  concentration: number
}

/**
 * Estimativa por histograma de inter-onset intervals (decisão 2): cada
 * intervalo cai numa caixa de `TEMPO.HISTOGRAM_BIN_SEC`, a caixa com mais
 * votos ganha, e o andamento candidato é `60 / período-da-caixa`.
 *
 * Sem candidato possível (sem intervalos, ou todos nulos) devolve `bpm: 0`
 * — quem chama (`buildTempoMap`) trata isso como "sem estimativa", não como
 * um andamento real.
 */
export function estimateBpm(intervals: number[]): BpmEstimate {
  if (intervals.length === 0) return { bpm: 0, concentration: 0 }

  const bins = new Map<number, number>()
  for (const interval of intervals) {
    if (interval <= 0) continue
    const bin = Math.round(interval / TEMPO.HISTOGRAM_BIN_SEC)
    bins.set(bin, (bins.get(bin) ?? 0) + 1)
  }

  if (bins.size === 0) return { bpm: 0, concentration: 0 }

  let peakBin = 0
  let peakCount = 0
  for (const [bin, count] of bins) {
    if (count > peakCount) {
      peakBin = bin
      peakCount = count
    }
  }

  const peakIntervalSec = peakBin * TEMPO.HISTOGRAM_BIN_SEC
  if (peakIntervalSec <= 0) return { bpm: 0, concentration: 0 }

  return {
    bpm: 60 / peakIntervalSec,
    concentration: peakCount / intervals.length,
  }
}
