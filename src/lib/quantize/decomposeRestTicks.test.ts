import { describe, expect, it } from 'vitest'
import { decomposeRestTicks } from './decomposeRestTicks'
import { ticksForNoteType } from './noteDurations'

const BEAT_TICKS = 480 // semínima
const MEASURE_TICKS = 1920 // 4/4
const MIN_SUBDIVISION = 120 // semicolcheia — a grelha

/** A duração real de cada pausa tem de bater sempre certo com a duração que
 *  a própria figura (`noteType`/`dots`) representa — é a mesma verificação
 *  que `validateScoreDocument` (Tarefa 12) faz, recalculada a partir da
 *  figura, e é ela que apanhou o bug real desta secção (Tarefa 21): uma
 *  pausa com `durationTicks` correto mas figura "aproximada" que não bate
 *  com esse valor. */
function expectDurationMatchesFigure(rests: ReturnType<typeof decomposeRestTicks>): void {
  for (const rest of rests) {
    expect(ticksForNoteType(rest.noteType, rest.dots)).toBe(rest.durationTicks)
  }
}

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

  describe('figura sempre exata (bug real, Tarefa 21)', () => {
    // `validateScoreDocument` (Tarefa 12) soma cada compasso a partir da
    // FIGURA de cada elemento, não do seu `durationTicks`. Uma pausa cuja
    // figura não cubra exatamente a sua duração faz a validação rejeitar um
    // documento cujas durações estão certas — era o que acontecia com
    // gravações reais ("compasso N soma 1980, esperado 1920").

    it('cobre exatamente qualquer espaço múltiplo da grelha, com figuras exatas', () => {
      // Todo o espaço que esta função recebe em produção é um múltiplo da
      // grelha — ver a invariante em `noteDurations.ts`.
      for (let ticks = MIN_SUBDIVISION; ticks <= MEASURE_TICKS * 2; ticks += MIN_SUBDIVISION) {
        for (const start of [0, MIN_SUBDIVISION, BEAT_TICKS, BEAT_TICKS + MIN_SUBDIVISION]) {
          const rests = decomposeRestTicks(start, start + ticks, BEAT_TICKS, MEASURE_TICKS)
          expectDurationMatchesFigure(rests)
          expect(rests.reduce((sum, r) => sum + r.durationTicks, 0)).toBe(ticks)
        }
      }
    })
  })
})
