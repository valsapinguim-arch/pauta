import { describe, expect, it } from 'vitest'
import { toMono } from './toMono'

describe('toMono', () => {
  it('devolve um array vazio sem canais', () => {
    expect(toMono([])).toEqual(new Float32Array(0))
  })

  it('devolve o próprio canal quando só há um', () => {
    const mono = new Float32Array([0.1, -0.2, 0.3])
    expect(toMono([mono])).toBe(mono)
  })

  it('faz a média amostra a amostra em estéreo', () => {
    const left = new Float32Array([1, 0, -1])
    const right = new Float32Array([0, 1, -0.5])
    expect(toMono([left, right])).toEqual(new Float32Array([0.5, 0.5, -0.75]))
  })

  it('faz a média de mais de dois canais', () => {
    const a = new Float32Array([1, 1])
    const b = new Float32Array([0, 1])
    const c = new Float32Array([-1, 1])
    expect(toMono([a, b, c])).toEqual(new Float32Array([0, 1]))
  })
})
