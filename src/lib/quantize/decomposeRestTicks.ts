import { QUANTIZE } from './constants'
import { DOTTED_SIXTEENTH, largestNoteDurationAtMost, nearestNoteDuration } from './noteDurations'
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
 *
 * Correção de fase (bug real, Tarefa 21): `endTick` é sempre o início de
 * uma nota real, sempre alinhado à grelha de `MIN_SUBDIVISION_TICKS`
 * (`snapOnset`, Tarefa 10) — mas `startTick` é o FIM da nota anterior, que
 * só fica alinhado se essa nota não era uma semicorchea pontuada (a única
 * figura da tabela que não é múltiplo de `MIN_SUBDIVISION_TICKS`, ver
 * `DOTTED_SIXTEENTH`). Quando `startTick` cai fora da grelha, o algoritmo
 * guloso normal (maior figura que cabe, sem olhar a fase) pode empurrar o
 * desalinhamento até não sobrar espaço nenhum para o corrigir — descoberto
 * com uma gravação real, onde um compasso deixava de somar `MEASURE_TICKS`
 * apesar de `quantize` já ter clampado a duração ao espaço disponível: a
 * duração real ficava certa, mas a figura mostrada (só aproximada nesse
 * caso limite) deixava de bater certo com a soma que `validateScoreDocument`
 * (Tarefa 12) recalcula a partir das figuras.
 *
 * Corrigir a fase assim que aparece — antes de mais nada — garante que essa
 * aproximação nunca chega a ser necessária. Ao decidir se cabe, distingue-se
 * dois limites: o "duro" (nunca ultrapassar — fim do espaço a preencher ou
 * barra de compasso, decisão 8) do "mole" (preferível não ultrapassar — o
 * tempo, decisão 6, só uma questão de legibilidade). Quando só o limite mole
 * impede a semicorchea pontuada de caber, é preferível atravessar o tempo
 * (perde-se um pouco de legibilidade) a adiar a correção e arriscar ficar
 * sem espaço nenhum mais tarde — só quando nem o limite duro chega é que
 * sobra o caso residual verdadeiramente inevitável (tratado abaixo).
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

    // Limite duro: nunca ultrapassar (fim do espaço, ou barra de compasso).
    const hardMaxTicks = Math.min(remaining, ticksToNextMeasure)
    // Limite mole: inclui também o tempo, preferível mas não obrigatório.
    const softMaxTicks = onBeatBoundary ? hardMaxTicks : Math.min(hardMaxTicks, ticksToNextBeat)

    const offGrid = cursor % QUANTIZE.MIN_SUBDIVISION_TICKS !== 0

    let noteType: WorkingNote['noteType']
    let dots: WorkingNote['dots']
    let ticks: number

    if (offGrid && hardMaxTicks >= DOTTED_SIXTEENTH.ticks) {
      // Só esta figura repõe a fase — usá-la assim que cabe (mesmo que só
      // caiba atravessando o tempo), nunca adiar: adiar é exatamente o que
      // levava o algoritmo guloso a ficar sem espaço mais tarde.
      ;({ noteType, dots, ticks } = DOTTED_SIXTEENTH)
    } else {
      const figure = largestNoteDurationAtMost(softMaxTicks)
      // `largestNoteDurationAtMost` pode devolver uma figura maior que
      // `softMaxTicks` quando o espaço é menor que a semicorchea (decisão 5,
      // `noteDurations.ts`: "nunca eliminar" — promove em vez de recusar).
      // Com a correção de fase acima (incluindo atravessar o tempo quando
      // preciso), só sobrevive o caso residual em que nem o limite duro
      // chega para a própria semicorchea pontuada — inevitável: não há
      // figura nenhuma que represente um espaço mais pequeno do que a menor
      // da tabela. A duração real fica presa a `softMaxTicks`; a figura
      // mostrada é só a aproximação visual mais próxima, mesmo padrão de
      // `splitAcrossBarlines`.
      ticks = Math.min(figure.ticks, softMaxTicks)
      const visual = ticks === figure.ticks ? figure : nearestNoteDuration(ticks)
      noteType = visual.noteType
      dots = visual.dots
    }

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
