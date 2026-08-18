import { nearestNoteDuration } from './noteDurations'
import type { WorkingNote } from './workingNote'

/**
 * Divide e liga uma nota que atravessa uma ou mais barras de compasso —
 * decisão 7, regra da notação, não escolha. Cada pedaço fica com o `tick`
 * exato onde cai (aritmética exata, nunca reencaixada na tabela de figuras)
 * para que a soma dos pedaços seja sempre igual à duração original; a
 * validação de soma de compasso em `quantize` depende disto.
 *
 * `noteType`/`dots` de cada pedaço vêm de `nearestNoteDuration`, só para a
 * notação visual — na grelha de 1/16 com pontos, um pedaço raro (uma
 * semicorchea com ponto cortada num sítio desalinhado) pode não ter figura
 * exata; a duração real (`durationTicks`) continua correta, só a figura
 * mostrada é a mais próxima.
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
  const endTick = note.startTick + note.durationTicks
  const startMeasure = Math.floor(note.startTick / measureTicks)
  const lastOccupiedMeasure = Math.floor((endTick - 1) / measureTicks)

  if (note.isRest || startMeasure === lastOccupiedMeasure) return [note]

  const pieces: WorkingNote[] = []
  let cursor = note.startTick

  while (cursor < endTick) {
    const distanceToBoundary = measureTicks - (cursor % measureTicks)
    const pieceDuration = Math.min(endTick - cursor, distanceToBoundary)
    const { noteType, dots } = nearestNoteDuration(pieceDuration)

    pieces.push({
      ...note,
      startTick: cursor,
      durationTicks: pieceDuration,
      noteType,
      dots,
      tiedFromPrevious: cursor > note.startTick,
      tiedToNext: cursor + pieceDuration < endTick,
    })

    cursor += pieceDuration
  }

  return pieces
}
