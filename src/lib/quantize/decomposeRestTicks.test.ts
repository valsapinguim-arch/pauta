import { describe, expect, it } from 'vitest'
import { decomposeRestTicks } from './decomposeRestTicks'
import { ticksForNoteType } from './noteDurations'

const BEAT_TICKS = 480 // semínima
const MEASURE_TICKS = 1920 // 4/4

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

  describe('correção de fase (bug real, Tarefa 21)', () => {
    // `startTick=60` simula o fim de uma nota real que era uma semicorchea
    // pontuada (180 ticks) a começar em 0 — a única figura da tabela que não
    // é múltiplo de `MIN_SUBDIVISION_TICKS` (120), daí `startTick` cair fora
    // da grelha (`endTick` de uma pausa é sempre o início de uma nota real,
    // sempre alinhado — só `startTick` pode não estar).

    it('espaço desalinhado com folga usa a semicorchea pontuada para repor a fase logo no início', () => {
      const rests = decomposeRestTicks(60, 960, BEAT_TICKS, MEASURE_TICKS)
      expect(rests[0]).toMatchObject({ noteType: 'sixteenth', dots: 1, durationTicks: 180 })
      expectDurationMatchesFigure(rests)
      expect(rests.reduce((sum, r) => sum + r.durationTicks, 0)).toBe(900)
    })

    it('espaço desalinhado atravessa o tempo com a pontuada quando só o limite de tempo (não o de compasso) o impedia', () => {
      // Em `cursor=420`, `ticksToNextBeat=60` — a pontuada (180) só cabe
      // atravessando o tempo; antes da correção, o algoritmo guloso adiava
      // a correção de fase e podia ficar sem espaço mais tarde.
      const rests = decomposeRestTicks(420, 720, BEAT_TICKS, MEASURE_TICKS)
      expect(rests[0]).toMatchObject({ noteType: 'sixteenth', dots: 1, durationTicks: 180 })
      expect((rests[0]?.startTick ?? 0) + (rests[0]?.durationTicks ?? 0)).toBeGreaterThan(
        BEAT_TICKS,
      )
      expectDurationMatchesFigure(rests)
      expect(rests.reduce((sum, r) => sum + r.durationTicks, 0)).toBe(300)
    })

    it('espaço alinhado nunca escolhe a pontuada só por ser a maior que cabe (não haveria fase nenhuma a repor)', () => {
      const rests = decomposeRestTicks(0, 600, BEAT_TICKS, MEASURE_TICKS)
      expect(rests.some((r) => r.noteType === 'sixteenth' && r.dots === 1)).toBe(false)
      expectDurationMatchesFigure(rests)
    })
  })
})
