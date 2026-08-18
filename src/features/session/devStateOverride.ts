import type { ScoreDocument } from '@/lib/types'
import type { AudioSource, ProcessingStage, SessionState } from './session.types'

/**
 * Mecanismo de desenvolvimento para forçar um estado via `?state=` — ver
 * Tarefa 3, Âmbito técnico. Permite rever os cinco estados visuais sem
 * pipeline nenhum a funcionar: `?state=processing&stage=preparing-model`,
 * `?state=result`, `?state=error&recoverable=false`, etc.
 *
 * Só ativo em `import.meta.env.DEV` — nunca entra no bundle de produção.
 */

const FAKE_SOURCE: AudioSource = { kind: 'microphone' }

const PROCESSING_STAGES: ProcessingStage[] = [
  'preprocessing',
  'preparing-model',
  'transcribing',
  'analysing',
]

/** Documento de exemplo só para a `ResultView` ter um título e uma duração a
 *  mostrar — a pauta em si é uma imagem estática nesta tarefa (ver
 *  prompts/tasks/03-interface-minima.md, Notas). Confiança alta de propósito:
 *  o aviso de confiança baixa é desenho da Tarefa 13, não desta. */
const FAKE_DOCUMENT: ScoreDocument = {
  metadata: {
    schemaVersion: 1,
    title: 'Escala de Dó maior',
    createdAt: new Date(2026, 0, 1).toISOString(),
    sourceName: null,
    durationSec: 8,
    confidence: { overall: 0.92, notes: 0.94, tempo: 0.9, key: 0.93 },
  },
  tempo: {
    bpm: 96,
    timeSignature: { numerator: 4, denominator: 4 },
    firstBeatSec: 0,
    confidence: 0.9,
    source: 'detected',
  },
  key: { tonic: 0, mode: 'major', sharpsOrFlats: 0, confidence: 0.93, source: 'detected' },
  clef: 'treble',
  measures: [],
}

function fixtureFor(status: string, params: URLSearchParams): SessionState | null {
  switch (status) {
    case 'idle':
      return { status: 'idle' }

    case 'recording':
      return { status: 'recording', source: FAKE_SOURCE, level: 0.55, elapsedMs: 12_000 }

    case 'processing': {
      const requestedStage = params.get('stage')
      const stage = PROCESSING_STAGES.includes(requestedStage as ProcessingStage)
        ? (requestedStage as ProcessingStage)
        : 'transcribing'
      return { status: 'processing', source: FAKE_SOURCE, stage, progress: 0.4 }
    }

    case 'result':
      return { status: 'result', document: FAKE_DOCUMENT }

    case 'error':
      return {
        status: 'error',
        code: 'exemplo-de-erro',
        recoverable: params.get('recoverable') !== 'false',
      }

    default:
      return null
  }
}

export function getDevStateOverride(): SessionState | null {
  if (!import.meta.env.DEV) return null

  const params = new URLSearchParams(window.location.search)
  const status = params.get('state')
  if (!status) return null

  return fixtureFor(status, params)
}
