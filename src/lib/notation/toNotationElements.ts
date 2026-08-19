import { applyAccidentals } from '@/lib/key/applyAccidentals'
import type { AccidentalNote } from '@/lib/key/applyAccidentals'
import type { KeyAnalysis, NotationElement, QuantizedNote, TieRole } from '@/lib/types'

/** `tiedToNext`/`tiedFromPrevious` (Tarefa 10) → `TieRole` do modelo de
 *  notação. Uma nota com as duas é o meio de uma nota dividida em três ou
 *  mais partes sobre barras consecutivas. */
function tieRoleFor(note: QuantizedNote): TieRole {
  if (note.tiedFromPrevious && note.tiedToNext) return 'continue'
  if (note.tiedFromPrevious) return 'stop'
  if (note.tiedToNext) return 'start'
  return null
}

/**
 * Converte `QuantizedNote[]` em `NotationElement[]` — Âmbito técnico da
 * Tarefa 12. Usa `spellPitch`/`applyAccidentals` da Tarefa 11 para decidir
 * grafia e acidentes; esta função só monta a forma final, não decide nada
 * sobre tonalidade.
 */
export function toNotationElements(
  notes: QuantizedNote[],
  keyAnalysis: KeyAnalysis,
): NotationElement[] {
  const spelled = applyAccidentals(notes, keyAnalysis)

  return notes.map((note, index) => {
    if (note.isRest) {
      return { kind: 'rest', noteType: note.noteType, dots: note.dots }
    }

    const { step, alter, octave, accidental } = spelled[index] as AccidentalNote

    return {
      kind: 'note',
      step,
      alter,
      octave,
      pitchMidi: note.pitchMidi as number,
      noteType: note.noteType,
      dots: note.dots,
      accidental,
      tie: tieRoleFor(note),
      sourceIndex: note.sourceIndex,
    }
  })
}
