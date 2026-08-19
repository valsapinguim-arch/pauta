import { describe, expect, it } from 'vitest'
import { snapOnset } from './snapOnset'

describe('snapOnset', () => {
  it('não altera um tick já na grelha', () => {
    expect(snapOnset(240, 120)).toEqual({ tick: 240, deviationTicks: 0 })
  })

  it('arredonda para o ponto de grelha mais próximo', () => {
    expect(snapOnset(250, 120)).toEqual({ tick: 240, deviationTicks: 10 })
    expect(snapOnset(290, 120)).toEqual({ tick: 240, deviationTicks: 50 })
    expect(snapOnset(310, 120)).toEqual({ tick: 360, deviationTicks: 50 })
  })

  it('aceita um desvio grande em vez de recusar (decisão 2)', () => {
    // 421 está a mais de metade da subdivisão (60) do ponto mais próximo
    const result = snapOnset(421, 120)
    expect(result.tick).toBe(480)
    expect(result.deviationTicks).toBe(59)
  })
})
