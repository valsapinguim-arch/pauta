import { decomposeNoteTicks } from './decomposeNoteTicks'
import type { WorkingNote } from './workingNote'

/**
 * Divide e liga uma nota que atravessa uma ou mais barras de compasso —
 * decisão 7, regra da notação, não escolha.
 *
 * Cada pedaço é depois decomposto em figuras EXATAS (`decomposeNoteTicks`),
 * todas ligadas entre si: um pedaço de 600 ticks vira semínima + semicolcheia
 * ligadas, não uma "semínima" que diz durar 600. A versão original guardava
 * a duração exata e escolhia só a figura mais próxima para mostrar — o que
 * mantinha a soma de `durationTicks` correta mas fazia
 * `validateScoreDocument` (Tarefa 12, que soma as FIGURAS) rejeitar o
 * documento. Bug real, reproduzido com gravações (Tarefa 21).
 *
 * Só opera sobre notas reais — chamar antes de `fillRests` (as pausas
 * nunca precisam de ligadura, `decomposeRestTicks` já respeita as barras).
 */
export function splitAcrossBarlines(notes: WorkingNote[], measureTicks: number): WorkingNote[] {
  const result: WorkingNote[] = []

  for (const note of notes) {
    result.push(...splitNote(note, measureTicks))
  }

  return result
}

function splitNote(note: WorkingNote, measureTicks: number): WorkingNote[] {
  if (note.isRest) return [note]

  const endTick = note.startTick + note.durationTicks
  const pieces: WorkingNote[] = []
  let cursor = note.startTick

  while (cursor < endTick) {
    const distanceToBoundary = measureTicks - (cursor % measureTicks)
    const chunkDuration = Math.min(endTick - cursor, distanceToBoundary)
    const figures = decomposeNoteTicks(chunkDuration)

    // Resto menor do que a menor figura da tabela: não há como o notar, e
    // insistir seria um ciclo infinito. Fica por preencher de propósito —
    // `fillRests` cobre-o a seguir com uma pausa.
    if (figures.length === 0) break

    for (const figure of figures) {
      pieces.push({
        ...note,
        startTick: cursor,
        durationTicks: figure.ticks,
        noteType: figure.noteType,
        dots: figure.dots,
        // Preenchidas no fim: só aí se sabe quantos pedaços há ao todo.
        tiedFromPrevious: false,
        tiedToNext: false,
      })
      cursor += figure.ticks
    }
  }

  if (pieces.length === 0) return []

  // Uma nota só volta a ser "uma nota" pela ligadura: todos os pedaços
  // menos o último ligam ao seguinte.
  for (let i = 0; i < pieces.length; i += 1) {
    const piece = pieces[i] as WorkingNote
    piece.tiedFromPrevious = i > 0 || note.tiedFromPrevious
    piece.tiedToNext = i < pieces.length - 1 || note.tiedToNext
  }

  return pieces
}
