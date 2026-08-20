import { TICKS_PER_QUARTER } from '@/lib/types'
import type { NoteType } from '@/lib/types'

export interface NoteDuration {
  noteType: NoteType
  dots: 0 | 1
  ticks: number
}

/**
 * Tabela canónica das figuras permitidas — Tarefa 10, decisão 1 (grelha
 * binária até 1/16, sem tercinas). Dados, não uma cadeia de `if`: as duas
 * funções abaixo (e a decomposição de pausas em `restDecomposition.ts`) só
 * leem esta tabela.
 *
 * Ordenada ascendentemente por `ticks` — `nearestNoteDuration` e
 * `largestNoteDurationAtMost` dependem desta ordem.
 */
export const NOTE_DURATIONS: readonly NoteDuration[] = [
  { noteType: 'sixteenth', dots: 0, ticks: TICKS_PER_QUARTER / 4 },
  { noteType: 'sixteenth', dots: 1, ticks: (TICKS_PER_QUARTER / 4) * 1.5 },
  { noteType: 'eighth', dots: 0, ticks: TICKS_PER_QUARTER / 2 },
  { noteType: 'eighth', dots: 1, ticks: (TICKS_PER_QUARTER / 2) * 1.5 },
  { noteType: 'quarter', dots: 0, ticks: TICKS_PER_QUARTER },
  { noteType: 'quarter', dots: 1, ticks: TICKS_PER_QUARTER * 1.5 },
  { noteType: 'half', dots: 0, ticks: TICKS_PER_QUARTER * 2 },
  { noteType: 'half', dots: 1, ticks: TICKS_PER_QUARTER * 2 * 1.5 },
  { noteType: 'whole', dots: 0, ticks: TICKS_PER_QUARTER * 4 },
  { noteType: 'whole', dots: 1, ticks: TICKS_PER_QUARTER * 4 * 1.5 },
]

/** A figura mais próxima de `durationTicks` (decisão 3: a duração é
 *  escolhida pela figura que melhor se aproxima da duração real). Como
 *  `sixteenth` é a menor entrada da tabela, qualquer duração mais curta do
 *  que ela acaba sempre nela — é assim que a decisão 5 (promover, nunca
 *  eliminar) se cumpre sem código especial. */
export function nearestNoteDuration(durationTicks: number): NoteDuration {
  let best = NOTE_DURATIONS[0] as NoteDuration
  let bestDistance = Math.abs(best.ticks - durationTicks)

  for (const candidate of NOTE_DURATIONS) {
    const distance = Math.abs(candidate.ticks - durationTicks)
    if (distance < bestDistance) {
      best = candidate
      bestDistance = distance
    }
  }

  return best
}

/** Duração em _ticks_ de uma figura conhecida — `undefined` se `noteType`/
 *  `dots` não corresponderem a nenhuma entrada da tabela (não deveria
 *  acontecer com os tipos do próprio `NoteType`, mas a validação e a
 *  edição, Tarefas 12 e 17, preferem um `undefined` explícito a assumir).
 */
export function ticksForNoteType(noteType: NoteType, dots: 0 | 1): number | undefined {
  return NOTE_DURATIONS.find((duration) => duration.noteType === noteType && duration.dots === dots)
    ?.ticks
}

/** A maior figura que cabe em `maxTicks`, sem exceder — usada para encurtar
 *  uma nota que sobrepõe a seguinte (decisão 4) e para decompor pausas
 *  (decisão 6), nunca para a escolha inicial da duração de uma nota (essa é
 *  `nearestNoteDuration`). Abaixo da menor figura devolve-a na mesma
 *  (decisão 5: nunca eliminar) — quem chama sabe que isso pode significar um
 *  pequeníssimo excesso sobre `maxTicks` num caso limite. */
export function largestNoteDurationAtMost(maxTicks: number): NoteDuration {
  let best: NoteDuration | null = null

  for (const candidate of NOTE_DURATIONS) {
    if (candidate.ticks <= maxTicks) {
      best = candidate
    }
  }

  return best ?? (NOTE_DURATIONS[0] as NoteDuration)
}

/**
 * A semicorchea pontuada (bug real, Tarefa 21) — a ÚNICA figura da tabela
 * que não é múltiplo de `MIN_SUBDIVISION_TICKS` (120): todas as outras,
 * incluindo as restantes pontuadas, são múltiplos exatos de 120 (`180` é
 * `120 × 1.5`, as seguintes são todas `× 1.5` de uma base já múltipla de
 * 120 — `240×1.5=360`, `480×1.5=720`, etc. — por isso ficam múltiplas).
 *
 * Consequência: uma nota real com esta figura é a única forma de o cursor
 * sair da grelha de 120 ("fase" 60) — e é também a única figura capaz de o
 * repor. `decomposeRestTicks` usa isto para corrigir a fase assim que a
 * deteta, antes de o algoritmo guloso normal (que ignora fase) escolher
 * outra coisa e ficar sem forma de a repor mais tarde.
 */
export const DOTTED_SIXTEENTH: NoteDuration = NOTE_DURATIONS[1] as NoteDuration
