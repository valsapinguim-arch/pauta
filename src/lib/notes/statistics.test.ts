import { describe, expect, it } from 'vitest'
import { clamp01, median } from './statistics'

describe('median', () => {
  it('devolve 0 para uma lista vazia', () => {
    expect(median([])).toBe(0)
  })

  it('devolve o valor do meio numa lista ímpar', () => {
    expect(median([3, 1, 2])).toBe(2)
  })

  it('faz a média dos dois do meio numa lista par', () => {
    expect(median([1, 2, 3, 4])).toBe(2.5)
  })

  it('funciona com um só valor', () => {
    expect(median([5])).toBe(5)
  })

  it('não muta o array recebido', () => {
    const values = [3, 1, 2]
    median(values)
    expect(values).toEqual([3, 1, 2])
  })
})

describe('clamp01', () => {
  it('deixa passar valores já em [0, 1]', () => {
    expect(clamp01(0.5)).toBe(0.5)
  })

  it('confina acima de 1', () => {
    expect(clamp01(1.5)).toBe(1)
  })

  it('confina abaixo de 0', () => {
    expect(clamp01(-0.5)).toBe(0)
  })

  it('trata NaN como 0', () => {
    expect(clamp01(Number.NaN)).toBe(0)
  })
})
