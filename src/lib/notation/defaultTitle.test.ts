import { describe, expect, it } from 'vitest'
import { defaultTitle } from './defaultTitle'

describe('defaultTitle', () => {
  it('usa o nome do ficheiro sem extensão', () => {
    expect(defaultTitle('melodia.mp3', '2026-01-01T00:00:00.000Z')).toBe('melodia')
  })

  it('só corta a última extensão, mantém pontos anteriores', () => {
    expect(defaultTitle('ensaio v2.3.wav', '2026-01-01T00:00:00.000Z')).toBe('ensaio v2.3')
  })

  it('usa "Gravação" com data para o microfone (sourceName null)', () => {
    expect(defaultTitle(null, '2026-08-19T14:32:00.000Z')).toBe('Gravação 19/08/2026, 14:32')
  })

  it('nunca devolve vazio, mesmo com um nome sem letras antes da extensão', () => {
    expect(defaultTitle('.mp3', '2026-01-01T00:00:00.000Z')).toBe('.mp3')
  })

  it('é determinístico e independente do fuso horário local', () => {
    const a = defaultTitle(null, '2026-08-19T23:59:00.000Z')
    const b = defaultTitle(null, '2026-08-19T23:59:00.000Z')
    expect(a).toBe(b)
    expect(a).toBe('Gravação 19/08/2026, 23:59')
  })
})
