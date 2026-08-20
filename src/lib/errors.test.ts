import { describe, expect, it } from 'vitest'
import { errorCatalog, getErrorEntry, isKnownErrorCode } from './errors'

describe('errorCatalog', () => {
  it.each(Object.keys(errorCatalog))(
    '"%s" tem título, mensagem e ação, todos não vazios (Tarefa 21, decisão 2)',
    (code) => {
      const entry = getErrorEntry(code)
      expect(entry).not.toBeNull()
      expect(entry?.title.trim()).not.toBe('')
      expect(entry?.body.trim()).not.toBe('')
      expect(entry?.action.trim()).not.toBe('')
      expect(typeof entry?.recoverable).toBe('boolean')
    },
  )

  it('reconhece um código do catálogo', () => {
    expect(isKnownErrorCode('too-quiet')).toBe(true)
  })

  it('não reconhece um código desconhecido', () => {
    expect(isKnownErrorCode('isto-nao-existe')).toBe(false)
  })

  it('devolve null para um código desconhecido', () => {
    expect(getErrorEntry('isto-nao-existe')).toBeNull()
  })

  it('devolve o código na entrada, para quem só tem a entrada e precisa dele', () => {
    expect(getErrorEntry('too-quiet')?.code).toBe('too-quiet')
  })
})
