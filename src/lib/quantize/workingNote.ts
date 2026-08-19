import type { QuantizedNote } from '@/lib/types'

/**
 * Forma interna partilhada pelas etapas de `quantize` — tudo de
 * `QuantizedNote` exceto `measureIndex`, que só se sabe depois de
 * `splitAcrossBarlines` decidir onde cai cada barra (Âmbito técnico da
 * Tarefa 10). `quantize` atribui `measureIndex` no fim, uma única vez.
 */
export type WorkingNote = Omit<QuantizedNote, 'measureIndex'>
