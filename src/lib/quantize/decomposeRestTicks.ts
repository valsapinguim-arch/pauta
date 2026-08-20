import { largestNoteDurationAtMost, nearestNoteDuration } from './noteDurations'
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
 * Exemplo (decisão 6): um espaço de 5 semicorcheas (5/16) a começar num
 * tempo decompõe-se em semínima + semicorchea — a semínima completa o
 * primeiro tempo, a semicorchea preenche o que sobra do segundo.
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

    const { noteType, dots, ticks: figureTicks } = largestNoteDurationAtMost(maxTicks)
    // `largestNoteDurationAtMost` pode devolver uma figura maior que `maxTicks`
    // quando o espaço é menor que a semicorchea (decisão 5, `noteDurations.ts`:
    // "nunca eliminar" — promove em vez de recusar). Aqui isso não pode
    // acontecer sem invadir o próximo limite (tempo/compasso/nota seguinte): a
    // duração real fica presa a `maxTicks`, a figura mostrada é só a
    // aproximação visual mais próxima — o mesmo padrão de `splitAcrossBarlines`
    // para pedaços sem figura exata.
    const ticks = Math.min(figureTicks, maxTicks)
    const visual = ticks === figureTicks ? { noteType, dots } : nearestNoteDuration(ticks)

    rests.push({
      pitchMidi: null,
      startTick: cursor,
      durationTicks: ticks,
      noteType: visual.noteType,
      dots: visual.dots,
      isRest: true,
      tiedToNext: false,
      tiedFromPrevious: false,
      sourceIndex: null,
    })

    cursor += ticks
  }

  return rests
}
