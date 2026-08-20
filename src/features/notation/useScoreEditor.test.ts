// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { Measure, NotationElement, ScoreDocument } from '@/lib/types'
import { useScoreEditor } from './useScoreEditor'

function noteEl(overrides: Partial<NotationElement & { kind: 'note' }> = {}): NotationElement {
  return {
    kind: 'note',
    step: 'C',
    alter: 0,
    octave: 4,
    pitchMidi: 60,
    noteType: 'quarter',
    dots: 0,
    accidental: null,
    tie: null,
    sourceIndex: null,
    ...overrides,
  }
}

function restEl(overrides: Partial<NotationElement & { kind: 'rest' }> = {}): NotationElement {
  return { kind: 'rest', noteType: 'quarter', dots: 0, ...overrides }
}

function documentWith(measures: Measure[]): ScoreDocument {
  return {
    metadata: {
      schemaVersion: 1,
      title: 'Teste',
      createdAt: '2026-01-01T00:00:00.000Z',
      sourceName: null,
      durationSec: 4,
      confidence: { overall: 1, notes: 1, tempo: 1, key: 1 },
    },
    tempo: {
      bpm: 120,
      timeSignature: { numerator: 4, denominator: 4 },
      firstBeatSec: 0,
      confidence: 1,
      source: 'detected',
    },
    key: { tonic: 0, mode: 'major', sharpsOrFlats: 0, confidence: 1, source: 'detected' },
    clef: 'treble',
    measures,
  }
}

/** `useScoreEditor` não guarda o documento — é `onChange` que o devolve à
 *  sessão (Tarefa 17, mesmo espírito de `onBpmChange`/`onKeyChange`). Este
 *  invólucro simula esse elo: cada `onChange` avança o documento passado ao
 *  hook na próxima renderização, tal como `App.tsx`/`ResultView` fariam. */
function setupEditor(initial: ScoreDocument) {
  const onChange = vi.fn()
  const stopPlayback = vi.fn()

  const rendered = renderHook(({ document }) => useScoreEditor(document, onChange, stopPlayback), {
    initialProps: { document: initial },
  })

  function applyLatestChange(): void {
    const latest = onChange.mock.calls.at(-1)?.[0] as ScoreDocument | undefined
    if (latest) rendered.rerender({ document: latest })
  }

  return { rendered, onChange, stopPlayback, applyLatestChange }
}

describe('useScoreEditor', () => {
  it('desfazer/refazer repõe estados exatos', () => {
    const doc = documentWith([
      { number: 1, elements: [noteEl({ pitchMidi: 60 }), restEl({ noteType: 'half', dots: 1 })] },
    ])
    const { rendered, onChange, applyLatestChange } = setupEditor(doc)

    act(() => rendered.result.current.select({ measureNumber: 1, elementIndex: 0 }))
    act(() => rendered.result.current.changePitch(2))
    applyLatestChange()

    const edited = onChange.mock.calls.at(-1)?.[0] as ScoreDocument
    expect(edited.measures[0]?.elements[0]).toMatchObject({ pitchMidi: 62 })
    expect(rendered.result.current.canUndo).toBe(true)
    expect(rendered.result.current.canRedo).toBe(false)

    act(() => rendered.result.current.undo())
    expect(onChange).toHaveBeenLastCalledWith(doc)
    applyLatestChange()
    expect(rendered.result.current.canUndo).toBe(false)
    expect(rendered.result.current.canRedo).toBe(true)

    act(() => rendered.result.current.redo())
    expect(onChange).toHaveBeenLastCalledWith(edited)
  })

  it('a pilha de desfazer fica limitada a 30 estados', () => {
    const doc = documentWith([
      { number: 1, elements: [noteEl({ pitchMidi: 60 }), restEl({ noteType: 'half', dots: 1 })] },
    ])
    const { rendered, applyLatestChange } = setupEditor(doc)
    act(() => rendered.result.current.select({ measureNumber: 1, elementIndex: 0 }))

    for (let i = 0; i < 35; i += 1) {
      act(() => rendered.result.current.changePitch(1))
      applyLatestChange()
    }

    let undoCount = 0
    while (rendered.result.current.canUndo && undoCount < 100) {
      act(() => rendered.result.current.undo())
      applyLatestChange()
      undoCount += 1
    }

    expect(undoCount).toBe(30)
  })

  it('uma edição que produz um documento inválido é rejeitada, mantendo o documento anterior', () => {
    const doc = documentWith([
      { number: 1, elements: [noteEl({ pitchMidi: 118 }), restEl({ noteType: 'half', dots: 1 })] },
    ])
    const { rendered, onChange, stopPlayback } = setupEditor(doc)

    act(() => rendered.result.current.select({ measureNumber: 1, elementIndex: 0 }))
    act(() => rendered.result.current.changePitch(20)) // 118 + 20 = 138, acima da gama plausível

    expect(onChange).not.toHaveBeenCalled()
    expect(rendered.result.current.error).toBe(true)
    expect(stopPlayback).toHaveBeenCalled()
  })

  it('qualquer edição para a reprodução em curso primeiro', () => {
    const doc = documentWith([
      { number: 1, elements: [noteEl(), restEl({ noteType: 'half', dots: 1 })] },
    ])
    const { rendered, stopPlayback } = setupEditor(doc)

    act(() => rendered.result.current.select({ measureNumber: 1, elementIndex: 0 }))
    act(() => rendered.result.current.changePitch(1))

    expect(stopPlayback).toHaveBeenCalledTimes(1)
  })
})
