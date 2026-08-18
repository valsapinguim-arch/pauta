import type { KeyMode } from '@/lib/types'

/**
 * Armação de clave por tónica maior — dados (não uma fórmula do círculo de
 * quintas calculada em runtime), porque quatro classes de altura são
 * enarmonicamente ambíguas por pitch class só (ex.: classe 1 é Dó# maior,
 * 7 sustenidos, OU Réb maior, 5 bemóis) e a escolha entre elas é uma
 * convenção musical, não um cálculo — esta tabela fixa a convenção usada
 * por esta app (a grafia com menos acidentes, com Fá#/Solb desempatado a
 * favor de Fá#, o mais comum na prática).
 *
 * Índice = classe de altura da tónica (0 = dó). Positivo = sustenidos,
 * negativo = bemóis.
 */
const MAJOR_KEY_SIGNATURES: readonly number[] = [
  0, // 0  Dó
  -5, // 1  Réb
  2, // 2  Ré
  -3, // 3  Mib
  4, // 4  Mi
  -1, // 5  Fá
  6, // 6  Fá#
  1, // 7  Sol
  -4, // 8  Láb
  3, // 9  Lá
  -2, // 10 Sib
  5, // 11 Si
]

/**
 * Armação de clave para uma tonalidade — Âmbito técnico da Tarefa 11.
 * Maior e relativa menor partilham armação (decisão 2): a menor usa a
 * armação da sua relativa maior, três semitons acima.
 */
export function keySignatureFor(tonic: number, mode: KeyMode): number {
  const majorTonic = mode === 'major' ? tonic : (tonic + 3) % 12
  return MAJOR_KEY_SIGNATURES[majorTonic] as number
}
