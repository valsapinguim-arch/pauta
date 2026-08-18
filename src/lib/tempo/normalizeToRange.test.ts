import { describe, expect, it } from 'vitest'
import { normalizeToRange } from './normalizeToRange'

describe('normalizeToRange', () => {
  it('dobra um candidato abaixo do mínimo até caber na gama', () => {
    expect(normalizeToRange(30, 60, 200)).toBe(60)
    expect(normalizeToRange(20, 60, 200)).toBe(80)
  })

  it('divide um candidato acima do máximo até caber na gama', () => {
    expect(normalizeToRange(240, 60, 200)).toBe(120)
    expect(normalizeToRange(500, 60, 200)).toBe(125)
  })

  it('não altera um candidato já dentro da gama', () => {
    expect(normalizeToRange(96, 60, 200)).toBe(96)
  })

  it('não altera 0 ou negativos — não há oitava para dobrar', () => {
    expect(normalizeToRange(0, 60, 200)).toBe(0)
    expect(normalizeToRange(-10, 60, 200)).toBe(-10)
  })
})
