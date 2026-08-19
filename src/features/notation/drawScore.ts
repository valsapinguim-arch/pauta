import type * as VexFlowNamespace from 'vexflow'
import type { ScoreDocument } from '@/lib/types'
import { computeLineBreaks } from './computeLineBreaks'
import { toVexAccidentalCode, toVexKeySignatureSpec, toVexNoteStruct } from './vexflowMapping'

/** O módulo `vexflow` importado dinamicamente (Tarefa 13, decisão 10) — o
 *  chamador (`ScoreView`) é quem faz o `import()` e passa o módulo já
 *  carregado; esta função nunca importa `vexflow` a direito, para não o
 *  puxar de volta para o bundle inicial por acidente. `import type` é
 *  sempre apagado na compilação (nunca gera um `import` a sério em JS),
 *  por isso isto não contradiz a decisão 10 apesar do nome do módulo
 *  aparecer aqui — só o TIPO é usado, nunca o valor. */
export type VexFlowModule = typeof VexFlowNamespace

/** Espaço reservado ao início de cada sistema (linha) para clave + armação
 *  — estimativa, não um valor exato do VexFlow (não há forma barata de o
 *  calcular antes de desenhar). A primeira pauta da peça leva ainda a
 *  indicação de compasso e o andamento, por isso o seu espaço é maior.
 *  Sobrestimar é seguro aqui: só faz uma linha caber um compasso a menos do
 *  que o ótimo, nunca transborda (decisão 3). */
const FIRST_STAVE_OVERHEAD = 150
const LINE_START_OVERHEAD = 70
/** Espaço extra por compasso para as notas respirarem, além do mínimo que o
 *  `Formatter` calcula. */
const NOTE_PADDING = 25

const MARGIN_LEFT = 10
const MARGIN_TOP = 40
const MARGIN_BOTTOM = 20
const LINE_HEIGHT = 130

interface MeasurePlan {
  measureNumber: number
  staveNotes: InstanceType<VexFlowModule['StaveNote']>[]
  /** Este elemento abre um segmento de ligadura para o próximo
   *  (`tie === 'start' | 'continue'`). */
  isTieOpener: boolean[]
  /** Este elemento fecha o segmento de ligadura vindo do anterior
   *  (`tie === 'continue' | 'stop'`) — `'continue'` faz as duas coisas: uma
   *  nota dividida em três ou mais partes sobre barras consecutivas. */
  isTieCloser: boolean[]
}

/** Constrói as `StaveNote` de um compasso — acidentes e pontos já
 *  aplicados (Tarefa 11/10), sem ainda ter pauta nem contexto. */
function buildMeasurePlan(
  vf: VexFlowModule,
  measure: ScoreDocument['measures'][number],
  clef: ScoreDocument['clef'],
): MeasurePlan {
  const staveNotes = measure.elements.map((element) => {
    const { keys, duration } = toVexNoteStruct(element)
    const note = new vf.StaveNote({ keys, duration, clef })

    if (element.kind === 'note') {
      const accidentalCode = toVexAccidentalCode(element.accidental)
      if (accidentalCode) note.addModifier(new vf.Accidental(accidentalCode), 0)
      if (element.dots === 1) vf.Dot.buildAndAttach([note], { all: true })
    } else if (element.dots === 1) {
      vf.Dot.buildAndAttach([note], { all: true })
    }

    return note
  })

  return {
    measureNumber: measure.number,
    staveNotes,
    isTieOpener: measure.elements.map(
      (el) => el.kind === 'note' && (el.tie === 'start' || el.tie === 'continue'),
    ),
    isTieCloser: measure.elements.map(
      (el) => el.kind === 'note' && (el.tie === 'continue' || el.tie === 'stop'),
    ),
  }
}

/** Largura mínima do conteúdo de um compasso (sem espaço de clave/armação)
 *  — usa um `Voice`/`Formatter` descartáveis só para medir; o compasso é
 *  formatado outra vez a sério contra a pauta final em `drawScore`. */
function measureContentWidth(
  vf: VexFlowModule,
  plan: MeasurePlan,
  numBeats: number,
  beatValue: number,
): number {
  const voice = new vf.Voice({ numBeats, beatValue })
  voice.addTickables(plan.staveNotes)
  const formatter = new vf.Formatter()
  formatter.joinVoices([voice])
  return formatter.preCalculateMinTotalWidth([voice]) + NOTE_PADDING
}

export interface DrawScoreResult {
  /** Altura total desenhada, em píxeis — `ScoreView` usa isto para
   *  dimensionar o contentor à volta do SVG (decisão 6: o zoom escala o
   *  SVG, o contentor tem de reservar o espaço escalado). */
  totalHeight: number
}

/**
 * Desenha `document` de raiz dentro de `container` — Tarefa 13. Sempre um
 * redesenho completo (decisão 4): limpa o contentor e reconstrói tudo, sem
 * tentar atualização incremental de elementos VexFlow.
 *
 * `contentWidth` é a largura disponível para o conteúdo musical (já
 * descontado qualquer escala de zoom — `ScoreView` decide isso, esta função
 * só desenha à largura que lhe é dada).
 */
export function drawScore(
  vf: VexFlowModule,
  container: HTMLDivElement,
  document: ScoreDocument,
  contentWidth: number,
): DrawScoreResult {
  container.innerHTML = ''

  const { numerator: numBeats, denominator: beatValue } = document.tempo.timeSignature
  const plans = document.measures.map((measure) => buildMeasurePlan(vf, measure, document.clef))

  const contentWidths = plans.map((plan) => measureContentWidth(vf, plan, numBeats, beatValue))
  const adjustedWidths = contentWidths.map(
    (width, index) => width + (index === 0 ? FIRST_STAVE_OVERHEAD : LINE_START_OVERHEAD),
  )
  const lines = computeLineBreaks(adjustedWidths, contentWidth)

  const totalHeight = MARGIN_TOP + lines.length * LINE_HEIGHT + MARGIN_BOTTOM
  const renderer = new vf.Renderer(container, vf.Renderer.Backends.SVG)
  renderer.resize(Math.max(contentWidth, 1), Math.max(totalHeight, 1))
  const context = renderer.getContext()

  const lastMeasureIndex = plans.length - 1
  const pendingTies: {
    firstNote: InstanceType<VexFlowModule['StaveNote']>
    lastNote: InstanceType<VexFlowModule['StaveNote']>
  }[] = []
  let openTieNote: InstanceType<VexFlowModule['StaveNote']> | null = null

  lines.forEach((line, lineIndex) => {
    let x = MARGIN_LEFT
    const y = MARGIN_TOP + lineIndex * LINE_HEIGHT

    line.forEach((measureIndex, positionInLine) => {
      const plan = plans[measureIndex] as MeasurePlan
      const isFirstOfLine = positionInLine === 0
      const isVeryFirstMeasure = measureIndex === 0
      const overhead = isFirstOfLine
        ? isVeryFirstMeasure
          ? FIRST_STAVE_OVERHEAD
          : LINE_START_OVERHEAD
        : 0
      const width = (contentWidths[measureIndex] as number) + overhead

      const stave = new vf.Stave(x, y, width)
      if (isFirstOfLine) {
        stave.addClef(document.clef)
        stave.addKeySignature(toVexKeySignatureSpec(document.key.tonic, document.key.mode))
      }
      if (isVeryFirstMeasure) {
        stave.addTimeSignature(`${numBeats}/${beatValue}`)
        stave.setTempo({ duration: 'q', bpm: Math.round(document.tempo.bpm) }, -25)
      }
      if (measureIndex === lastMeasureIndex) {
        stave.setEndBarType(vf.Barline.type.END)
      }
      stave.setContext(context).draw()

      const voice = new vf.Voice({ numBeats, beatValue })
      voice.addTickables(plan.staveNotes)
      new vf.Formatter().joinVoices([voice]).formatToStave([voice], stave)
      voice.draw(context, stave)

      const beams = vf.Beam.generateBeams(plan.staveNotes, {
        groups: [new vf.Fraction(1, beatValue)],
      })
      beams.forEach((beam) => beam.setContext(context).draw())

      // `getSVGElement()` do VexFlow procura por `document.getElementById`
      // no `document` global — falha em silêncio se `container` ainda não
      // estiver ligado à árvore do documento (é sempre o caso nos testes, e
      // pode acontecer no primeiro render em React). `querySelectorAll` no
      // próprio `container` funciona nos dois casos, por isso é isto que se
      // usa para encontrar os nós `<g class="vf-stavenote">` que acabaram
      // de ser desenhados por este compasso (decisão 7 da Tarefa 13).
      const stavenoteGroups = Array.from(
        container.querySelectorAll<SVGGElement>('.vf-stavenote'),
      ).slice(-plan.staveNotes.length)

      plan.staveNotes.forEach((note, elementIndex) => {
        const group = stavenoteGroups[elementIndex]
        group?.setAttribute('data-measure', String(plan.measureNumber))
        group?.setAttribute('data-element', String(elementIndex))

        // Ligaduras (decisão 7 da Tarefa 10): liga cada par consecutivo de
        // notas ligadas, mesmo através de uma quebra de sistema — as duas
        // StaveNote já têm posição final (foram desenhadas acima). Uma nota
        // `continue` fecha o segmento anterior E abre o seguinte.
        if (plan.isTieCloser[elementIndex] && openTieNote !== null) {
          pendingTies.push({ firstNote: openTieNote, lastNote: note })
          openTieNote = null
        }
        if (plan.isTieOpener[elementIndex]) {
          openTieNote = note
        }
      })

      x += width
    })
  })

  pendingTies.forEach(({ firstNote, lastNote }) => {
    new vf.StaveTie({
      firstNote,
      lastNote,
      firstIndexes: [0],
      lastIndexes: [0],
    })
      .setContext(context)
      .draw()
  })

  return { totalHeight }
}
