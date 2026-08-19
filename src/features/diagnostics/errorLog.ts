import { ERROR_LOG_STORE, openDiagnosticsDb, type ErrorLogEntry } from './db'

export type { ErrorLogEntry }

/** Últimas ~50 entradas (Tarefa 21, decisão 4) — substituto dos logs de
 *  servidor que esta app não tem. Anel de tamanho fixo: nunca cresce sem
 *  limite. */
export const ERROR_LOG_LIMIT = 50

/**
 * Regista uma entrada no anel, apagando a mais antiga se já estiver no
 * limite. Nunca lança: um erro a registar um erro não pode, por sua vez,
 * quebrar o fluxo que estava a falhar — falha silenciosamente para
 * `console.error`, que é o único registo que sobra se o próprio IndexedDB
 * estiver indisponível.
 */
export async function logError(entry: Omit<ErrorLogEntry, 'sequence'>): Promise<void> {
  try {
    const db = await openDiagnosticsDb()
    await db.add(ERROR_LOG_STORE, entry)

    const count = await db.count(ERROR_LOG_STORE)
    if (count > ERROR_LOG_LIMIT) {
      const cursor = await db.transaction(ERROR_LOG_STORE, 'readwrite').store.openCursor()
      if (cursor) await cursor.delete()
    }
  } catch (error) {
    console.error('[pauta] não foi possível escrever no registo de diagnóstico', error, entry)
  }
}

/** Mais recente primeiro — é o que interessa ver primeiro num ecrã de
 *  diagnóstico. */
export async function listErrorLog(): Promise<ErrorLogEntry[]> {
  const db = await openDiagnosticsDb()
  const entries = await db.getAll(ERROR_LOG_STORE)
  return entries.reverse()
}

export async function clearErrorLog(): Promise<void> {
  const db = await openDiagnosticsDb()
  await db.clear(ERROR_LOG_STORE)
}

/** Formato de texto simples para copiar/exportar (Âmbito técnico) — legível
 *  sem ferramenta nenhuma, para colar num relatório de problema. */
export function formatErrorLogAsText(entries: ErrorLogEntry[]): string {
  if (entries.length === 0) return 'Sem erros registados.'
  return entries
    .map(
      (entry) =>
        `[${entry.occurredAt}] ${entry.code} (${entry.context})\n${entry.technicalDetails}`,
    )
    .join('\n\n')
}
