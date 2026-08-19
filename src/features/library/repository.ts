import { migrateDocument, type MigrationResult } from '@/lib/migrations/migrateDocument'
import { validateScoreDocument } from '@/lib/notation/validateScoreDocument'
import type { ScoreDocument } from '@/lib/types'
import { withTimeout } from '@/lib/withTimeout'
import { QUOTA_WARNING_RATIO } from './constants'
import { openLibraryDb, TRANSCRIPTIONS_STORE, type StoredTranscription } from './db'

/** Tarefa 21, decisão 6 — a escrita em IndexedDB não deveria demorar mais do
 *  que uma fração de segundo; este limite existe para o caso "nunca mais
 *  responde" (ex.: outra aba a segurar uma transação aberta), não para
 *  discos lentos normais. */
const WRITE_TIMEOUT_MS = 10_000

/** Erro nomeado (mesmo espírito de `ScoreDocumentValidationError`, Tarefa
 *  12) — falha de escrita explícita, nunca silenciosa (decisão 8). `cause`
 *  guarda o erro original do IndexedDB (ex.: `QuotaExceededError`) para
 *  quem quiser inspecioná-lo, sem obrigar quem só quer mostrar um aviso a
 *  fazê-lo. */
export class LibrarySaveError extends Error {
  constructor(message: string, cause?: unknown) {
    super(message, cause === undefined ? undefined : { cause })
    this.name = 'LibrarySaveError'
  }
}

export interface LibraryEntry {
  id: string
  createdAt: string
  result: MigrationResult
}

export interface SaveResult {
  id: string
  /** Perto do limite de armazenamento ANTES desta escrita (decisão 8) — a
   *  escrita em si já aconteceu quando isto chega a quem chamou; é um
   *  aviso para a próxima, não uma indicação de que esta falhou. */
  quotaWarning: boolean
}

function toEntry(record: StoredTranscription): LibraryEntry {
  return {
    id: record.id,
    createdAt: record.createdAt,
    result: migrateDocument(record.document, record.schemaVersion),
  }
}

/** `navigator.storage.estimate()` nem sempre existe (Safari mais antigo) —
 *  sem ele, não há como avisar, e a decisão 8 não é motivo para bloquear a
 *  escrita: falha a favor de guardar. */
async function isNearQuota(): Promise<boolean> {
  if (!navigator.storage?.estimate) return false
  const { usage, quota } = await navigator.storage.estimate()
  if (!usage || !quota) return false
  return usage / quota >= QUOTA_WARNING_RATIO
}

/** Pedida uma vez, depois da primeira transcrição guardada com sucesso
 *  (decisão 9) — `count() === 1` logo a seguir a uma escrita é exatamente
 *  esse momento, sem precisar de uma bandeira à parte guardada nalgum
 *  lado. Nunca se depende do resultado: uma promessa recusada ou um
 *  `persist` inexistente ficam calados de propósito, o aviso da decisão 10
 *  continua a valer de qualquer forma. */
async function requestPersistenceOnce(): Promise<void> {
  if (typeof navigator.storage?.persist !== 'function') return
  try {
    await navigator.storage.persist()
  } catch {
    // Sem consequência — ver decisão 9.
  }
}

/**
 * Grava uma transcrição nova (decisão 5: chamado assim que o documento fica
 * pronto, sem o utilizador pedir). Valida com `validateScoreDocument`
 * antes de tocar no IndexedDB — nunca persistir um documento inválido
 * (Notas/Dependências da Tarefa 16); a validação lança
 * `ScoreDocumentValidationError`, que sobe tal e qual a quem chamou.
 */
export async function save(document: ScoreDocument): Promise<SaveResult> {
  validateScoreDocument(document)

  const quotaWarning = await isNearQuota()
  const id = crypto.randomUUID()
  const record: StoredTranscription = {
    id,
    createdAt: document.metadata.createdAt,
    schemaVersion: document.metadata.schemaVersion,
    document,
  }

  try {
    const db = await openLibraryDb()
    await withTimeout(db.add(TRANSCRIPTIONS_STORE, record), WRITE_TIMEOUT_MS, 'guardar transcrição')
  } catch (error) {
    throw new LibrarySaveError('Não foi possível guardar a transcrição', error)
  }

  if ((await count()) === 1) void requestPersistenceOnce()

  return { id, quotaWarning }
}

/**
 * Atualiza um registo existente (decisão 6: correções e edições, não uma
 * transcrição nova). `createdAt` do registo mantém-se — só `document` e
 * `schemaVersion` mudam; a data de gravação original é a que ordena a
 * lista, não a da última edição.
 */
export async function update(id: string, document: ScoreDocument): Promise<void> {
  validateScoreDocument(document)

  const db = await openLibraryDb()
  const existing = await db.get(TRANSCRIPTIONS_STORE, id)
  if (!existing) {
    throw new LibrarySaveError(`Registo "${id}" não encontrado`)
  }

  const record: StoredTranscription = {
    ...existing,
    schemaVersion: document.metadata.schemaVersion,
    document,
  }

  try {
    await withTimeout(
      db.put(TRANSCRIPTIONS_STORE, record),
      WRITE_TIMEOUT_MS,
      'atualizar transcrição',
    )
  } catch (error) {
    throw new LibrarySaveError('Não foi possível guardar as alterações', error)
  }
}

/** Ordenada por data descendente (decisão 3) — é a única ordenação que
 *  interessa numa lista de gravações. */
export async function list(): Promise<LibraryEntry[]> {
  const db = await openLibraryDb()
  const records = await db.getAllFromIndex(TRANSCRIPTIONS_STORE, 'createdAt')
  return records.map(toEntry).reverse()
}

export async function get(id: string): Promise<LibraryEntry | undefined> {
  const db = await openLibraryDb()
  const record = await db.get(TRANSCRIPTIONS_STORE, id)
  return record ? toEntry(record) : undefined
}

export async function remove(id: string): Promise<void> {
  const db = await openLibraryDb()
  await db.delete(TRANSCRIPTIONS_STORE, id)
}

export async function count(): Promise<number> {
  const db = await openLibraryDb()
  return db.count(TRANSCRIPTIONS_STORE)
}
