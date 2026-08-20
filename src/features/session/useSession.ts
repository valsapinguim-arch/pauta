import { useCallback, useMemo, useReducer } from 'react'
import type { NoteEvent, ScoreDocument } from '@/lib/types'
import { getDevStateOverride } from './devStateOverride'
import { initialSessionState, sessionReducer } from './session.reducer'
import type { AudioSource, ProcessingStage, SessionState } from './session.types'

export interface SessionApi {
  state: SessionState
  startRecording: (source: AudioSource) => void
  updateLevel: (level: number, elapsedMs: number) => void
  stopRecording: () => void
  startProcessing: (source: AudioSource) => void
  advanceProcessing: (stage: ProcessingStage, progress: number) => void
  finishProcessing: (document: ScoreDocument, notes: NoteEvent[]) => void
  replaceDocument: (document: ScoreDocument) => void
  /** Abrir uma transcrição da biblioteca local (Tarefa 16) — entra direto em
   *  `result`. */
  openDocument: (document: ScoreDocument) => void
  fail: (code: string, recoverable?: boolean) => void
  cancel: () => void
  reset: () => void
}

/**
 * Único ponto de acesso ao estado do ecrã principal.
 *
 * Os componentes chamam estes métodos e nunca despacham ações diretamente —
 * assim o vocabulário de transições fica confinado a este ficheiro e ao
 * reducer, em vez de espalhado por objetos de ação construídos no JSX.
 */
export function useSession(): SessionApi {
  /* Terceiro argumento do useReducer: inicializador tardio, corre uma vez.
     Em produção (`getDevStateOverride` devolve sempre `null`) é equivalente a
     `useReducer(sessionReducer, initialSessionState)` — ver Tarefa 3,
     Âmbito técnico ("mecanismo de desenvolvimento para forçar cada estado"). */
  const [state, dispatch] = useReducer(
    sessionReducer,
    initialSessionState,
    (initial) => getDevStateOverride() ?? initial,
  )

  const startRecording = useCallback((source: AudioSource) => {
    dispatch({ type: 'recording/start', source })
  }, [])

  const updateLevel = useCallback((level: number, elapsedMs: number) => {
    dispatch({ type: 'recording/level', level, elapsedMs })
  }, [])

  const stopRecording = useCallback(() => {
    dispatch({ type: 'recording/stop' })
  }, [])

  const startProcessing = useCallback((source: AudioSource) => {
    dispatch({ type: 'processing/start', source })
  }, [])

  const advanceProcessing = useCallback((stage: ProcessingStage, progress: number) => {
    dispatch({ type: 'processing/advance', stage, progress })
  }, [])

  const finishProcessing = useCallback((document: ScoreDocument, notes: NoteEvent[]) => {
    dispatch({ type: 'processing/done', document, notes })
  }, [])

  const replaceDocument = useCallback((document: ScoreDocument) => {
    dispatch({ type: 'result/replace', document })
  }, [])

  const openDocument = useCallback((document: ScoreDocument) => {
    dispatch({ type: 'library/open', document })
  }, [])

  const fail = useCallback((code: string, recoverable = true) => {
    dispatch({ type: 'fail', code, recoverable })
  }, [])

  const cancel = useCallback(() => {
    dispatch({ type: 'cancel' })
  }, [])

  const reset = useCallback(() => {
    dispatch({ type: 'reset' })
  }, [])

  return useMemo(
    () => ({
      state,
      startRecording,
      updateLevel,
      stopRecording,
      startProcessing,
      advanceProcessing,
      finishProcessing,
      replaceDocument,
      openDocument,
      fail,
      cancel,
      reset,
    }),
    [
      state,
      startRecording,
      updateLevel,
      stopRecording,
      startProcessing,
      advanceProcessing,
      finishProcessing,
      replaceDocument,
      openDocument,
      fail,
      cancel,
      reset,
    ],
  )
}
