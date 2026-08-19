import type { QuantizedNote } from '@/lib/types'

/**
 * Agrupa notas quantizadas por compasso — Âmbito técnico da Tarefa 12.
 * Simplificação deliberada face à assinatura original do plano
 * (`groupIntoMeasures(notes, measureTicks)`): `measureIndex` já vem
 * calculado pela Tarefa 10 (`padFinalMeasure`, `splitAcrossBarlines`) e é a
 * fonte de verdade — recalcular a partir de `measureTicks` seria duplicar
 * essa lógica e podia divergir dela. `measureTicks` continua a ser usado,
 * mas só em `validateScoreDocument`, que é onde a soma por compasso
 * realmente precisa de ser verificada (decisão 6).
 *
 * Índice do array de saída = `measureIndex` (0-based); quem chama
 * (`buildScoreDocument`) atribui `Measure.number` (1-based).
 */
export function groupIntoMeasures(notes: QuantizedNote[]): QuantizedNote[][] {
  if (notes.length === 0) return []

  const maxMeasureIndex = notes.reduce((max, note) => Math.max(max, note.measureIndex), 0)
  const measures: QuantizedNote[][] = Array.from({ length: maxMeasureIndex + 1 }, () => [])

  for (const note of notes) {
    ;(measures[note.measureIndex] as QuantizedNote[]).push(note)
  }

  return measures
}
