import { useCallback, useMemo, useState } from 'react'
import {
  allPositions,
  changeDuration as changeDurationOp,
  changePitch as changePitchOp,
  deleteNote as deleteNoteOp,
  getElementAt,
  insertNote as insertNoteOp,
  transpose as transposeOp,
} from '@/lib/notation/edit'
import type { NotationPosition } from '@/lib/notation/edit'
import { ScoreDocumentValidationError } from '@/lib/notation/validateScoreDocument'
import type { NotationElement, NoteType, ScoreDocument } from '@/lib/types'

/** Pilha de desfazer/refazer limitada a 30 estados (decisão 7) — cada
 *  `ScoreDocument` são poucos KB, o limite existe só para não crescer sem
 *  fim numa sessão longa. */
const HISTORY_LIMIT = 30

export interface ScoreEditorApi {
  selection: NotationPosition | null
  selectedElement: NotationElement | null
  select: (position: NotationPosition | null) => void
  /** Percorre a pauta em ordem de leitura — Tarefa 18, decisão 4: caminho
   *  por teclado para selecionar uma nota sem depender de clicar no SVG
   *  (`role="img"`, decisão 3, não é navegável por leitor de ecrã). Sem
   *  seleção, começa na primeira posição; `selectPrevious` no início ou
   *  `selectNext` no fim não avança (sem ciclo). */
  selectNext: () => void
  selectPrevious: () => void
  changePitch: (semitones: number) => void
  changeDuration: (noteType: NoteType, dots: 0 | 1) => void
  deleteSelected: () => void
  insertAtSelection: (pitchMidi: number, noteType: NoteType) => void
  transpose: (semitones: number) => void
  undo: () => void
  redo: () => void
  canUndo: boolean
  canRedo: boolean
  /** Uma edição falhou a validação (decisão 8) — o documento anterior
   *  manteve-se, isto só existe para avisar. */
  error: boolean
  dismissError: () => void
}

/**
 * Seleção, as cinco operações de `@/lib/notation/edit` e desfazer/refazer —
 * Tarefa 17, Âmbito técnico. Não guarda o `ScoreDocument` como estado
 * próprio: `document` continua a viver na sessão (`App.tsx`), e cada
 * edição bem-sucedida chama `onChange` para lá voltar — mesma direção de
 * dados de `onBpmChange`/`onKeyChange` (Tarefas 9/11), só que aqui há
 * também uma pilha de desfazer por cima.
 *
 * Qualquer ação para a reprodução em curso primeiro (decisão 11) — os
 * osciladores agendados (Tarefa 14) já não corresponderiam ao documento
 * novo.
 */
export function useScoreEditor(
  document: ScoreDocument,
  onChange: (document: ScoreDocument) => void,
  stopPlayback: () => void,
): ScoreEditorApi {
  const [selection, setSelection] = useState<NotationPosition | null>(null)
  const [error, setError] = useState(false)
  const [history, setHistory] = useState<ScoreDocument[]>([])
  const [future, setFuture] = useState<ScoreDocument[]>([])

  const select = useCallback((position: NotationPosition | null) => {
    setSelection(position)
  }, [])

  const applyEdit = useCallback(
    (edit: (current: ScoreDocument) => ScoreDocument) => {
      stopPlayback()
      try {
        const next = edit(document)
        if (next === document) return

        setHistory((previous) => [...previous, document].slice(-HISTORY_LIMIT))
        setFuture([])
        setError(false)
        onChange(next)
      } catch (caught) {
        if (caught instanceof ScoreDocumentValidationError) {
          setError(true)
          return
        }
        throw caught
      }
    },
    [document, onChange, stopPlayback],
  )

  const changePitch = useCallback(
    (semitones: number) => {
      if (!selection) return
      applyEdit((current) => changePitchOp(current, selection, semitones))
    },
    [applyEdit, selection],
  )

  const changeDuration = useCallback(
    (noteType: NoteType, dots: 0 | 1) => {
      if (!selection) return
      applyEdit((current) => changeDurationOp(current, selection, noteType, dots))
    },
    [applyEdit, selection],
  )

  const deleteSelected = useCallback(() => {
    if (!selection) return
    applyEdit((current) => deleteNoteOp(current, selection))
  }, [applyEdit, selection])

  const insertAtSelection = useCallback(
    (pitchMidi: number, noteType: NoteType) => {
      if (!selection) return
      applyEdit((current) => insertNoteOp(current, selection, pitchMidi, noteType))
    },
    [applyEdit, selection],
  )

  const transpose = useCallback(
    (semitones: number) => {
      applyEdit((current) => transposeOp(current, semitones))
    },
    [applyEdit],
  )

  const undo = useCallback(() => {
    const previous = history.at(-1)
    if (!previous) return
    stopPlayback()
    setHistory((current) => current.slice(0, -1))
    setFuture((current) => [...current, document].slice(-HISTORY_LIMIT))
    setSelection(null)
    onChange(previous)
  }, [document, history, onChange, stopPlayback])

  const redo = useCallback(() => {
    const next = future.at(-1)
    if (!next) return
    stopPlayback()
    setFuture((current) => current.slice(0, -1))
    setHistory((current) => [...current, document].slice(-HISTORY_LIMIT))
    setSelection(null)
    onChange(next)
  }, [document, future, onChange, stopPlayback])

  const selectNext = useCallback(() => {
    const positions = allPositions(document)
    if (positions.length === 0) return
    if (!selection) {
      setSelection(positions[0] as NotationPosition)
      return
    }
    const index = positions.findIndex(
      (p) =>
        p.measureNumber === selection.measureNumber && p.elementIndex === selection.elementIndex,
    )
    const next = positions[index + 1]
    if (next) setSelection(next)
  }, [document, selection])

  const selectPrevious = useCallback(() => {
    const positions = allPositions(document)
    if (positions.length === 0) return
    if (!selection) {
      setSelection(positions[0] as NotationPosition)
      return
    }
    const index = positions.findIndex(
      (p) =>
        p.measureNumber === selection.measureNumber && p.elementIndex === selection.elementIndex,
    )
    const previous = index > 0 ? positions[index - 1] : undefined
    if (previous) setSelection(previous)
  }, [document, selection])

  const dismissError = useCallback(() => setError(false), [])

  const selectedElement = useMemo(
    () => (selection ? (getElementAt(document, selection) ?? null) : null),
    [document, selection],
  )

  return {
    selection,
    selectedElement,
    select,
    selectNext,
    selectPrevious,
    changePitch,
    changeDuration,
    deleteSelected,
    insertAtSelection,
    transpose,
    undo,
    redo,
    canUndo: history.length > 0,
    canRedo: future.length > 0,
    error,
    dismissError,
  }
}
