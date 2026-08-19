import { SCHEMA_VERSION } from '@/lib/types'
import type {
  KeyAnalysis,
  Measure,
  NotationElement,
  QuantizedNote,
  ScoreDocument,
  TempoMap,
} from '@/lib/types'
import { aggregateConfidence } from './aggregateConfidence'
import { chooseClef } from './chooseClef'
import { groupIntoMeasures } from './groupIntoMeasures'
import { toNotationElements } from './toNotationElements'
import { validateScoreDocument } from './validateScoreDocument'

/** Congela o documento (decisão 7: imutável) — recursivamente, para que uma
 *  mutação a `measures[0].elements[0]` também falhe em silêncio (modo não
 *  estrito) ou lance (modo estrito), não só uma ao nível de topo. */
function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value)
    for (const key of Object.keys(value)) {
      deepFreeze((value as Record<string, unknown>)[key])
    }
  }
  return value
}

export interface BuildScoreDocumentMetadata {
  title: string
  createdAt: string
  /** `null` = microfone — mesma convenção de `ScoreMetadata.sourceName`. */
  sourceName: string | null
  durationSec: number
  /** Confiança da limpeza de notas (Tarefa 8, `cleanNotes`) — a única das
   *  três fontes de `aggregateConfidence` que não vem já embutida em
   *  `tempoMap`/`keyAnalysis`. */
  notesConfidence: number
}

export interface BuildScoreDocumentInput {
  quantizedNotes: QuantizedNote[]
  tempoMap: TempoMap
  keyAnalysis: KeyAnalysis
  metadata: BuildScoreDocumentMetadata
}

/**
 * Encadeia o modelo de notação — Âmbito técnico da Tarefa 12. Última etapa
 * do pipeline em `@/lib`: a partir daqui só existe `ScoreDocument`, nunca
 * mais `QuantizedNote[]` (guardrail em `AGENTS.md`).
 *
 * Determinístico por construção: nenhuma chamada aqui dentro lê relógio,
 * aleatoriedade, ou depende de ordem de iteração de objeto — `createdAt` e
 * as confianças vêm todos de `input`, nunca calculados aqui (Tarefa 12,
 * Notas: "é condição para os testes de fixtures da Tarefa 20").
 */
export function buildScoreDocument(input: BuildScoreDocumentInput): ScoreDocument {
  const { quantizedNotes, tempoMap, keyAnalysis, metadata } = input

  const clef = chooseClef(quantizedNotes)
  const elements = toNotationElements(quantizedNotes, keyAnalysis)
  const groupedNotes = groupIntoMeasures(quantizedNotes)

  let elementCursor = 0
  const measures: Measure[] = groupedNotes.map((notesInMeasure, index) => {
    const measureElements: NotationElement[] = notesInMeasure.map(
      () => elements[elementCursor++] as NotationElement,
    )
    return { number: index + 1, elements: measureElements }
  })

  const document: ScoreDocument = {
    metadata: {
      schemaVersion: SCHEMA_VERSION,
      title: metadata.title,
      createdAt: metadata.createdAt,
      sourceName: metadata.sourceName,
      durationSec: metadata.durationSec,
      confidence: aggregateConfidence(
        metadata.notesConfidence,
        tempoMap.confidence,
        keyAnalysis.confidence,
      ),
    },
    tempo: tempoMap,
    key: keyAnalysis,
    clef,
    measures,
  }

  validateScoreDocument(document)
  return deepFreeze(document)
}
