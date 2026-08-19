import { describe, expect, it } from 'vitest'
import { sanitizeFilename } from './sanitizeFilename'

describe('sanitizeFilename', () => {
  it('substitui barras', () => {
    expect(sanitizeFilename('Blues em Dó/Ré')).toBe('Blues em Dó-Ré')
  })

  it('substitui dois pontos', () => {
    expect(sanitizeFilename('Estudo: primeira parte')).toBe('Estudo- primeira parte')
  })

  it('remove emoji sem tocar em acentos', () => {
    expect(sanitizeFilename('Escala de Dó maior 🎵🎶')).toBe('Escala de Dó maior')
  })

  it('string vazia devolve o nome de recurso', () => {
    expect(sanitizeFilename('')).toBe('pauta')
  })

  it('só espaços devolve o nome de recurso', () => {
    expect(sanitizeFilename('   ')).toBe('pauta')
  })

  it('caracteres inválidos tornam-se hífenes, não desaparecem', () => {
    expect(sanitizeFilename('///:::')).toBe('------')
  })

  it('limita o comprimento', () => {
    const result = sanitizeFilename('a'.repeat(500))
    expect(result.length).toBeLessThanOrEqual(100)
  })

  it('nunca termina em ponto ou espaço, mesmo depois de cortar o comprimento', () => {
    const result = sanitizeFilename(`${'a'.repeat(99)}. resto que é cortado`)
    expect(result.endsWith('.')).toBe(false)
    expect(result.endsWith(' ')).toBe(false)
  })

  it('espaços e hífenes de origem mantêm-se', () => {
    expect(sanitizeFilename('Escala menor - improviso')).toBe('Escala menor - improviso')
  })

  it('colapsa espaços repetidos', () => {
    expect(sanitizeFilename('Dó    maior')).toBe('Dó maior')
  })
})
