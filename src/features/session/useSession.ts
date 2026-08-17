import { useCallback, useMemo, useReducer } from 'react'
import type { ScoreDocument } from '@/lib/types'
import { initialSessionState, sessionReducer } from './session.reducer'
import type { AudioSource, ProcessingStage, SessionState } from './session.types'

export interface SessionApi {
  state: SessionState
  startRecording: (source: AudioSource) => void
  updateLevel: (level: number, elapsedMs: number) => void
  stopRecording: () => void
  startProcessing: (source: AudioSource) => void
  advanceProcessing: (stage: ProcessingStage, progress: number) => void
  finishProcessing: (document: ScoreDocument) => void
  replaceDocument: (document: ScoreDocument) => void
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
  const [state, dispatch] = useReducer(sessionReducer, initialSessionState)

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

  const finishProcessing = useCallback((document: ScoreDocument) => {
    dispatch({ type: 'processing/done', document })
  }, [])

  const replaceDocument = useCallback((document: ScoreDocument) => {
    dispatch({ type: 'result/replace', document })
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
      fail,
      cancel,
      reset,
    ],
  )
}
