import { TICKS_PER_QUARTER } from '@/lib/types'

/**
 * Constantes da quantização rítmica — Tarefa 10, mesma convenção de
 * `NOTE_CLEANUP` (Tarefa 8) e `TEMPO` (Tarefa 9): um só sítio.
 *
 * O compasso é sempre 4/4 nesta fase (Tarefa 9, decisão 4) — por isso
 * `BEAT_TICKS` e `MEASURE_TICKS` são constantes fixas, não derivadas de um
 * `TimeSignature` recebido. Mudar isto exige rever a Tarefa 9 primeiro.
 */
export const QUANTIZE = {
  /** Um tempo = uma semínima, sempre (4/4). */
  BEAT_TICKS: TICKS_PER_QUARTER,

  /** Um compasso = quatro tempos, sempre (4/4). */
  MEASURE_TICKS: TICKS_PER_QUARTER * 4,

  /** Subdivisão mínima da grelha: semicorchea (decisão 1). Também a duração
   *  mínima de qualquer nota depois de quantizada (decisão 5). */
  MIN_SUBDIVISION_TICKS: TICKS_PER_QUARTER / 4,
} as const
