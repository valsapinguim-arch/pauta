import type { NoteEvent } from '@/lib/types'
import { computeConfidence } from './computeConfidence'
import { NOTE_CLEANUP } from './constants'
import { filterByAmplitude } from './filterByAmplitude'
import { filterByDuration } from './filterByDuration'
import { mergeFragmented } from './mergeFragmented'
import { reduceToMonophonic } from './reduceToMonophonic'
import { removeHarmonics } from './removeHarmonics'
import { sortByOnset } from './sortByOnset'

export interface CleanNotesResult {
  notes: NoteEvent[]
  /** Ver `computeConfidence` — informativa, nunca usada para bloquear. */
  confidence: number
}

/**
 * Limpa a saída bruta do modelo (Tarefa 7) para uma única linha melódica
 * coerente — Tarefa 8. Ordem fixa (decisão 8), a mesma razão da Tarefa 6:
 * cada etapa assume a saída da anterior, e trocar a ordem produz um
 * resultado diferente e pior, não é uma otimização.
 *
 *   ordenar → fundir fragmentos → remover harmónicos → reduzir a monofonia
 *   → filtrar duração → filtrar amplitude → calcular confiança
 */
export function cleanNotes(notes: NoteEvent[]): CleanNotesResult {
  const sorted = sortByOnset(notes)
  const merged = mergeFragmented(sorted, NOTE_CLEANUP.MAX_FRAGMENT_GAP_MS)
  const withoutHarmonics = removeHarmonics(merged)
  const monophonic = reduceToMonophonic(withoutHarmonics)
  const longEnough = filterByDuration(monophonic, NOTE_CLEANUP.MIN_NOTE_DURATION_MS)
  const cleaned = filterByAmplitude(longEnough, NOTE_CLEANUP.MIN_RELATIVE_AMPLITUDE)

  if (import.meta.env.DEV) {
    // Ajuda a afinar `NOTE_CLEANUP` — ver Âmbito técnico da Tarefa 8.
    console.warn('[pauta] limpeza de notas', {
      original: notes.length,
      depoisDeFundir: merged.length,
      depoisDeHarmonicos: withoutHarmonics.length,
      depoisDeMonofonia: monophonic.length,
      depoisDeDuracao: longEnough.length,
      depoisDeAmplitude: cleaned.length,
    })
  }

  return { notes: cleaned, confidence: computeConfidence(notes, cleaned) }
}
