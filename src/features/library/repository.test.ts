/**
 * `node`, não `jsdom` (Tarefa 16, mesmo raciocínio do `vitest.config.ts`
 * para `@/lib`): isto é persistência, não DOM. `fake-indexeddb/auto`
 * substitui o `indexedDB` global por uma implementação em memória — `idb`
 * (e portanto `@/features/library/db`) não sabe a diferença.
 */
import 'fake-indexeddb/auto'
import { afterEach, describe, expect, it } from 'vitest'
import { ScoreDocumentValidationError } from '@/lib/notation/validateScoreDocument'
import type { ScoreDocument } from '@/lib/types'
import { TRANSCRIPTIONS_STORE, openLibraryDb } from './db'
import { count, get, list, remove, save, update } from './repository'

function document(overrides: Partial<ScoreDocument> = {}): ScoreDocument {
  return {
    metadata: {
      schemaVersion: 1,
      title: 'Escala de Dó maior',
      createdAt: '2024-03-15T10:30:00.000Z',
      sourceName: null,
      durationSec: 4,
      confidence: { overall: 1, notes: 1, tempo: 1, key: 1 },
    },
    tempo: {
      bpm: 96,
      timeSignature: { numerator: 4, denominator: 4 },
      firstBeatSec: 0,
      confidence: 1,
      source: 'detected',
    },
    key: { tonic: 0, mode: 'major', sharpsOrFlats: 0, confidence: 1, source: 'detected' },
    clef: 'treble',
    measures: [
      {
        number: 1,
        elements: [
          {
            kind: 'note',
            step: 'C',
            alter: 0,
            octave: 4,
            pitchMidi: 60,
            noteType: 'whole',
            dots: 0,
            accidental: null,
            tie: null,
            sourceIndex: null,
          },
        ],
      },
    ],
    ...overrides,
  }
}

/** A ligação (`dbPromise` em `db.ts`) é partilhada por todos os testes deste
 *  ficheiro — abri-la de novo a cada teste seria contrariar a decisão de a
 *  guardar em cache. Em vez disso, limpa-se a _object store_ entre testes. */
afterEach(async () => {
  const db = await openLibraryDb()
  await db.clear(TRANSCRIPTIONS_STORE)
})

describe('repository', () => {
  it('guardar e ler devolve um documento equivalente', async () => {
    const doc = document()
    const { id } = await save(doc)

    const entry = await get(id)

    expect(entry?.result).toEqual({ legible: true, document: doc })
  })

  it('list() ordena por data descendente', async () => {
    await save(
      document({ metadata: { ...document().metadata, createdAt: '2024-01-01T00:00:00.000Z' } }),
    )
    await save(
      document({ metadata: { ...document().metadata, createdAt: '2024-03-01T00:00:00.000Z' } }),
    )
    await save(
      document({ metadata: { ...document().metadata, createdAt: '2024-02-01T00:00:00.000Z' } }),
    )

    const entries = await list()

    expect(entries.map((entry) => entry.createdAt)).toEqual([
      '2024-03-01T00:00:00.000Z',
      '2024-02-01T00:00:00.000Z',
      '2024-01-01T00:00:00.000Z',
    ])
  })

  it('eliminar remove e não afeta os restantes', async () => {
    const { id: keep } = await save(document())
    const { id: discard } = await save(document())

    await remove(discard)

    expect(await get(discard)).toBeUndefined()
    expect(await get(keep)).not.toBeUndefined()
    expect(await count()).toBe(1)
  })

  it('update() substitui o documento sem mudar o id nem o createdAt original', async () => {
    const { id } = await save(document())
    const edited = document({
      metadata: { ...document().metadata, title: 'Título corrigido' },
    })

    await update(id, edited)
    const entry = await get(id)

    expect(entry?.id).toBe(id)
    expect(entry?.createdAt).toBe(document().metadata.createdAt)
    expect(entry?.result).toEqual({ legible: true, document: edited })
  })

  it('recusa gravar um documento inválido, sem escrever nada', async () => {
    const invalid = document({ measures: [{ number: 1, elements: [] as never[] }] })
    // Compasso vazio nunca soma `QUANTIZE.MEASURE_TICKS` — inválido de propósito.

    await expect(save(invalid)).rejects.toBeInstanceOf(ScoreDocumentValidationError)
    expect(await count()).toBe(0)
  })

  it('regista uma versão superior a `SCHEMA_VERSION` como ilegível ao ler', async () => {
    const db = await openLibraryDb()
    await db.add(TRANSCRIPTIONS_STORE, {
      id: 'future',
      createdAt: '2030-01-01T00:00:00.000Z',
      schemaVersion: 999,
      document: { anything: 'goes' },
    })

    const entry = await get('future')

    expect(entry?.result).toEqual({ legible: false })
  })
})
