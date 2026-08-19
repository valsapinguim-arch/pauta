import { NOTE_DURATIONS } from '@/lib/quantize/noteDurations'
import { QUANTIZE } from '@/lib/quantize/constants'
import type { NoteType, ScoreDocument } from '@/lib/types'

/** Erro nomeado (decisão 6) — falha explícita, nunca um documento inválido
 *  devolvido em silêncio. */
export class ScoreDocumentValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ScoreDocumentValidationError'
  }
}

const DURATION_TICKS = new Map<string, number>(
  NOTE_DURATIONS.map((duration) => [`${duration.noteType}:${duration.dots}`, duration.ticks]),
)

const VALID_NOTE_TYPES: ReadonlySet<NoteType> = new Set([
  'whole',
  'half',
  'quarter',
  'eighth',
  'sixteenth',
])

/** Gama plausível de alturas MIDI — generosa (contrabaixo grave a flautim
 *  agudo), só para apanhar um índice trocado ou uma oitava a mais/a menos,
 *  não para restringir o instrumento. */
const MIN_PLAUSIBLE_MIDI = 12
const MAX_PLAUSIBLE_MIDI = 120

function ticksFor(noteType: NoteType, dots: 0 | 1): number {
  const ticks = DURATION_TICKS.get(`${noteType}:${dots}`)
  if (ticks === undefined) {
    throw new ScoreDocumentValidationError(`figura desconhecida: ${noteType} (${dots} pontos)`)
  }
  return ticks
}

/**
 * Validação estrutural — Tarefa 12, decisão 6. Verifica que cada compasso
 * soma exatamente `QUANTIZE.MEASURE_TICKS`, que as ligaduras emparelham
 * (um `'start'` sempre com o seu `'stop'`, nunca a atravessar o fim do
 * documento), que as alturas estão numa gama plausível e que as figuras são
 * das permitidas. Lança `ScoreDocumentValidationError` com o primeiro
 * problema encontrado — não recolhe todos, a primeira falha já impede o
 * documento de avançar.
 */
export function validateScoreDocument(document: ScoreDocument): void {
  let tieOpen = false

  for (const measure of document.measures) {
    let measureTicks = 0

    for (const element of measure.elements) {
      if (!VALID_NOTE_TYPES.has(element.noteType)) {
        throw new ScoreDocumentValidationError(
          `compasso ${measure.number}: figura não permitida "${element.noteType}"`,
        )
      }
      measureTicks += ticksFor(element.noteType, element.dots)

      if (element.kind === 'rest') continue

      if (element.pitchMidi < MIN_PLAUSIBLE_MIDI || element.pitchMidi > MAX_PLAUSIBLE_MIDI) {
        throw new ScoreDocumentValidationError(
          `compasso ${measure.number}: altura MIDI ${element.pitchMidi} fora da gama plausível`,
        )
      }

      if (element.tie === 'start') {
        if (tieOpen) {
          throw new ScoreDocumentValidationError(
            `compasso ${measure.number}: ligadura "start" com outra já aberta`,
          )
        }
        tieOpen = true
      } else if (element.tie === 'continue' || element.tie === 'stop') {
        if (!tieOpen) {
          throw new ScoreDocumentValidationError(
            `compasso ${measure.number}: ligadura "${element.tie}" sem "start" correspondente`,
          )
        }
        if (element.tie === 'stop') tieOpen = false
      } else if (tieOpen) {
        throw new ScoreDocumentValidationError(
          `compasso ${measure.number}: nota sem ligadura a meio de uma ligadura aberta`,
        )
      }
    }

    if (measureTicks !== QUANTIZE.MEASURE_TICKS) {
      throw new ScoreDocumentValidationError(
        `compasso ${measure.number} soma ${measureTicks} ticks, esperado ${QUANTIZE.MEASURE_TICKS}`,
      )
    }
  }

  if (tieOpen) {
    throw new ScoreDocumentValidationError('ligadura aberta sem "stop" no fim do documento')
  }
}
