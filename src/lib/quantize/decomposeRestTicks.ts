import { largestNoteDurationAtMost } from './noteDurations'
import type { WorkingNote } from './workingNote'

/**
 * Decompõe um espaço `[startTick, endTick)` em pausas, alinhadas aos
 * limites de tempo E de compasso (decisão 6, e a mesma regra da decisão 8:
 * nada atravessa uma barra sem ser explicitamente ligado — pausas nunca
 * são ligadas, por isso nunca atravessam). Dados (`noteDurations.ts`), não
 * uma cadeia de `if`: em cada passo escolhe-se a maior figura que cabe sem
 * ultrapassar o próximo limite de compasso e, se o cursor não estiver
 * alinhado a um tempo, sem ultrapassar o próximo limite de tempo — quando
 * já está alinhado a um tempo, a figura pode atravessar vários tempos
 * dentro do mesmo compasso (ex.: uma mínima é normal a começar num tempo
 * forte).
 *
 * Exemplo (decisão 6): um espaço de 5 semicolcheas (5/16) a começar num
 * tempo decompõe-se em semínima + semicolcheia — a semínima completa o
 * primeiro tempo, a semicolcheia preenche o que sobra do segundo.
 *
 * A figura escolhida cobre SEMPRE exatamente os ticks que diz cobrir. Isso
 * é garantido pela invariante de `NOTE_DURATIONS` (todas as figuras são
 * múltiplos de `MIN_SUBDIVISION_TICKS`): como os inícios estão na grelha e
 * as durações também, qualquer espaço a preencher é um múltiplo da grelha,
 * e a decomposição gulosa fecha sempre certo. Sem essa invariante era
 * possível sobrar um resto de 60 ticks que nenhuma figura representa — ver
 * a nota em `noteDurations.ts`.
 */
export function decomposeRestTicks(
  startTick: number,
  endTick: number,
  beatTicks: number,
  measureTicks: number,
): WorkingNote[] {
  const rests: WorkingNote[] = []
  let cursor = startTick

  while (cursor < endTick) {
    const remaining = endTick - cursor
    const ticksToNextMeasure = measureTicks - (cursor % measureTicks)
    const onBeatBoundary = cursor % beatTicks === 0
    const ticksToNextBeat = beatTicks - (cursor % beatTicks)

    let maxTicks = Math.min(remaining, ticksToNextMeasure)
    if (!onBeatBoundary) maxTicks = Math.min(maxTicks, ticksToNextBeat)

    const { noteType, dots, ticks } = largestNoteDurationAtMost(maxTicks)
    // Só acontece com um espaço menor do que a menor figura — impossível
    // com a invariante acima, mas se algum dia deixar de valer é melhor
    // parar do que entrar em ciclo infinito ou emitir uma pausa que mente
    // sobre a sua duração.
    if (ticks > maxTicks) break

    rests.push({
      pitchMidi: null,
      startTick: cursor,
      durationTicks: ticks,
      noteType,
      dots,
      isRest: true,
      tiedToNext: false,
      tiedFromPrevious: false,
      sourceIndex: null,
    })

    cursor += ticks
  }

  return rests
}
