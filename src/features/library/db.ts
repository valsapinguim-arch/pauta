import { openDB, type DBSchema, type IDBPDatabase } from 'idb'

/** Nome e versão da base de dados IndexedDB (Tarefa 16, decisões 1-3). Subir
 *  `DB_VERSION` e escrever o `upgrade` correspondente é sobre a FORMA da
 *  base de dados (índices, _object stores_) — não confundir com
 *  `SCHEMA_VERSION` em `@/lib/types`, que é sobre a forma do `ScoreDocument`
 *  guardado dentro de cada registo e vive nas migrações (`@/lib/migrations`). */
const DB_NAME = 'pauta-library'
const DB_VERSION = 1

export const TRANSCRIPTIONS_STORE = 'transcriptions'

/**
 * Registo guardado — não é o `ScoreDocument` diretamente (decisão 7). `id`
 * e `createdAt` vivem fora dele porque têm de sobreviver a um registo
 * ilegível (`schemaVersion` de uma versão futura da app): não se pode
 * confiar no formato interno de `document` nesse caso, mas a lista ainda
 * precisa de uma data para ordenar e de um `id` para eliminar. `createdAt`
 * é escrito uma vez, ao gravar (decisão 5) — não muda com as edições
 * (decisão 6), a lista ordena-se por quando foi transcrito, não por quando
 * foi editado pela última vez.
 */
export interface StoredTranscription {
  id: string
  createdAt: string
  schemaVersion: number
  document: unknown
}

interface PautaLibraryDb extends DBSchema {
  [TRANSCRIPTIONS_STORE]: {
    key: string
    value: StoredTranscription
    indexes: { createdAt: string }
  }
}

let dbPromise: Promise<IDBPDatabase<PautaLibraryDb>> | null = null

/**
 * Abertura da base de dados — único ponto de contacto com `idb` (decisão 2 e
 * guardrail em `AGENTS.md`: todo o acesso passa por `repository.ts`, e este
 * módulo é o único que `repository.ts` importa). `dbPromise` guarda a
 * mesma ligação entre chamadas: abrir de novo a cada operação seria
 * desperdício e `idb`/IndexedDB já suportam ligações concorrentes na mesma
 * página sem isso.
 */
export function openLibraryDb(): Promise<IDBPDatabase<PautaLibraryDb>> {
  dbPromise ??= openDB<PautaLibraryDb>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      const store = db.createObjectStore(TRANSCRIPTIONS_STORE, { keyPath: 'id' })
      store.createIndex('createdAt', 'createdAt')
    },
  })
  return dbPromise
}
