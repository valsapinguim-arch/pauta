import type { NoteEvent } from '@/lib/types'
import { clamp01, median } from './statistics'

/** `< 2` notas não dão evidência nenhuma de instabilidade — não penalizar
 *  por falta de dados. */
function durationStability(notes: NoteEvent[]): number {
  if (notes.length < 2) return 1

  const durations = notes.map((note) => note.durationSec)
  const mean = durations.reduce((sum, d) => sum + d, 0) / durations.length
  if (mean === 0) return 0

  const variance = durations.reduce((sum, d) => sum + (d - mean) ** 2, 0) / durations.length
  const coefficientOfVariation = Math.sqrt(variance) / mean

  return clamp01(1 - coefficientOfVariation)
}

/**
 * Confiança em [0, 1] — Tarefa 8, decisão 7. Média de três sinais, cada um
 * já em [0, 1]: a proporção de notas mantidas depois da limpeza, a
 * estabilidade das durações (desvio padrão sobre a média, invertido — menos
 * variação, mais confiança) e a amplitude mediana das notas finais. Pesos
 * iguais de propósito: não há dados ainda para justificar pesar um sinal
 * mais do que outro — afinar junto com `NOTE_CLEANUP` depois da Tarefa 13.
 *
 * Só informativa (decisão 7): nunca bloqueia nem impede o pipeline de
 * continuar, seja qual for o valor.
 */
export function computeConfidence(original: NoteEvent[], cleaned: NoteEvent[]): number {
  if (original.length === 0) return 0
  // Nada sobreviveu à limpeza: sem notas nenhumas não há melodia nenhuma
  // para ter confiança — diferente de `durationStability` com < 2 notas
  // (essa é "sem provas de instabilidade", não "sem nada").
  if (cleaned.length === 0) return 0

  const retention = cleaned.length / original.length
  const stability = durationStability(cleaned)
  const medianAmplitude = median(cleaned.map((note) => note.amplitude))

  return clamp01((retention + stability + medianAmplitude) / 3)
}
