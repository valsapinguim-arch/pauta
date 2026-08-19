import type { Accidental, KeyMode, NotationElement, NoteType, Step } from '@/lib/types'

/**
 * Conversão entre o vocabulário de `ScoreDocument` (`@/lib/types`, Tarefa 12)
 * e as strings que o VexFlow (Tarefa 13, decisão 1) espera. Vive em
 * `@/features/notation`, não em `@/lib`: é um detalhe do motor de desenho
 * escolhido, não do modelo de notação em si — `ScoreDocument` continua a não
 * saber que o VexFlow existe (decisão 1 da Tarefa 12).
 *
 * Puras de propósito (sem `vexflow` importado aqui): testáveis sem o motor
 * de desenho, e verificadas manualmente contra a API real em
 * `drawScore.ts`.
 */

const DURATION_CODES: Record<NoteType, string> = {
  whole: 'w',
  half: 'h',
  quarter: 'q',
  eighth: '8',
  sixteenth: '16',
}

/** Duração VexFlow: código base + `d` para ponto (decisão 1 da Tarefa 10:
 *  no máximo um ponto) + `r` para pausa. */
export function toVexDuration(noteType: NoteType, dots: 0 | 1, isRest: boolean): string {
  const dotSuffix = dots === 1 ? 'd' : ''
  const restSuffix = isRest ? 'r' : ''
  return `${DURATION_CODES[noteType]}${dotSuffix}${restSuffix}`
}

const ALTER_SUFFIX: Record<-1 | 0 | 1, string> = { [-1]: 'b', 0: '', 1: '#' }

/** Chave VexFlow: `<letra minúscula><sustenido/bemol opcional>/<oitava>`.
 *  O sufixo de alteração aqui só afeta a posição na pauta quando muda de
 *  linha/espaço (não afeta dó/dó#, que partilham linha) — o glifo visível
 *  do acidente é sempre um `Accidental` explícito (`toVexAccidentalCode`),
 *  nunca inferido desta string (confirmado empiricamente contra a API real:
 *  `keys: ['f#/4']` sozinho não desenha sustenido nenhum). */
export function toVexKey(step: Step, alter: -1 | 0 | 1, octave: number): string {
  return `${step.toLowerCase()}${ALTER_SUFFIX[alter]}/${octave}`
}

const ACCIDENTAL_CODES: Record<Exclude<Accidental, null>, string> = {
  sharp: '#',
  flat: 'b',
  natural: 'n',
}

/** `null` (o caso comum: nota que não precisa de acidente visível, Tarefa
 *  11, decisão 4) devolve `null` — quem chama não adiciona modificador
 *  nenhum. */
export function toVexAccidentalCode(accidental: Accidental): string | null {
  return accidental === null ? null : ACCIDENTAL_CODES[accidental]
}

/** Nomes de tonalidade que o VexFlow reconhece (`stave.addKeySignature`) —
 *  Tarefa 12/`@/lib/key/keySignatureFor.ts` decide o NÚMERO de
 *  sustenidos/bemóis; esta tabela dá-lhe o NOME que o VexFlow espera,
 *  escolhido para bater sempre certo com esse número (verificado a par: o
 *  sinal de cada entrada, maior ou relativa menor, corresponde exatamente
 *  ao sinal de `keySignatureFor`). Índice = classe de altura da tónica. */
const MAJOR_KEY_SPEC: readonly string[] = [
  'C',
  'Db',
  'D',
  'Eb',
  'E',
  'F',
  'F#',
  'G',
  'Ab',
  'A',
  'Bb',
  'B',
]

const MINOR_KEY_SPEC: readonly string[] = [
  'Cm',
  'C#m',
  'Dm',
  'D#m',
  'Em',
  'Fm',
  'F#m',
  'Gm',
  'G#m',
  'Am',
  'Bbm',
  'Bm',
]

export function toVexKeySignatureSpec(tonic: number, mode: KeyMode): string {
  return (mode === 'major' ? MAJOR_KEY_SPEC : MINOR_KEY_SPEC)[tonic] as string
}

/** Uma nota "clicável" no sentido do VexFlow: tudo o que `chooseNoteStruct`
 *  precisa de `NotationElement`. */
export function toVexNoteStruct(element: NotationElement): {
  keys: string[]
  duration: string
} {
  if (element.kind === 'rest') {
    // VexFlow ainda exige uma `key` (posição na pauta) para pausas, mesmo
    // sem altura real — 'b/4' é a posição convencional (linha do meio).
    return { keys: ['b/4'], duration: toVexDuration(element.noteType, element.dots, true) }
  }

  return {
    keys: [toVexKey(element.step, element.alter, element.octave)],
    duration: toVexDuration(element.noteType, element.dots, false),
  }
}
