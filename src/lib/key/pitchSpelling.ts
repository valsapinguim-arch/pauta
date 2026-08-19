import type { Step } from '@/lib/types'

export interface PitchSpelling {
  step: Step
  alter: -1 | 0 | 1
}

/**
 * Grafia de cada classe de altura em sustenidos e em bemóis — dados usados
 * por `spellPitch` para escolher conforme a armação (decisão 3). As sete
 * classes "brancas" (0,2,4,5,7,9,11) escrevem-se sempre com a letra
 * natural em ambas as tabelas — nunca Si# nem Dób — o que evita ter de
 * ajustar a oitava na fronteira (Notas da Tarefa 11: "um erro de uma
 * oitava... só se nota ao abrir o ficheiro noutro programa").
 */
export const SHARP_SPELLING: readonly PitchSpelling[] = [
  { step: 'C', alter: 0 }, // 0
  { step: 'C', alter: 1 }, // 1  Dó#
  { step: 'D', alter: 0 }, // 2
  { step: 'D', alter: 1 }, // 3  Ré#
  { step: 'E', alter: 0 }, // 4
  { step: 'F', alter: 0 }, // 5
  { step: 'F', alter: 1 }, // 6  Fá#
  { step: 'G', alter: 0 }, // 7
  { step: 'G', alter: 1 }, // 8  Sol#
  { step: 'A', alter: 0 }, // 9
  { step: 'A', alter: 1 }, // 10 Lá#
  { step: 'B', alter: 0 }, // 11
]

export const FLAT_SPELLING: readonly PitchSpelling[] = [
  { step: 'C', alter: 0 }, // 0
  { step: 'D', alter: -1 }, // 1  Réb
  { step: 'D', alter: 0 }, // 2
  { step: 'E', alter: -1 }, // 3  Mib
  { step: 'E', alter: 0 }, // 4
  { step: 'F', alter: 0 }, // 5
  { step: 'G', alter: -1 }, // 6  Solb
  { step: 'G', alter: 0 }, // 7
  { step: 'A', alter: -1 }, // 8  Láb
  { step: 'A', alter: 0 }, // 9
  { step: 'B', alter: -1 }, // 10 Sib
  { step: 'B', alter: 0 }, // 11
]
