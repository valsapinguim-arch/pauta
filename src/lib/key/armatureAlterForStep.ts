import type { Step } from '@/lib/types'

/** Ordem tradicional em que os sustenidos entram numa armação de clave. */
const SHARP_ORDER: readonly Step[] = ['F', 'C', 'G', 'D', 'A', 'E', 'B']

/** Ordem tradicional em que os bemóis entram numa armação de clave (a
 *  inversa da ordem dos sustenidos). */
const FLAT_ORDER: readonly Step[] = ['B', 'E', 'A', 'D', 'G', 'C', 'F']

/**
 * A alteração que a armação de clave já aplica a um grau, sem acidente
 * nenhum visível — usada por `applyAccidentals` para saber se uma nota
 * concreta difere do que a armação já garante (decisão 4).
 */
export function armatureAlterForStep(step: Step, sharpsOrFlats: number): -1 | 0 | 1 {
  if (sharpsOrFlats > 0) {
    return SHARP_ORDER.slice(0, sharpsOrFlats).includes(step) ? 1 : 0
  }
  if (sharpsOrFlats < 0) {
    return FLAT_ORDER.slice(0, -sharpsOrFlats).includes(step) ? -1 : 0
  }
  return 0
}
