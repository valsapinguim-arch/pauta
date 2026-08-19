import { edit, result } from '@/strings'
import type { NotationElement, NoteType, ScoreDocument, Step } from '@/lib/types'

/** Nomes pt-PT dos graus da escala (Tarefa 18, decisão 3) — separado de
 *  `result.noteNames` (Tarefa 9), que é indexado por classe de altura
 *  cromática (0-11) para o controlo de tonalidade, não por `Step`. */
const STEP_NAMES: Record<Step, string> = {
  C: 'dó',
  D: 'ré',
  E: 'mi',
  F: 'fá',
  G: 'sol',
  A: 'lá',
  B: 'si',
}

const ACCIDENTAL_NAMES: Record<'sharp' | 'flat' | 'natural', string> = {
  sharp: 'sustenido',
  flat: 'bemol',
  natural: 'natural',
}

function noteTypeName(noteType: NoteType, dots: 0 | 1): string {
  const base = edit.noteTypeNames[noteType].toLowerCase()
  return dots === 1 ? `${base} pontuada` : base
}

function pitchName(step: Step, octave: number): string {
  return `${STEP_NAMES[step]}${octave}`
}

/**
 * Resumo da partitura (Tarefa 18, decisão 3) — tonalidade, compasso,
 * andamento, número de compassos e tessitura. É o texto que vai no
 * `aria-label` do `<svg>` da pauta (`ScoreView`): não há forma de tornar o
 * desenho do VexFlow navegável por leitor de ecrã, mas um resumo dá o
 * essencial de imediato, sem precisar de pedir a lista completa
 * (`describeNotes`).
 *
 * Pura: só lê `ScoreDocument`, nunca o DOM nem o `<svg>` desenhado — os
 * dois ficam sempre coerentes por construção (o resumo vem exatamente do
 * mesmo documento que o VexFlow desenha).
 */
export function describeScore(document: ScoreDocument): string {
  const { key, tempo, clef, measures } = document
  const keyName = `${result.noteNames[key.tonic]} ${result.modeLabels[key.mode]}`
  const timeSignature = `${tempo.timeSignature.numerator}/${tempo.timeSignature.denominator}`
  const bpm = Math.round(tempo.bpm)
  const measureCount = measures.length
  const measureWord = measureCount === 1 ? 'compasso' : 'compassos'

  const pitches = measures
    .flatMap((measure) => measure.elements)
    .filter((element): element is NotationElement & { kind: 'note' } => element.kind === 'note')

  const range =
    pitches.length === 0
      ? null
      : pitches.reduce(
          (acc, note) => ({
            lowest: note.pitchMidi < acc.lowest.pitchMidi ? note : acc.lowest,
            highest: note.pitchMidi > acc.highest.pitchMidi ? note : acc.highest,
          }),
          {
            lowest: pitches[0] as (typeof pitches)[number],
            highest: pitches[0] as (typeof pitches)[number],
          },
        )

  const clefName = clef === 'treble' ? 'clave de sol' : 'clave de fá'
  const rangeText = range
    ? `, de ${pitchName(range.lowest.step, range.lowest.octave)} a ${pitchName(range.highest.step, range.highest.octave)}`
    : ''

  return `${keyName}, compasso ${timeSignature}, ${bpm} BPM, ${clefName}, ${measureCount} ${measureWord}${rangeText}.`
}

function describeElement(element: NotationElement): string {
  if (element.kind === 'rest') {
    return `pausa de ${noteTypeName(element.noteType, element.dots)}`
  }

  const accidental = element.accidental ? ` ${ACCIDENTAL_NAMES[element.accidental]}` : ''
  const duration = noteTypeName(element.noteType, element.dots)
  const tie = element.tie ? ', ligada' : ''
  return `${STEP_NAMES[element.step]}${accidental} ${duration}${tie}`
}

/**
 * Lista textual das notas, compasso a compasso (Tarefa 18, decisão 3) —
 * "compasso 1: dó semínima, ré semínima…". Gerada do documento, por isso é
 * sempre coerente com o que está desenhado — nunca pode divergir da pauta
 * porque não há um segundo sítio onde a informação viva. Disponível a
 * pedido (não sempre visível): é densa de mais para ler de cada vez que a
 * pauta muda, mas é o que permite mesmo verificar o que foi transcrito sem
 * saber ler pauta.
 */
export function describeNotes(document: ScoreDocument): string {
  return document.measures
    .map((measure) => {
      const elements = measure.elements.map(describeElement).join(', ')
      return `Compasso ${measure.number}: ${elements}.`
    })
    .join(' ')
}
