import { SCHEMA_VERSION, type ScoreDocument } from '@/lib/types'

/** Uma migração recebe o documento na versão anterior (forma não tipável em
 *  concreto — é justamente a versão que já deixou de existir em
 *  `ScoreDocument`) e devolve a versão seguinte. `unknown` dos dois lados
 *  em vez de `any`: cada migração concreta faz o seu próprio narrowing ao
 *  ser escrita (Tarefa 16, Âmbito técnico). */
type Migration = (raw: unknown) => unknown

/** Uma entrada por versão de origem — `MIGRATIONS[1]` leva de `schemaVersion`
 *  1 para 2, etc. Vazio até `SCHEMA_VERSION` subir pela primeira vez: hoje
 *  só existe a versão 1, não há de onde migrar. Acrescentar uma entrada
 *  aqui é obrigatório na mesma alteração de código que incrementa
 *  `SCHEMA_VERSION` em `@/lib/types` (ver `AGENTS.md`). */
const MIGRATIONS: Record<number, Migration> = {}

export interface LegibleDocument {
  legible: true
  document: ScoreDocument
}

export interface IllegibleDocument {
  legible: false
}

export type MigrationResult = LegibleDocument | IllegibleDocument

/**
 * Traz um documento persistido (Tarefa 16, decisão 7) para `SCHEMA_VERSION`
 * atual. Pura — não lê nem escreve o IndexedDB, só transforma dados; quem
 * chama (`@/features/library/repository`) é que decide onde o resultado
 * vai parar.
 *
 * `schemaVersion` superior à atual (ficheiro de uma versão mais recente da
 * app, ex.: depois de um _rollback_) devolve `legible: false` em vez de
 * lançar — um registo ilegível nunca deve impedir a lista de carregar
 * (decisão 7, guardrail em `AGENTS.md`). `schemaVersion` inferior percorre
 * as migrações em cadeia; se faltar alguma no meio, também `legible: false`
 * em vez de lançar a meio — mais uma vez, um registo por explicar não pode
 * derrubar os outros.
 */
export function migrateDocument(raw: unknown, schemaVersion: number): MigrationResult {
  if (schemaVersion > SCHEMA_VERSION) {
    return { legible: false }
  }

  let document = raw
  let version = schemaVersion

  while (version < SCHEMA_VERSION) {
    const migration = MIGRATIONS[version]
    if (!migration) return { legible: false }
    document = migration(document)
    version += 1
  }

  return { legible: true, document: document as ScoreDocument }
}
