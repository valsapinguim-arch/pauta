import { useCallback, useEffect, useRef, useState } from 'react'
import { PLAYBACK } from '@/lib/playback/constants'
import { mergeTiedNotes } from '@/lib/playback/mergeTiedNotes'
import { metronomeEvents } from '@/lib/playback/metronomeEvents'
import type { MetronomeEvent } from '@/lib/playback/metronomeEvents'
import { scoreToEvents } from '@/lib/playback/scoreToEvents'
import type { PlaybackEvent } from '@/lib/playback/scoreToEvents'
import type { ScoreDocument } from '@/lib/types'
import { disconnectScheduledNode, scheduleMetronomeClick, scheduleNoteEvent } from './synth'
import type { ScheduledNode } from './synth'

export interface PlaybackCursor {
  measureIndex: number
  elementIndex: number
}

export interface PlaybackApi {
  play: () => void
  pause: () => void
  stop: () => void
  setSpeed: (speed: number) => void
  toggleMetronome: () => void
  isPlaying: boolean
  isMetronomeOn: boolean
  speed: number
  /** Nota atualmente a soar, para posicionar o cursor (Tarefa 14, decisão
   *  4) — `null` quando não há reprodução em curso. */
  currentPosition: PlaybackCursor | null
}

function totalDurationSec(events: PlaybackEvent[]): number {
  return events.reduce((max, event) => Math.max(max, event.startSec + event.durationSec), 0)
}

/**
 * Reprodução sintetizada do `ScoreDocument` — Tarefa 14. Nunca reproduz o
 * áudio original (decisão 1); só osciladores agendados no relógio do
 * `AudioContext` (decisão 3, `@/features/notation/synth`).
 *
 * A posição fica guardada como proporção do total (`positionRatioRef`, 0 a
 * 1) em vez de segundos: como a `speed` está "cozinhada" dentro dos eventos
 * (`scoreToEvents`), a proporção é o único valor que continua válido depois
 * de uma mudança de velocidade sem precisar de conversão.
 */
export function usePlayback(scoreDocument: ScoreDocument): PlaybackApi {
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMetronomeOn, setIsMetronomeOn] = useState(false)
  const [speed, setSpeedState] = useState<number>(PLAYBACK.DEFAULT_SPEED)
  const [currentPosition, setCurrentPosition] = useState<PlaybackCursor | null>(null)

  const audioContextRef = useRef<AudioContext | null>(null)
  const scheduledNodesRef = useRef<ScheduledNode[]>([])
  const eventsRef = useRef<PlaybackEvent[]>([])
  const metronomeRef = useRef<MetronomeEvent[]>([])
  const nextNoteIndexRef = useRef(0)
  const nextMetronomeIndexRef = useRef(0)
  /** `audioContext.currentTime` correspondente à posição 0 da timeline. */
  const epochRef = useRef(0)
  const positionRatioRef = useRef(0)
  const schedulerIdRef = useRef<number | null>(null)
  const animationFrameIdRef = useRef<number | null>(null)
  const lastCursorKeyRef = useRef<string | null>(null)
  const isMetronomeOnRef = useRef(isMetronomeOn)
  const isPlayingRef = useRef(isPlaying)

  useEffect(() => {
    isMetronomeOnRef.current = isMetronomeOn
  }, [isMetronomeOn])
  useEffect(() => {
    isPlayingRef.current = isPlaying
  }, [isPlaying])

  const stopTimers = useCallback(() => {
    if (schedulerIdRef.current !== null) {
      window.clearInterval(schedulerIdRef.current)
      schedulerIdRef.current = null
    }
    if (animationFrameIdRef.current !== null) {
      window.cancelAnimationFrame(animationFrameIdRef.current)
      animationFrameIdRef.current = null
    }
  }, [])

  const disconnectAllNodes = useCallback(() => {
    for (const node of scheduledNodesRef.current) disconnectScheduledNode(node)
    scheduledNodesRef.current = []
  }, [])

  /** Decisão 8: parar liberta tudo o que estava agendado, incluindo para o
   *  futuro — nada continua a soar depois de parar. */
  const stop = useCallback(() => {
    stopTimers()
    disconnectAllNodes()
    positionRatioRef.current = 0
    nextNoteIndexRef.current = 0
    nextMetronomeIndexRef.current = 0
    lastCursorKeyRef.current = null
    setIsPlaying(false)
    setCurrentPosition(null)
  }, [stopTimers, disconnectAllNodes])

  const pause = useCallback(() => {
    const audioContext = audioContextRef.current
    if (!audioContext || !isPlayingRef.current) return

    const elapsed = audioContext.currentTime - epochRef.current
    const total = totalDurationSec(eventsRef.current)
    positionRatioRef.current = total > 0 ? Math.min(elapsed / total, 1) : 0

    stopTimers()
    disconnectAllNodes()
    setIsPlaying(false)
  }, [stopTimers, disconnectAllNodes])

  const runSchedulerTick = useCallback(() => {
    const audioContext = audioContextRef.current
    if (!audioContext) return

    const events = eventsRef.current
    const metronome = metronomeRef.current
    const horizon = audioContext.currentTime - epochRef.current + PLAYBACK.SCHEDULE_AHEAD_SEC

    while (nextNoteIndexRef.current < events.length) {
      const event = events[nextNoteIndexRef.current] as PlaybackEvent
      if (event.startSec >= horizon) break
      scheduledNodesRef.current.push(
        scheduleNoteEvent(
          audioContext,
          audioContext.destination,
          epochRef.current + event.startSec,
          event.durationSec,
          event.frequencyHz,
        ),
      )
      nextNoteIndexRef.current += 1
    }

    if (isMetronomeOnRef.current) {
      while (nextMetronomeIndexRef.current < metronome.length) {
        const click = metronome[nextMetronomeIndexRef.current] as MetronomeEvent
        if (click.atSec >= horizon) break
        scheduledNodesRef.current.push(
          scheduleMetronomeClick(
            audioContext,
            audioContext.destination,
            epochRef.current + click.atSec,
            click.accent,
          ),
        )
        nextMetronomeIndexRef.current += 1
      }
    }

    const notesDone = nextNoteIndexRef.current >= events.length
    const metronomeDone =
      !isMetronomeOnRef.current || nextMetronomeIndexRef.current >= metronome.length
    const elapsed = audioContext.currentTime - epochRef.current
    if (notesDone && metronomeDone && elapsed > totalDurationSec(events) + PLAYBACK.RELEASE_SEC) {
      stop()
    }
  }, [stop])

  /* Guardada em ref (não `useCallback`) para o próprio `requestAnimationFrame`
     se poder re-agendar sem se referenciar antes de estar declarada — só lê
     refs, por isso não precisa de identidade estável entre renders. Atribuída
     num efeito (nunca direto no corpo do render — mutar `ref.current` durante
     o render é proibido pelas regras do react-hooks, mesmo padrão de
     `useMicrophone`). */
  const updateCursorRef = useRef<() => void>(() => {})
  useEffect(() => {
    updateCursorRef.current = () => {
      const audioContext = audioContextRef.current
      if (audioContext) {
        const elapsed = audioContext.currentTime - epochRef.current
        let active: PlaybackEvent | null = null
        for (const event of eventsRef.current) {
          if (event.startSec > elapsed) break
          active = event
        }

        const key = active ? `${active.measureIndex}:${active.elementIndex}` : null
        if (key !== lastCursorKeyRef.current) {
          lastCursorKeyRef.current = key
          setCurrentPosition(
            active && { measureIndex: active.measureIndex, elementIndex: active.elementIndex },
          )
        }
      }

      animationFrameIdRef.current = window.requestAnimationFrame(() => updateCursorRef.current())
    }
  })

  const rebuildEvents = useCallback(
    (nextSpeed: number) => {
      const events = mergeTiedNotes(scoreToEvents(scoreDocument, nextSpeed))
      const total = totalDurationSec(events)
      const metronome = metronomeEvents(
        { ...scoreDocument.tempo, bpm: scoreDocument.tempo.bpm * nextSpeed },
        total + PLAYBACK.RELEASE_SEC,
      )
      return { events, metronome, total }
    },
    [scoreDocument],
  )

  const startFromCurrentPosition = useCallback(
    (nextSpeed: number) => {
      const audioContext = audioContextRef.current
      if (!audioContext) return

      const { events, metronome, total } = rebuildEvents(nextSpeed)
      eventsRef.current = events
      metronomeRef.current = metronome

      const elapsedSec = positionRatioRef.current * total
      epochRef.current = audioContext.currentTime - elapsedSec

      const noteIndex = events.findIndex((event) => event.startSec >= elapsedSec)
      nextNoteIndexRef.current = noteIndex === -1 ? events.length : noteIndex
      const metronomeIndex = metronome.findIndex((click) => click.atSec >= elapsedSec)
      nextMetronomeIndexRef.current = metronomeIndex === -1 ? metronome.length : metronomeIndex
    },
    [rebuildEvents],
  )

  const play = useCallback(() => {
    if (isPlayingRef.current) return

    /* Criado dentro do gesto de play (decisão 9) — nunca antes, para não
       ficar suspenso em iOS. */
    audioContextRef.current ??= new AudioContext()
    const audioContext = audioContextRef.current
    if (audioContext.state === 'suspended') void audioContext.resume()

    disconnectAllNodes()
    startFromCurrentPosition(speed)

    setIsPlaying(true)
    runSchedulerTick()
    schedulerIdRef.current = window.setInterval(runSchedulerTick, PLAYBACK.SCHEDULER_INTERVAL_MS)
    animationFrameIdRef.current = window.requestAnimationFrame(() => updateCursorRef.current())
  }, [speed, disconnectAllNodes, startFromCurrentPosition, runSchedulerTick])

  const setSpeed = useCallback(
    (nextSpeed: number) => {
      const clamped = Math.min(PLAYBACK.MAX_SPEED, Math.max(PLAYBACK.MIN_SPEED, nextSpeed))
      setSpeedState(clamped)

      if (isPlayingRef.current && audioContextRef.current) {
        const audioContext = audioContextRef.current
        const elapsed = audioContext.currentTime - epochRef.current
        const total = totalDurationSec(eventsRef.current)
        positionRatioRef.current = total > 0 ? Math.min(elapsed / total, 1) : 0

        disconnectAllNodes()
        startFromCurrentPosition(clamped)
      }
    },
    [disconnectAllNodes, startFromCurrentPosition],
  )

  const toggleMetronome = useCallback(() => {
    setIsMetronomeOn((wasOn) => {
      const willBeOn = !wasOn
      /* Ligar a meio de uma reprodução não deve disparar em rajada os
         cliques que ficaram para trás enquanto estava desligado. */
      if (willBeOn && isPlayingRef.current && audioContextRef.current) {
        const elapsed = audioContextRef.current.currentTime - epochRef.current
        const index = metronomeRef.current.findIndex((click) => click.atSec >= elapsed)
        nextMetronomeIndexRef.current = index === -1 ? metronomeRef.current.length : index
      }
      return willBeOn
    })
  }, [])

  /* Decisão do Âmbito técnico: a reprodução para automaticamente quando o
     `ScoreDocument` muda (edição, BPM, tonalidade). Comparação por
     referência: `ScoreDocument` é sempre reconstruído, nunca mutado. */
  const previousDocumentRef = useRef(scoreDocument)
  useEffect(() => {
    if (previousDocumentRef.current !== scoreDocument) {
      previousDocumentRef.current = scoreDocument
      stop()
    }
  }, [scoreDocument, stop])

  /* Decisão 8, aplicada também ao desmontar: nada pode continuar a soar
     depois de `ResultView` desaparecer. Mesmo padrão de `useMicrophone`
     (`@/features/capture`, Tarefa 4): um `cleanup` memoizado, chamado tanto
     no desmontar como (aqui) em `stop()`, nunca duplicado. */
  const closeAudioContext = useCallback(() => {
    stopTimers()
    disconnectAllNodes()
    const audioContext = audioContextRef.current
    if (audioContext && audioContext.state !== 'closed') void audioContext.close()
    audioContextRef.current = null
  }, [stopTimers, disconnectAllNodes])

  useEffect(() => closeAudioContext, [closeAudioContext])

  return {
    play,
    pause,
    stop,
    setSpeed,
    toggleMetronome,
    isPlaying,
    isMetronomeOn,
    speed,
    currentPosition,
  }
}
