import { NOTE_DURATIONS } from '@/lib/quantize/noteDurations'
import type { NotationElement, NoteType, ScoreDocument, TieRole } from '@/lib/types'
import { TICKS_PER_QUARTER } from '@/lib/types'
import { escapeXml } from './escapeXml'

/** `${noteType}-${dots}` -> ticks — mesma tabela e mesma técnica de
 *  `@/lib/playback/scoreToEvents`, aplicada aqui a `divisions` em vez de
 *  segundos. `divisions` == `TICKS_PER_QUARTER` (decisão 1 da Tarefa 1,
 *  confirmada na Tarefa 15): o `<duration>` de cada nota é o próprio valor
 *  de ticks, sem conversão nenhuma. */
const TICKS_BY_FIGURE = new Map(
  NOTE_DURATIONS.map((duration) => [`${duration.noteType}-${duration.dots}`, duration.ticks]),
)

function ticksForElement(element: NotationElement): number {
  const ticks = TICKS_BY_FIGURE.get(`${element.noteType}-${element.dots}`)
  if (ticks === undefined) {
    throw new Error(`Figura desconhecida: ${element.noteType} com ${element.dots} ponto(s)`)
  }
  return ticks
}

/** `NoteType` -> nome do elemento `<type>` do MusicXML. */
const MUSICXML_TYPE: Record<NoteType, string> = {
  whole: 'whole',
  half: 'half',
  quarter: 'quarter',
  eighth: 'eighth',
  sixteenth: '16th',
}

/** Sinal e linha da clave (só há duas nesta app, Tarefa 12 decisão 3). */
const CLEF_XML: Record<ScoreDocument['clef'], { sign: string; line: number }> = {
  treble: { sign: 'G', line: 2 },
  bass: { sign: 'F', line: 4 },
}

/**
 * Um par `<tie>`/`<tied>` por transição de `TieRole` — `'continue'` fecha o
 * segmento anterior E abre o seguinte na mesma nota, por isso produz DOIS
 * elementos de cada (Tarefa 15, Guardrails: "ligaduras (`tie` e `tied`)").
 * `<tie>` é o elemento sonoro (obrigatório antes de `<duration>` no
 * MusicXML); `<tied>`, dentro de `<notations>`, é a curva visual.
 */
function tieTypes(tie: TieRole): ('start' | 'stop')[] {
  if (tie === 'start') return ['start']
  if (tie === 'stop') return ['stop']
  if (tie === 'continue') return ['stop', 'start']
  return []
}

function noteXml(element: NotationElement): string {
  const ticks = ticksForElement(element)
  const type = MUSICXML_TYPE[element.noteType]
  const dot = element.dots === 1 ? '\n      <dot/>' : ''

  if (element.kind === 'rest') {
    return `    <note>\n      <rest/>\n      <duration>${ticks}</duration>\n      <type>${type}</type>${dot}\n    </note>`
  }

  const alter = element.alter !== 0 ? `\n        <alter>${element.alter}</alter>` : ''
  const pitch = `      <pitch>\n        <step>${element.step}</step>${alter}\n        <octave>${element.octave}</octave>\n      </pitch>`

  const ties = tieTypes(element.tie)
  const tieSound = ties.map((type_) => `\n      <tie type="${type_}"/>`).join('')
  const accidental =
    element.accidental !== null ? `\n      <accidental>${element.accidental}</accidental>` : ''

  const tiedNotations = ties.map((type_) => `\n        <tied type="${type_}"/>`).join('')
  const notations = ties.length > 0 ? `\n      <notations>${tiedNotations}\n      </notations>` : ''

  return `    <note>\n${pitch}\n      <duration>${ticks}</duration>${tieSound}\n      <type>${type}</type>${dot}${accidental}${notations}\n    </note>`
}

/** Data de codificação (Tarefa 15, Âmbito técnico) a partir de
 *  `metadata.createdAt` — nunca `new Date()`: mantém o gerador uma função
 *  pura e determinística (o momento relevante é o da transcrição, não o do
 *  clique em "exportar"). */
function encodingDate(createdAtIso: string): string {
  return createdAtIso.slice(0, 10)
}

/**
 * `ScoreDocument` -> MusicXML `score-partwise` 4.0, sem compressão (Tarefa
 * 15, decisão 1) — construído por concatenação de string (decisão 2), nunca
 * `XMLSerializer`/`DOMParser` (proibido em `@/lib`, guardrail em
 * `AGENTS.md`). Só as Tarefas 12/13/17 (via `ScoreDocument`) decidem o que
 * está na pauta; esta função só traduz.
 */
export function toMusicXml(scoreDocument: ScoreDocument): string {
  const { metadata, tempo, key, clef, measures } = scoreDocument
  const clefXml = CLEF_XML[clef]
  const bpm = Math.round(tempo.bpm)

  const measuresXml = measures
    .map((measure) => {
      const attributes =
        measure.number === 1
          ? `\n    <attributes>\n      <divisions>${TICKS_PER_QUARTER}</divisions>\n      <key>\n        <fifths>${key.sharpsOrFlats}</fifths>\n        <mode>${key.mode}</mode>\n      </key>\n      <time>\n        <beats>${tempo.timeSignature.numerator}</beats>\n        <beat-type>${tempo.timeSignature.denominator}</beat-type>\n      </time>\n      <clef>\n        <sign>${clefXml.sign}</sign>\n        <line>${clefXml.line}</line>\n      </clef>\n    </attributes>\n    <direction placement="above">\n      <direction-type>\n        <metronome parentheses="no">\n          <beat-unit>quarter</beat-unit>\n          <per-minute>${bpm}</per-minute>\n        </metronome>\n      </direction-type>\n      <sound tempo="${bpm}"/>\n    </direction>`
          : ''

      const notesXml = measure.elements.map(noteXml).join('\n')

      return `  <measure number="${measure.number}">${attributes}\n${notesXml}\n  </measure>`
    })
    .join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 4.0 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">
<score-partwise version="4.0">
  <work>
    <work-title>${escapeXml(metadata.title)}</work-title>
  </work>
  <identification>
    <encoding>
      <software>pauta</software>
      <encoding-date>${encodingDate(metadata.createdAt)}</encoding-date>
    </encoding>
  </identification>
  <movement-title>${escapeXml(metadata.title)}</movement-title>
  <part-list>
    <score-part id="P1">
      <part-name>Melodia</part-name>
    </score-part>
  </part-list>
  <part id="P1">
${measuresXml}
  </part>
</score-partwise>
`
}
