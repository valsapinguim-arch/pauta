import type { TempoMap } from '@/lib/types'

/** Um clique do metrónomo (Tarefa 14, decisão 7). `accent` marca o primeiro
 *  tempo de cada compasso — soa mais agudo (ver `PLAYBACK` em `constants.ts`),
 *  não mais alto: distinguir por altura funciona igual em qualquer volume. */
export interface MetronomeEvent {
  atSec: number
  accent: boolean
}

/**
 * Gera os cliques do metrónomo entre `tempo.firstBeatSec` e `durationSec`,
 * um por tempo da `timeSignature`. Não recebe `speed` — quem agenda aplica a
 * mesma escala de velocidade ao `TempoMap` (`bpm: tempo.bpm * speed`) antes
 * de chamar esta função, para que o clique caia exatamente onde as notas de
 * `scoreToEvents` (essa sim, `speed`-aware) também caem.
 */
export function metronomeEvents(tempo: TempoMap, durationSec: number): MetronomeEvent[] {
  const { bpm, timeSignature, firstBeatSec } = tempo
  const beatDurationSec = 60 / bpm
  const events: MetronomeEvent[] = []

  let beatIndex = 0
  let atSec = firstBeatSec
  while (atSec < durationSec) {
    events.push({ atSec, accent: beatIndex % timeSignature.numerator === 0 })
    beatIndex += 1
    atSec = firstBeatSec + beatIndex * beatDurationSec
  }

  return events
}
