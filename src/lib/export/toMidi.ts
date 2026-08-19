import { NOTE_DURATIONS } from '@/lib/quantize/noteDurations'
import type { NotationElement, ScoreDocument, TieRole } from '@/lib/types'
import { TICKS_PER_QUARTER } from '@/lib/types'
import { EXPORT } from './constants'

/** `${noteType}-${dots}` -> ticks, mesma tabela e técnica de
 *  `@/lib/playback/scoreToEvents` e `toMusicXml.ts` — os ticks internos SÃO
 *  os ticks do MIDI (`TICKS_PER_QUARTER` == divisão do ficheiro, Tarefa 15
 *  Guardrails), sem conversão nenhuma. */
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

interface MidiNote {
  pitchMidi: number
  startTick: number
  durationTicks: number
}

/** Percorre o `ScoreDocument` e funde notas ligadas num só evento MIDI —
 *  sem isto, uma ligadura soaria como duas notas retocadas (`note on`
 *  repetido), audivelmente diferente do que a pauta mostra (mesma ideia da
 *  Tarefa 14, `mergeTiedNotes`, aqui em ticks/altura MIDI em vez de
 *  segundos/frequência). */
function collectNotes(scoreDocument: ScoreDocument): MidiNote[] {
  const notes: MidiNote[] = []
  let previousTie: TieRole = null
  let previousSourceIndex: number | null = null
  let tick = 0

  for (const measure of scoreDocument.measures) {
    for (const element of measure.elements) {
      const ticks = ticksForElement(element)

      if (element.kind === 'note') {
        const last = notes.at(-1)
        const continuesTie =
          last !== undefined &&
          previousSourceIndex !== null &&
          previousSourceIndex === element.sourceIndex &&
          (previousTie === 'start' || previousTie === 'continue') &&
          (element.tie === 'continue' || element.tie === 'stop')

        if (continuesTie && last !== undefined) {
          last.durationTicks += ticks
        } else {
          notes.push({ pitchMidi: element.pitchMidi, startTick: tick, durationTicks: ticks })
        }
        previousTie = element.tie
        previousSourceIndex = element.sourceIndex
      } else {
        previousTie = null
        previousSourceIndex = null
      }

      tick += ticks
    }
  }

  return notes
}

/** _Variable-length quantity_ do formato MIDI: 7 bits de dados por byte, o
 *  bit mais significativo assinala "há mais um byte a seguir" em todos
 *  menos no último. */
function encodeVariableLength(value: number): number[] {
  const bytes = [value & 0x7f]
  let remaining = value >> 7
  while (remaining > 0) {
    bytes.push((remaining & 0x7f) | 0x80)
    remaining >>= 7
  }
  return bytes.reverse()
}

function uint16(value: number): number[] {
  return [(value >> 8) & 0xff, value & 0xff]
}

function uint24(value: number): number[] {
  return [(value >> 16) & 0xff, (value >> 8) & 0xff, value & 0xff]
}

function uint32(value: number): number[] {
  return [(value >> 24) & 0xff, (value >> 16) & 0xff, (value >> 8) & 0xff, value & 0xff]
}

interface MidiEvent {
  tick: number
  /** Ordem entre eventos ao mesmo tick: metadados antes de tudo, `note
   *  off` antes de `note on` (evita um `note on` repetido na mesma altura
   *  soar como retoque em vez de continuação). */
  priority: -1 | 0 | 1
  bytes: number[]
}

/**
 * `ScoreDocument` -> _Standard MIDI File_ tipo 0, escrito à mão (Tarefa 15,
 * decisão 3) — uma só _track_, `TICKS_PER_QUARTER` ticks por semínima.
 * Proibido instalar uma biblioteca de MIDI (guardrail em `AGENTS.md`).
 */
export function toMidi(scoreDocument: ScoreDocument): Uint8Array<ArrayBuffer> {
  const { tempo, key } = scoreDocument
  const notes = collectNotes(scoreDocument)

  const microsecondsPerQuarter = Math.round(60_000_000 / tempo.bpm)
  const denominatorPower = Math.round(Math.log2(tempo.timeSignature.denominator))
  const keyMode = key.mode === 'minor' ? 1 : 0

  const events: MidiEvent[] = [
    { tick: 0, priority: 0, bytes: [0xff, 0x51, 0x03, ...uint24(microsecondsPerQuarter)] },
    {
      tick: 0,
      priority: 0,
      bytes: [0xff, 0x58, 0x04, tempo.timeSignature.numerator, denominatorPower, 24, 8],
    },
    { tick: 0, priority: 0, bytes: [0xff, 0x59, 0x02, key.sharpsOrFlats & 0xff, keyMode] },
  ]

  for (const note of notes) {
    events.push({
      tick: note.startTick,
      priority: 1,
      bytes: [0x90 | EXPORT.MIDI_CHANNEL, note.pitchMidi, EXPORT.MIDI_VELOCITY],
    })
    events.push({
      tick: note.startTick + note.durationTicks,
      priority: -1,
      bytes: [0x80 | EXPORT.MIDI_CHANNEL, note.pitchMidi, 0],
    })
  }

  events.sort((a, b) => a.tick - b.tick || a.priority - b.priority)

  const trackBytes: number[] = []
  let lastTick = 0
  for (const event of events) {
    trackBytes.push(...encodeVariableLength(event.tick - lastTick), ...event.bytes)
    lastTick = event.tick
  }
  trackBytes.push(0x00, 0xff, 0x2f, 0x00) // fim de faixa, delta 0

  const header = [
    0x4d,
    0x54,
    0x68,
    0x64, // "MThd"
    0x00,
    0x00,
    0x00,
    0x06, // comprimento do cabeçalho, sempre 6
    0x00,
    0x00, // formato 0 (uma só track)
    0x00,
    0x01, // 1 track
    ...uint16(TICKS_PER_QUARTER), // divisão: ticks por semínima
  ]
  const trackHeader = [
    0x4d,
    0x54,
    0x72,
    0x6b, // "MTrk"
    ...uint32(trackBytes.length),
  ]

  const allBytes = [...header, ...trackHeader, ...trackBytes]
  // Passar por um `ArrayBuffer` concreto (em vez de construir diretamente
  // `new Uint8Array(allBytes)`) garante `Uint8Array<ArrayBuffer>` — é o que
  // o tipo de retorno desta função promete e o que `new Blob([...])`
  // (`useExport.ts`) exige; `ArrayBufferLike` também admite
  // `SharedArrayBuffer`, que `Blob` recusa.
  const buffer = new ArrayBuffer(allBytes.length)
  new Uint8Array(buffer).set(allBytes)
  return new Uint8Array(buffer)
}
