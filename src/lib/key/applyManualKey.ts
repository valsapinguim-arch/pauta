import type { KeyMode, ScoreDocument } from '@/lib/types'
import { keySignatureFor } from './keySignatureFor'

/**
 * Correção manual da tonalidade (decisão 6) — mesma lógica do BPM (Tarefa
 * 9, `applyManualBpm`): recalcula só a grafia, nunca repete a inferência
 * nem a quantização. Hoje isso é só a armação (`sharpsOrFlats`); a Tarefa
 * 12 (notação) é que passa a reescrever cada nota com `spellPitch` +
 * `applyAccidentals` a partir daqui — ainda não existe `measures` real para
 * isso mexer.
 *
 * `tonic`/`mode` vêm de um controlo do utilizador, não de deteção —
 * confiança em 1 e `source: 'manual'`.
 */
export function applyManualKey(
  document: ScoreDocument,
  tonic: number,
  mode: KeyMode,
): ScoreDocument {
  return {
    ...document,
    key: {
      tonic,
      mode,
      sharpsOrFlats: keySignatureFor(tonic, mode),
      confidence: 1,
      source: 'manual',
    },
    metadata: {
      ...document.metadata,
      confidence: { ...document.metadata.confidence, key: 1 },
    },
  }
}
