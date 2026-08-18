import type { KeyMode } from '@/lib/types'
import { KEY } from './constants'
import { MAJOR_KEY_PROFILE, MINOR_KEY_PROFILE } from './keyProfiles'
import { pearsonCorrelation } from './pearsonCorrelation'

interface KeyCandidate {
  tonic: number
  mode: KeyMode
  correlation: number
}

/** Roda o perfil para que `profile[0]` (a tónica) caia na classe de altura
 *  `tonic` — assim compara-se sempre contra o mesmo histograma sem rodar
 *  este. */
function rotateProfile(profile: readonly number[], tonic: number): number[] {
  return Array.from(
    { length: 12 },
    (_, pitchClass) => profile[(pitchClass - tonic + 12) % 12] as number,
  )
}

/** Os 24 candidatos (12 tónicas × maior/menor), ordenados por correlação
 *  decrescente — decisão 1. Interno: `detectKey` só expõe o vencedor e a
 *  margem, que é o que o resto do pipeline precisa. */
function rankKeyCandidates(histogram: number[]): KeyCandidate[] {
  const candidates: KeyCandidate[] = []

  for (let tonic = 0; tonic < 12; tonic++) {
    candidates.push({
      tonic,
      mode: 'major',
      correlation: pearsonCorrelation(histogram, rotateProfile(MAJOR_KEY_PROFILE, tonic)),
    })
    candidates.push({
      tonic,
      mode: 'minor',
      correlation: pearsonCorrelation(histogram, rotateProfile(MINOR_KEY_PROFILE, tonic)),
    })
  }

  return candidates.sort((a, b) => b.correlation - a.correlation)
}

export interface KeyDetectionResult {
  tonic: number
  mode: KeyMode
  /** Margem entre a melhor e a segunda melhor correlação, normalizada para
   *  [0, 1] por `KEY.MARGIN_SCALE` (decisão 5). */
  confidence: number
}

/**
 * Correlaciona o histograma com os 24 perfis de Krumhansl-Schmuckler
 * (decisão 1) e devolve o vencedor com a confiança derivada da margem sobre
 * o segundo melhor — Âmbito técnico da Tarefa 11.
 */
export function detectKey(histogram: number[]): KeyDetectionResult {
  const [best, secondBest] = rankKeyCandidates(histogram)
  const margin = (best as KeyCandidate).correlation - (secondBest as KeyCandidate).correlation

  return {
    tonic: (best as KeyCandidate).tonic,
    mode: (best as KeyCandidate).mode,
    confidence: Math.min(1, Math.max(0, margin / KEY.MARGIN_SCALE)),
  }
}
