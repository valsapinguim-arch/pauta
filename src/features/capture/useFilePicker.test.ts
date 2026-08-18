import { describe, expect, it } from 'vitest'
import { sanitizeFileName } from './useFilePicker'

describe('sanitizeFileName', () => {
  it('mantém um nome normal intacto', () => {
    expect(sanitizeFileName('minha-musica.mp3')).toBe('minha-musica.mp3')
  })

  it('remove espaço em branco à volta', () => {
    expect(sanitizeFileName('  ficheiro.wav  ')).toBe('ficheiro.wav')
  })

  it('cai num nome por omissão quando fica vazio', () => {
    expect(sanitizeFileName('')).toBe('audio')
    expect(sanitizeFileName('   ')).toBe('audio')
  })
})
