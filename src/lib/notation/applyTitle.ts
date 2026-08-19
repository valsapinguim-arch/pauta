import type { ScoreDocument } from '@/lib/types'

/**
 * Edição do título — Âmbito técnico da Tarefa 12. Ao contrário do BPM
 * (Tarefa 9) e da tonalidade (Tarefa 11), não há nada a recalcular a
 * jusante: o título não entra em nenhum outro cálculo do pipeline.
 *
 * Um título em branco é rejeitado (devolve o documento original, sem
 * alteração) em vez de cair para um título gerado — `metadata.title` nunca
 * é vazio (decisão 4), e substituir silenciosamente pelo título antigo é
 * menos surpreendente do que substituir pelo título por omissão que o
 * utilizador já tinha rejeitado ao editar.
 */
export function applyTitle(document: ScoreDocument, title: string): ScoreDocument {
  const trimmed = title.trim()
  if (trimmed === '') return document

  return { ...document, metadata: { ...document.metadata, title: trimmed } }
}
