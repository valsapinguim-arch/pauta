import type { PlaybackEvent } from './scoreToEvents'

/**
 * Funde eventos consecutivos ligados por ligadura de prolongação num só, com
 * a duração somada (Tarefa 14, decisão 5) — o primeiro evento do grupo dá o
 * `frequencyHz`/`startSec`/`measureIndex`/`elementIndex`; os seguintes só
 * estendem `durationSec`. Assume `events` na ordem de `scoreToEvents`
 * (percurso sequencial do `ScoreDocument`): a ligadura só une elementos
 * adjacentes com o mesmo `sourceIndex`.
 */
export function mergeTiedNotes(events: PlaybackEvent[]): PlaybackEvent[] {
  const merged: PlaybackEvent[] = []

  for (const event of events) {
    const previous = merged.at(-1)
    const continuesTie =
      previous !== undefined &&
      previous.sourceIndex !== null &&
      previous.sourceIndex === event.sourceIndex &&
      (previous.tie === 'start' || previous.tie === 'continue') &&
      (event.tie === 'continue' || event.tie === 'stop')

    if (continuesTie && previous !== undefined) {
      previous.durationSec += event.durationSec
      previous.tie = event.tie
    } else {
      merged.push({ ...event })
    }
  }

  return merged
}
