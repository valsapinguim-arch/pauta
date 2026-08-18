import type { NoteEvent } from '@/lib/types'
import { TEMPO } from './constants'

/** Mesma duplicação deliberada de `clamp01` que já existe em
 *  `session.reducer.ts` e `@/lib/notes/statistics.ts` — um utilitário deste
 *  tamanho não justifica acoplar `@/lib/tempo` a outra pasta de `@/lib`. */
function clamp01(value: number): number {
  if (Number.isNaN(value)) return 0
  return Math.min(1, Math.max(0, value))
}

/**
 * Confiança em [0, 1] — decisão 5: "quantos onsets a grelha explica, quão
 * concentrado é o histograma". Aqui expressa como dois fatores multiplicados:
 *
 * - `alignmentRatio`: fração de onsets a menos de
 *   `TEMPO.GRID_ALIGNMENT_TOLERANCE` (fração do período do tempo) de um
 *   múltiplo inteiro do período — quanto a grelha resultante "explica" a
 *   entrada.
 * - `sufficiency`: penaliza contagens baixas mesmo quando o alinhamento é
 *   perfeito (`MIN_ONSETS_FOR_ESTIMATE` onsets alinhados por acaso não é
 *   evidência forte).
 */
export function computeTempoConfidence(notes: NoteEvent[], bpm: number): number {
  if (notes.length === 0 || bpm <= 0) return 0

  const beatPeriodSec = 60 / bpm
  const firstOnsetSec = (notes[0] as NoteEvent).startSec
  const toleranceSec = beatPeriodSec * TEMPO.GRID_ALIGNMENT_TOLERANCE

  let aligned = 0
  for (const note of notes) {
    const offsetSec = note.startSec - firstOnsetSec
    const nearestBeat = Math.round(offsetSec / beatPeriodSec)
    const distanceSec = Math.abs(offsetSec - nearestBeat * beatPeriodSec)
    if (distanceSec <= toleranceSec) aligned++
  }

  const alignmentRatio = aligned / notes.length
  const sufficiency = clamp01(notes.length / TEMPO.MIN_ONSETS_FOR_ESTIMATE)

  return clamp01(alignmentRatio * sufficiency)
}
