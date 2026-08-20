import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import {
  clearErrorLog,
  ERROR_LOG_LIMIT,
  formatErrorLogAsText,
  listErrorLog,
  logError,
} from './errorLog'

describe('errorLog', () => {
  beforeEach(async () => {
    await clearErrorLog()
  })

  it('regista e lista uma entrada, mais recente primeiro', async () => {
    await logError({
      code: 'too-quiet',
      occurredAt: '2026-01-01T00:00:00.000Z',
      context: 'a',
      technicalDetails: 'x',
    })
    await logError({
      code: 'decode-failed',
      occurredAt: '2026-01-01T00:00:01.000Z',
      context: 'b',
      technicalDetails: 'y',
    })

    const entries = await listErrorLog()
    expect(entries).toHaveLength(2)
    expect(entries[0]?.code).toBe('decode-failed')
    expect(entries[1]?.code).toBe('too-quiet')
  })

  it('nunca excede o limite do anel (Tarefa 21, decisão 4)', async () => {
    for (let i = 0; i < ERROR_LOG_LIMIT + 10; i += 1) {
      await logError({
        code: 'transcribe-failed',
        occurredAt: new Date(2026, 0, 1, 0, 0, i).toISOString(),
        context: `iteracao-${i}`,
        technicalDetails: 'x',
      })
    }

    const entries = await listErrorLog()
    expect(entries.length).toBeLessThanOrEqual(ERROR_LOG_LIMIT)
    // As mais antigas foram descartadas — a última inserida continua lá.
    expect(entries[0]?.context).toBe(`iteracao-${ERROR_LOG_LIMIT + 9}`)
  })

  it('limpa o registo', async () => {
    await logError({
      code: 'too-quiet',
      occurredAt: '2026-01-01T00:00:00.000Z',
      context: 'a',
      technicalDetails: 'x',
    })
    await clearErrorLog()
    expect(await listErrorLog()).toHaveLength(0)
  })

  it('formata como texto simples, incluindo quando vazio', () => {
    expect(formatErrorLogAsText([])).toBe('Sem erros registados.')
    const text = formatErrorLogAsText([
      {
        code: 'too-quiet',
        occurredAt: '2026-01-01T00:00:00.000Z',
        context: 'a',
        technicalDetails: 'detalhe',
      },
    ])
    expect(text).toContain('too-quiet')
    expect(text).toContain('detalhe')
  })
})
