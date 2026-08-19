import type { Accidental, KeyAnalysis, QuantizedNote } from '@/lib/types'
import { armatureAlterForStep } from './armatureAlterForStep'
import { spellPitch } from './spellPitch'
import type { SpelledPitch } from './spellPitch'

export interface AccidentalNote extends SpelledPitch {
  accidental: Accidental
}

/**
 * Decide a grafia e o acidente visível de cada nota — Âmbito técnico da
 * Tarefa 11, decisão 4. Devolve um elemento por entrada de `notes` (mesma
 * ordem e comprimento), `null` nas pausas — quem chama (Tarefa 12) alinha
 * por índice.
 *
 * Um acidente só aparece quando a grafia da nota difere do que já está em
 * efeito para aquela posição (linha/espaço = grau + oitava) NESTE compasso
 * — a armação por omissão, ou o último acidente visto nesse compasso, o que
 * for mais recente. Repetições da mesma alteração não repetem o acidente.
 *
 * Uma nota ligada a partir da anterior (`tiedFromPrevious`, Tarefa 10,
 * decisão 7) nunca mostra acidente — é a mesma nota, só dividida pela barra
 * — mas atualiza a memória do compasso na mesma, para que uma nota seguinte
 * à parte ligada (mesma altura, já sem ligadura) também não repita.
 */
export function applyAccidentals(
  notes: QuantizedNote[],
  keyAnalysis: KeyAnalysis,
): (AccidentalNote | null)[] {
  const results: (AccidentalNote | null)[] = []
  let currentMeasure: number | null = null
  let activeAlters = new Map<string, -1 | 0 | 1>()

  for (const note of notes) {
    if (note.isRest || note.pitchMidi === null) {
      results.push(null)
      continue
    }

    if (note.measureIndex !== currentMeasure) {
      currentMeasure = note.measureIndex
      activeAlters = new Map()
    }

    const spelled = spellPitch(note.pitchMidi, keyAnalysis)
    const positionKey = `${spelled.step}${spelled.octave}`
    const armatureAlter = armatureAlterForStep(spelled.step, keyAnalysis.sharpsOrFlats)
    const effectiveAlter = activeAlters.get(positionKey) ?? armatureAlter

    let accidental: Accidental = null
    if (!note.tiedFromPrevious && spelled.alter !== effectiveAlter) {
      accidental = spelled.alter === 1 ? 'sharp' : spelled.alter === -1 ? 'flat' : 'natural'
    }

    activeAlters.set(positionKey, spelled.alter)
    results.push({ ...spelled, accidental })
  }

  return results
}
