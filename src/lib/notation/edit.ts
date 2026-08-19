import { keySignatureFor } from '@/lib/key/keySignatureFor'
import { QUANTIZE } from '@/lib/quantize/constants'
import { decomposeRestTicks } from '@/lib/quantize/decomposeRestTicks'
import { ticksForNoteType } from '@/lib/quantize/noteDurations'
import type {
  KeyAnalysis,
  Measure,
  NotationElement,
  NoteType,
  QuantizedNote,
  ScoreDocument,
} from '@/lib/types'
import { chooseClef } from './chooseClef'
import { toNotationElements } from './toNotationElements'
import { validateScoreDocument } from './validateScoreDocument'

/**
 * Edição manual (Tarefa 17) — as cinco operações da decisão 1, todas
 * funções puras que recebem e devolvem um `ScoreDocument`, nunca mutam o
 * recebido (decisão 6, mesmo espírito de `applyManualBpm`/`applyManualKey`/
 * `applyTitle`, Tarefas 9/11/12). Uma posição identifica um elemento pela
 * mesma convenção dos atributos `data-measure`/`data-element` do SVG
 * (Tarefa 13, decisão 7): `measureNumber` é 1-indexado (`Measure.number`),
 * `elementIndex` é 0-indexado dentro de `measure.elements`.
 */
export interface NotationPosition {
  measureNumber: number
  elementIndex: number
}

function ticksOf(element: NotationElement): number {
  const ticks = ticksForNoteType(element.noteType, element.dots)
  if (ticks === undefined) {
    throw new Error(`figura desconhecida: ${element.noteType} (${element.dots} pontos)`)
  }
  return ticks
}

function startTickOf(elements: readonly NotationElement[], index: number): number {
  let tick = 0
  for (let i = 0; i < index; i += 1) {
    tick += ticksOf(elements[i] as NotationElement)
  }
  return tick
}

/** Todas as posições do documento, em ordem de leitura (compasso, depois
 *  elemento) — Tarefa 18, decisão 4: percorrer a pauta com "nota
 *  anterior"/"nota seguinte" é o caminho por teclado para selecionar uma
 *  nota, já que o SVG em si (`role="img"`, decisão 3) não é navegável por
 *  leitor de ecrã. */
export function allPositions(doc: ScoreDocument): NotationPosition[] {
  return doc.measures.flatMap((measure) =>
    measure.elements.map((_, elementIndex) => ({ measureNumber: measure.number, elementIndex })),
  )
}

/** Elemento numa posição — `undefined` se `measureNumber`/`elementIndex` não
 *  corresponderem a nada no documento atual (ex.: uma seleção que ficou
 *  desatualizada depois de um desfazer). Exportado para quem só precisa de
 *  saber o que está selecionado (`useScoreEditor`), sem duplicar esta
 *  procura. */
export function getElementAt(
  doc: ScoreDocument,
  position: NotationPosition,
): NotationElement | undefined {
  const measure = doc.measures.find((candidate) => candidate.number === position.measureNumber)
  return measure?.elements[position.elementIndex]
}

/**
 * Todas as posições da mesma nota ligada (decisão 10) — uma nota sem
 * `sourceIndex` (pausa, ou nota nunca dividida por uma barra) devolve só a
 * própria posição.
 */
export function resolveTiedGroup(
  doc: ScoreDocument,
  position: NotationPosition,
): NotationPosition[] {
  const target = getElementAt(doc, position)
  if (!target || target.kind !== 'note' || target.sourceIndex === null) {
    return [position]
  }

  const group: NotationPosition[] = []
  for (const measure of doc.measures) {
    measure.elements.forEach((element, elementIndex) => {
      if (element.kind === 'note' && element.sourceIndex === target.sourceIndex) {
        group.push({ measureNumber: measure.number, elementIndex })
      }
    })
  }
  return group
}

function positionKey(position: NotationPosition): string {
  return `${position.measureNumber}:${position.elementIndex}`
}

/**
 * Substitui `elements[index]` por `replacement`, absorvendo as pausas
 * consecutivas a seguir (até à próxima nota ou ao fim do compasso) e
 * preenchendo o que sobrar com pausas novas — nunca desloca o que vem
 * antes nem depois do espaço absorvido (decisão 5). `null` quando
 * `replacement` não cabe no espaço livre à frente; quem chama decide o que
 * fazer com isso (hoje: devolver o documento sem alteração — Notas da
 * Tarefa 17 aceitam esta restrição em vez de requantizar o resto do
 * compasso).
 */
function resizeAt(
  elements: readonly NotationElement[],
  index: number,
  replacement: NotationElement,
): NotationElement[] | null {
  const startTick = startTickOf(elements, index)
  const replacementTicks = ticksOf(replacement)

  let endIndex = index
  let availableTicks = ticksOf(elements[index] as NotationElement)
  while (
    endIndex + 1 < elements.length &&
    (elements[endIndex + 1] as NotationElement).kind === 'rest'
  ) {
    endIndex += 1
    availableTicks += ticksOf(elements[endIndex] as NotationElement)
  }

  if (replacementTicks > availableTicks) return null

  const restElements: NotationElement[] = decomposeRestTicks(
    startTick + replacementTicks,
    startTick + availableTicks,
    QUANTIZE.BEAT_TICKS,
    QUANTIZE.MEASURE_TICKS,
  ).map((rest) => ({ kind: 'rest', noteType: rest.noteType, dots: rest.dots }))

  return [
    ...elements.slice(0, index),
    replacement,
    ...restElements,
    ...elements.slice(endIndex + 1),
  ]
}

/** `Measure[]` → `QuantizedNote[]` — o formato que `toNotationElements` e
 *  `chooseClef` (Tarefa 12) já sabem processar, reaproveitado aqui em vez
 *  de reimplementar a grafia e a escolha de clave a partir de
 *  `NotationElement[]`. */
function elementsToQuantizedNotes(measures: readonly Measure[]): QuantizedNote[] {
  const notes: QuantizedNote[] = []

  measures.forEach((measure, measureIndex) => {
    let tick = 0
    for (const element of measure.elements) {
      const ticks = ticksOf(element)
      notes.push({
        pitchMidi: element.kind === 'note' ? element.pitchMidi : null,
        startTick: tick,
        durationTicks: ticks,
        noteType: element.noteType,
        dots: element.dots,
        isRest: element.kind === 'rest',
        tiedToNext:
          element.kind === 'note' && (element.tie === 'start' || element.tie === 'continue'),
        tiedFromPrevious:
          element.kind === 'note' && (element.tie === 'stop' || element.tie === 'continue'),
        sourceIndex: element.kind === 'note' ? element.sourceIndex : null,
        measureIndex,
      })
      tick += ticks
    }
  })

  return notes
}

/** Reaplica grafia e acidentes (`toNotationElements`, Tarefa 12) depois de
 *  qualquer edição que mude alturas ou a sequência de elementos de um
 *  compasso — a memória de acidentes de `applyAccidentals` é sequencial
 *  por compasso, por isso até uma edição "só de ritmo" (ex.: `deleteNote`
 *  transforma uma nota em pausa) pode mudar se uma nota mais à frente
 *  ainda precisa de mostrar o seu acidente. Mais barato do que raciocinar
 *  caso a caso sobre quando é seguro saltar isto. */
function respellMeasures(measures: readonly Measure[], keyAnalysis: KeyAnalysis): Measure[] {
  const quantized = elementsToQuantizedNotes(measures)
  const respelled = toNotationElements(quantized, keyAnalysis)

  let cursor = 0
  return measures.map((measure) => {
    const count = measure.elements.length
    const elements = respelled.slice(cursor, cursor + count)
    cursor += count
    return { ...measure, elements }
  })
}

function withMeasures(doc: ScoreDocument, measures: Measure[]): ScoreDocument {
  const next: ScoreDocument = { ...doc, measures }
  validateScoreDocument(next)
  return next
}

/** Altera a altura de uma nota (e de todas as partes da sua nota ligada,
 *  decisão 10) por semitons — decisão 4. Sem efeito numa pausa ou numa
 *  posição inexistente. */
export function changePitch(
  doc: ScoreDocument,
  position: NotationPosition,
  semitones: number,
): ScoreDocument {
  const target = getElementAt(doc, position)
  if (!target || target.kind !== 'note') return doc

  const groupKeys = new Set(resolveTiedGroup(doc, position).map(positionKey))

  const measures = doc.measures.map((measure) => ({
    ...measure,
    elements: measure.elements.map((element, elementIndex) => {
      if (element.kind !== 'note') return element
      if (!groupKeys.has(positionKey({ measureNumber: measure.number, elementIndex })))
        return element
      return { ...element, pitchMidi: element.pitchMidi + semitones }
    }),
  }))

  return withMeasures(doc, respellMeasures(measures, doc.key))
}

/** Requantiza só o compasso afetado (decisão 5): a nota muda de figura, o
 *  espaço livre à frente (a própria nota mais quaisquer pausas seguintes,
 *  até à próxima nota) absorve a diferença. Se a nova figura não couber
 *  nesse espaço, devolve o documento sem alteração — a alternativa aceite
 *  pelas Notas/Dependências da Tarefa 17 em vez de requantizar o resto do
 *  compasso. */
export function changeDuration(
  doc: ScoreDocument,
  position: NotationPosition,
  noteType: NoteType,
  dots: 0 | 1,
): ScoreDocument {
  const measureIndex = doc.measures.findIndex(
    (measure) => measure.number === position.measureNumber,
  )
  if (measureIndex === -1) return doc
  const measure = doc.measures[measureIndex] as Measure
  const target = measure.elements[position.elementIndex]
  if (!target) return doc

  const replacement: NotationElement =
    target.kind === 'note' ? { ...target, noteType, dots } : { kind: 'rest', noteType, dots }

  const resized = resizeAt(measure.elements, position.elementIndex, replacement)
  if (!resized) return doc

  const measures = doc.measures.map((current, index) =>
    index === measureIndex ? { ...current, elements: resized } : current,
  )

  return withMeasures(doc, respellMeasures(measures, doc.key))
}

/** Substitui uma nota (e as restantes partes da sua nota ligada, decisão
 *  10) por uma pausa da mesma duração — decisão 1. Sem efeito numa pausa
 *  já existente. */
export function deleteNote(doc: ScoreDocument, position: NotationPosition): ScoreDocument {
  const target = getElementAt(doc, position)
  if (!target || target.kind !== 'note') return doc

  const groupKeys = new Set(resolveTiedGroup(doc, position).map(positionKey))

  const measures = doc.measures.map((measure) => ({
    ...measure,
    elements: measure.elements.map((element, elementIndex): NotationElement => {
      if (!groupKeys.has(positionKey({ measureNumber: measure.number, elementIndex })))
        return element
      return { kind: 'rest', noteType: element.noteType, dots: element.dots }
    }),
  }))

  return withMeasures(doc, respellMeasures(measures, doc.key))
}

/** Insere uma nota no lugar de uma pausa — decisão 1. Mesma regra de
 *  espaço da decisão 5: a nova nota absorve a pausa alvo mais as pausas
 *  seguintes até à próxima nota; se não couber, devolve o documento sem
 *  alteração. Sem efeito se a posição não for uma pausa (inserir sobre uma
 *  nota já existente não está no âmbito da decisão 1 — é `changePitch`).
 *  Grafia e oitava vêm inteiramente de `respellMeasures`: os valores aqui
 *  são só um marcador de posição descartado antes de o documento sair
 *  desta função. */
export function insertNote(
  doc: ScoreDocument,
  position: NotationPosition,
  pitchMidi: number,
  noteType: NoteType,
): ScoreDocument {
  const measureIndex = doc.measures.findIndex(
    (measure) => measure.number === position.measureNumber,
  )
  if (measureIndex === -1) return doc
  const measure = doc.measures[measureIndex] as Measure
  const target = measure.elements[position.elementIndex]
  if (!target || target.kind !== 'rest') return doc

  const replacement: NotationElement = {
    kind: 'note',
    step: 'C',
    alter: 0,
    octave: 4,
    pitchMidi,
    noteType,
    dots: 0,
    accidental: null,
    tie: null,
    sourceIndex: null,
  }

  const resized = resizeAt(measure.elements, position.elementIndex, replacement)
  if (!resized) return doc

  const measures = doc.measures.map((current, index) =>
    index === measureIndex ? { ...current, elements: resized } : current,
  )

  return withMeasures(doc, respellMeasures(measures, doc.key))
}

/** Transpõe a peça inteira por semitons — decisão 9: recalcula alturas,
 *  tonalidade, grafia e clave, nunca só a armação. `mode` mantém-se (só a
 *  tónica se desloca); a confiança da tonalidade passa a 1/`'manual'`,
 *  mesma convenção de `applyManualKey` para qualquer correção explícita do
 *  utilizador. */
export function transpose(doc: ScoreDocument, semitones: number): ScoreDocument {
  const measures = doc.measures.map((measure) => ({
    ...measure,
    elements: measure.elements.map((element): NotationElement =>
      element.kind === 'note' ? { ...element, pitchMidi: element.pitchMidi + semitones } : element,
    ),
  }))

  const tonic = (((doc.key.tonic + semitones) % 12) + 12) % 12
  const key: KeyAnalysis = {
    tonic,
    mode: doc.key.mode,
    sharpsOrFlats: keySignatureFor(tonic, doc.key.mode),
    confidence: 1,
    source: 'manual',
  }

  const respelled = respellMeasures(measures, key)
  const clef = chooseClef(elementsToQuantizedNotes(respelled))

  const next: ScoreDocument = {
    ...doc,
    key,
    clef,
    measures: respelled,
    metadata: { ...doc.metadata, confidence: { ...doc.metadata.confidence, key: 1 } },
  }
  validateScoreDocument(next)
  return next
}
