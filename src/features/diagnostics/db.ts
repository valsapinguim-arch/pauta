import { openDB, type DBSchema, type IDBPDatabase } from 'idb'

/**
 * Base de dados própria para o diagnóstico (Tarefa 21, decisão 4) — separada
 * de `pauta-library` (Tarefa 16) de propósito: o registo de erros nunca deve
 * competir com as transcrições pela quota de armazenamento, e mantê-las em
 * bases de dados diferentes torna essa garantia óbvia por construção, sem
 * depender de disciplina ao escrever consultas.
 */
const DB_NAME = 'pauta-diagnostics'
const DB_VERSION = 1

export const ERROR_LOG_STORE = 'errorLog'

/** Uma entrada do registo em anel. `sequence` é a chave — um número
 *  sempre crescente, não `createdAt`: duas entradas no mesmo milissegundo
 *  (worker e thread principal a falhar quase ao mesmo tempo) não podem
 *  colidir nem ficar fora de ordem. */
export interface ErrorLogEntry {
  sequence?: number
  code: string
  occurredAt: string
  /** Onde na app o erro aconteceu — ex.: nome do hook ou worker. Só para
   *  diagnóstico, nunca mostrado sem contexto ao utilizador. */
  context: string
  /** Mensagem técnica original e, quando existir, o _stack trace_ — nunca
   *  aparecem na interface (Tarefa 21, decisão 3), só aqui. */
  technicalDetails: string
}

interface PautaDiagnosticsDb extends DBSchema {
  [ERROR_LOG_STORE]: {
    key: number
    value: ErrorLogEntry
  }
}

let dbPromise: Promise<IDBPDatabase<PautaDiagnosticsDb>> | null = null

export function openDiagnosticsDb(): Promise<IDBPDatabase<PautaDiagnosticsDb>> {
  dbPromise ??= openDB<PautaDiagnosticsDb>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      db.createObjectStore(ERROR_LOG_STORE, { keyPath: 'sequence', autoIncrement: true })
    },
  })
  return dbPromise
}
