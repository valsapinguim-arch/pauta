import { describe, expect, it } from 'vitest'
import { QUANTIZE } from './constants'
import { decomposeNoteTicks } from './decomposeNoteTicks'

const GRID = QUANTIZE.MIN_SUBDIVISION_TICKS

describe('decomposeNoteTicks', () => {
  it('uma duração que já é uma figura devolve essa figura sozinha', () => {
    expect(decomposeNoteTicks(480)).toEqual([{ noteType: 'quarter', dots: 0, ticks: 480 }])
  })

  it('600 ticks (sem figura própria) dá semínima + semicolcheia, que somam exatamente', () => {
    const pieces = decomposeNoteTicks(600)
    expect(pieces.map((p) => p.ticks)).toEqual([480, 120])
    expect(pieces.reduce((sum, p) => sum + p.ticks, 0)).toBe(600)
  })

  it('qualquer múltiplo da grelha decompõe-se exatamente', () => {
    for (let ticks = GRID; ticks <= QUANTIZE.MEASURE_TICKS * 3; ticks += GRID) {
      const pieces = decomposeNoteTicks(ticks)
      expect(pieces.reduce((sum, p) => sum + p.ticks, 0)).toBe(ticks)
    }
  })

  it('usa o menor número de figuras possível (guloso da maior para a menor)', () => {
    // 960 é exatamente uma mínima — nunca duas semínimas.
    expect(decomposeNoteTicks(960)).toHaveLength(1)
  })

  it('devolve vazio abaixo da menor figura, em vez de mentir sobre a duração', () => {
    // Nunca promover aqui (ao contrário de `largestNoteDurationAtMost`):
    // quem chama tem de poder distinguir "não dá para notar" de "notei".
    expect(decomposeNoteTicks(GRID - 1)).toEqual([])
    expect(decomposeNoteTicks(0)).toEqual([])
  })
})
