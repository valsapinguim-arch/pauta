import type { ScoreDocument } from '@/lib/types'
import { TEMPO } from './constants'

/**
 * Correção manual do BPM (decisão 6/7): recalcula só a partir do `TempoMap`
 * para a frente, sem repetir a inferência do modelo. Hoje isso significa só
 * substituir `tempo` no documento — a Tarefa 10 (quantização) e a Tarefa 12
 * (notação) ainda não existem, por isso ainda não há mais nada a jusante
 * para refazer; quando existirem, é aqui que esta função passa a
 * reconstruir `measures` a partir de `TempoMap` + `NoteEvent[]` guardados na
 * sessão (ver Tarefa 9, decisão 7).
 *
 * `bpm` vem de um controlo do utilizador, não de deteção — confiança em 1 e
 * `source: 'manual'` (decisão 6: o BPM nunca se apresenta como facto exceto
 * quando o próprio utilizador o afirma).
 */
export function applyManualBpm(document: ScoreDocument, bpm: number): ScoreDocument {
  const clampedBpm = Math.min(TEMPO.MANUAL_MAX_BPM, Math.max(TEMPO.MANUAL_MIN_BPM, Math.round(bpm)))

  return {
    ...document,
    tempo: { ...document.tempo, bpm: clampedBpm, confidence: 1, source: 'manual' },
    metadata: {
      ...document.metadata,
      confidence: { ...document.metadata.confidence, tempo: 1 },
    },
  }
}
