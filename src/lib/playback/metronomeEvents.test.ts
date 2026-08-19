import { describe, expect, it } from 'vitest'
import type { TempoMap } from '@/lib/types'
import { metronomeEvents } from './metronomeEvents'

function tempo(overrides: Partial<TempoMap> = {}): TempoMap {
  return {
    bpm: 60,
    timeSignature: { numerator: 4, denominator: 4 },
    firstBeatSec: 0,
    confidence: 1,
    source: 'detected',
    ...overrides,
  }
}

describe('metronomeEvents', () => {
  it('a 60 BPM em 4/4 gera um clique por segundo', () => {
    const events = metronomeEvents(tempo(), 4)
    expect(events.map((e) => e.atSec)).toEqual([0, 1, 2, 3])
  })

  it('acentua o primeiro tempo de cada compasso, não os restantes', () => {
    const events = metronomeEvents(tempo(), 8)
    expect(events.map((e) => e.accent)).toEqual([
      true,
      false,
      false,
      false,
      true,
      false,
      false,
      false,
    ])
  })

  it('respeita firstBeatSec como deslocamento inicial', () => {
    const events = metronomeEvents(tempo({ firstBeatSec: 0.5 }), 2.5)
    expect(events.map((e) => e.atSec)).toEqual([0.5, 1.5])
  })

  it('compasso 3/4 acentua a cada três tempos', () => {
    const events = metronomeEvents(tempo({ timeSignature: { numerator: 3, denominator: 4 } }), 6)
    expect(events.map((e) => e.accent)).toEqual([true, false, false, true, false, false])
  })

  it('sem tempos dentro da duração devolve lista vazia', () => {
    expect(metronomeEvents(tempo(), 0)).toEqual([])
  })

  it('bpm mais alto (equivalente a escalar pela velocidade) encurta o intervalo entre cliques', () => {
    const events = metronomeEvents(tempo({ bpm: 120 }), 2)
    expect(events.map((e) => e.atSec)).toEqual([0, 0.5, 1, 1.5])
  })
})
