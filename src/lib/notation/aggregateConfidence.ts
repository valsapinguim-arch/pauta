import type { ConfidenceBreakdown } from '@/lib/types'

/**
 * Combina as três confianças do pipeline num agregado, mantendo os
 * detalhes — Tarefa 12, decisão 5: o agregado decide se se mostra o aviso
 * na `ResultView`, os detalhes dizem o que corrigir. Pesos iguais, mesma
 * postura da Tarefa 8 (`computeConfidence`): não há dados ainda para
 * justificar pesar uma fonte mais do que outra.
 */
export function aggregateConfidence(
  noteConfidence: number,
  tempoConfidence: number,
  keyConfidence: number,
): ConfidenceBreakdown {
  return {
    overall: (noteConfidence + tempoConfidence + keyConfidence) / 3,
    notes: noteConfidence,
    tempo: tempoConfidence,
    key: keyConfidence,
  }
}
