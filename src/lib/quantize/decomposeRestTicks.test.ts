import { describe, expect, it } from 'vitest'
import { decomposeRestTicks } from './decomposeRestTicks'

const BEAT_TICKS = 480 // semínima
const MEASURE_TICKS = 1920 // 4/4

describe('decomposeRestTicks', () => {
  it('um espaço que cabe numa figura única não se decompõe', () => {
    const rests = decomposeRestTicks(0, 480, BEAT_TICKS, MEASURE_TICKS)
    expect(rests).toHaveLength(1)
    expect(rests[0]).toMatchObject({ noteType: 'quarter', dots: 0, isRest: true })
  })

  it('5/16 (5 semicorcheas) a começar num tempo decompõe-se em semínima + semicorchea', () => {
    const rests = decomposeRestTicks(0, 600, BEAT_TICKS, MEASURE_TICKS)
    expect(rests.map((r) => ({ noteType: r.noteType, dots: r.dots }))).toEqual([
      { noteType: 'quarter', dots: 0 },
      { noteType: 'sixteenth', dots: 0 },
    ])
    expect(rests.reduce((sum, r) => sum + r.durationTicks, 0)).toBe(600)
  })

  it('uma mínima pode começar num tempo forte e atravessar dois tempos', () => {
    const rests = decomposeRestTicks(0, 960, BEAT_TICKS, MEASURE_TICKS)
    expect(rests).toHaveLength(1)
    expect(rests[0]).toMatchObject({ noteType: 'half', dots: 0 })
  })

  it('um espaço a começar fora de um tempo forte respeita o próximo limite de tempo', () => {
    const rests = decomposeRestTicks(120, 600, BEAT_TICKS, MEASURE_TICKS)
    expect(rests[0]?.startTick).toBe(120)
    expect((rests[0]?.startTick ?? 0) + (rests[0]?.durationTicks ?? 0)).toBeLessThanOrEqual(480)
    const total = rests.reduce((sum, r) => sum + r.durationTicks, 0)
    expect(total).toBe(480)
  })

  it('nenhuma pausa atravessa uma barra de compasso, mesmo alinhada a um tempo', () => {
    // espaço de 0 a 3840 (duas semibreves de folga): sem o limite de
    // compasso, a maior figura cabível arriscaria atravessar a barra em 1920
    const rests = decomposeRestTicks(0, 3840, BEAT_TICKS, MEASURE_TICKS)
    for (const rest of rests) {
      const startMeasure = Math.floor(rest.startTick / MEASURE_TICKS)
      const endMeasure = Math.floor((rest.startTick + rest.durationTicks - 1) / MEASURE_TICKS)
      expect(startMeasure).toBe(endMeasure)
    }
  })

  it('devolve vazio quando o espaço não tem duração', () => {
    expect(decomposeRestTicks(100, 100, BEAT_TICKS, MEASURE_TICKS)).toEqual([])
  })

  it('todas as pausas geradas cobrem exatamente o intervalo pedido, sem sobras nem falhas', () => {
    const rests = decomposeRestTicks(240, 2400, BEAT_TICKS, MEASURE_TICKS)
    let cursor = 240
    for (const rest of rests) {
      expect(rest.startTick).toBe(cursor)
      cursor += rest.durationTicks
    }
    expect(cursor).toBe(2400)
  })
})
