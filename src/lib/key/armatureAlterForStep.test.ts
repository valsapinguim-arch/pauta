import { describe, expect, it } from 'vitest'
import { armatureAlterForStep } from './armatureAlterForStep'

describe('armatureAlterForStep', () => {
  it('sem armação, tudo é natural', () => {
    expect(armatureAlterForStep('F', 0)).toBe(0)
    expect(armatureAlterForStep('B', 0)).toBe(0)
  })

  it('sol maior (1 sustenido): só o fá é sustenido', () => {
    expect(armatureAlterForStep('F', 1)).toBe(1)
    expect(armatureAlterForStep('C', 1)).toBe(0)
  })

  it('ré maior (2 sustenidos): fá e dó são sustenidos, mais nada', () => {
    expect(armatureAlterForStep('F', 2)).toBe(1)
    expect(armatureAlterForStep('C', 2)).toBe(1)
    expect(armatureAlterForStep('G', 2)).toBe(0)
  })

  it('fá maior (1 bemol): só o si é bemol', () => {
    expect(armatureAlterForStep('B', -1)).toBe(-1)
    expect(armatureAlterForStep('E', -1)).toBe(0)
  })

  it('réb maior (5 bemóis): si, mi, lá, ré e sol são bemóis', () => {
    for (const step of ['B', 'E', 'A', 'D', 'G'] as const) {
      expect(armatureAlterForStep(step, -5)).toBe(-1)
    }
    expect(armatureAlterForStep('C', -5)).toBe(0)
    expect(armatureAlterForStep('F', -5)).toBe(0)
  })
})
