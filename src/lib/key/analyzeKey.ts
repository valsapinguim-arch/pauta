import type { KeyAnalysis, QuantizedNote } from '@/lib/types'
import { KEY } from './constants'
import { detectKey } from './detectKey'
import { keySignatureFor } from './keySignatureFor'
import { pitchClassHistogram } from './pitchClassHistogram'

/** Caminho alternativo da decisão 5: dó maior, sem armação, `source:
 *  'assumed'`. O caso neutro — nunca lança, mesmo com entrada vazia. */
function assumedCMajor(): KeyAnalysis {
  return { tonic: 0, mode: 'major', sharpsOrFlats: 0, confidence: 0, source: 'assumed' }
}

/**
 * Encadeia a deteção de tonalidade — Tarefa 11: histograma ponderado por
 * duração → correlação com os 24 perfis → armação. `notes` tem de vir da
 * Tarefa 10 (`QuantizedNote[]`), já quantizado.
 */
export function analyzeKey(notes: QuantizedNote[]): KeyAnalysis {
  const realNoteCount = notes.filter((note) => !note.isRest).length
  if (realNoteCount < KEY.MIN_NOTES_FOR_ESTIMATE) return assumedCMajor()

  const histogram = pitchClassHistogram(notes)
  const { tonic, mode, confidence } = detectKey(histogram)

  if (confidence < KEY.MIN_CONFIDENCE) return assumedCMajor()

  return {
    tonic,
    mode,
    sharpsOrFlats: keySignatureFor(tonic, mode),
    confidence,
    source: 'detected',
  }
}
