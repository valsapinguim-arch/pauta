import { describe, expect, it } from 'vitest'
import { escapeXml } from './escapeXml'

describe('escapeXml', () => {
  it('escapa & < > " \'', () => {
    expect(escapeXml('&')).toBe('&amp;')
    expect(escapeXml('<')).toBe('&lt;')
    expect(escapeXml('>')).toBe('&gt;')
    expect(escapeXml('"')).toBe('&quot;')
    expect(escapeXml("'")).toBe('&apos;')
  })

  it('escapa vários caracteres na mesma string, pela ordem em que aparecem', () => {
    expect(escapeXml('<a href="x">Tom & Jerry\'s</a>')).toBe(
      '&lt;a href=&quot;x&quot;&gt;Tom &amp; Jerry&apos;s&lt;/a&gt;',
    )
  })

  it('texto sem caracteres especiais passa intocado', () => {
    expect(escapeXml('Escala de Dó maior')).toBe('Escala de Dó maior')
  })

  it('string vazia devolve string vazia', () => {
    expect(escapeXml('')).toBe('')
  })

  it('trata cada & do texto de origem individualmente, mesmo que pareça já uma entidade', () => {
    expect(escapeXml('&amp;')).toBe('&amp;amp;')
  })
})
