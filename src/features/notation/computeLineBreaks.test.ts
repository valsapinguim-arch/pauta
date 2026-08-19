import { describe, expect, it } from 'vitest'
import { computeLineBreaks } from './computeLineBreaks'

describe('computeLineBreaks', () => {
  it('agrupa compassos enquanto couberem na largura', () => {
    expect(computeLineBreaks([100, 100, 100, 100], 250)).toEqual([
      [0, 1],
      [2, 3],
    ])
  })

  it('um compasso por linha quando cada um já enche a largura', () => {
    expect(computeLineBreaks([200, 200, 200], 250)).toEqual([[0], [1], [2]])
  })

  it('todos numa linha só quando cabem', () => {
    expect(computeLineBreaks([50, 50, 50], 500)).toEqual([[0, 1, 2]])
  })

  it('um compasso mais largo do que o contentor fica sozinho, sem lançar', () => {
    expect(computeLineBreaks([50, 400, 50], 200)).toEqual([[0], [1], [2]])
  })

  it('devolve vazio para entrada vazia', () => {
    expect(computeLineBreaks([], 500)).toEqual([])
  })

  it('um único compasso fica numa única linha', () => {
    expect(computeLineBreaks([100], 500)).toEqual([[0]])
  })
})
