// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useSession } from '@/features/session'
import type * as QuantizeModule from '@/lib/quantize/quantize'
import { installFakeWorker } from '@/test/fakeWorker'
import type { CapturedAudio, NoteEvent } from '@/lib/types'
import { useTranscriber } from './useTranscriber'

/** `quantize` mockado só no teste que precisa de simular uma falha do
 *  pipeline depois da inferência (decisão 8, casos limite) — não há forma
 *  simples de construir `NoteEvent[]` que dispare o bug real de soma de
 *  ticks (ver AGENTS.md) sem depender do comportamento interno exato de
 *  `quantize`, por isso força-se a falha diretamente. */
vi.mock('@/lib/quantize/quantize', async (importOriginal) => {
  const actual = await importOriginal<typeof QuantizeModule>()
  return { ...actual, quantize: vi.fn(actual.quantize) }
})

const AUDIO: CapturedAudio = { pcm: new Float32Array(22_050), sampleRate: 22_050 }
const NOTES: NoteEvent[] = [{ pitchMidi: 60, startSec: 0, durationSec: 0.5, amplitude: 0.8 }]

function useTestHarness() {
  const session = useSession()
  const transcriber = useTranscriber(session)
  return { session, transcriber }
}

describe('useTranscriber', () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
  })

  it('progresso do worker avança a sessão sem carregar o modelo real', async () => {
    const { instances } = installFakeWorker()
    const { result } = renderHook(useTestHarness)

    act(() => result.current.session.startProcessing({ kind: 'microphone' }))
    act(() => result.current.transcriber.transcribe(AUDIO))

    const worker = instances[0]
    expect(worker).toBeDefined()
    // O pedido é transferido, não copiado (guardrail — Tarefa 19).
    expect(worker?.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'transcribe', pcm: AUDIO.pcm }),
      [AUDIO.pcm.buffer],
    )

    act(() => worker?.emit({ type: 'progress', stage: 'transcribing', progress: 0.5 }))

    expect(result.current.session.state).toMatchObject({
      status: 'processing',
      stage: 'transcribing',
      progress: 0.5,
    })
  })

  it('resultado do worker fecha o pipeline e chega a "result"', async () => {
    const { instances } = installFakeWorker()
    const { result } = renderHook(useTestHarness)

    act(() => result.current.session.startProcessing({ kind: 'microphone' }))
    act(() => result.current.transcriber.transcribe(AUDIO))

    act(() => instances[0]?.emit({ type: 'result', notes: NOTES }))

    expect(result.current.session.state.status).toBe('result')
  })

  it('um erro do worker leva a sessão a "error"', async () => {
    const { instances } = installFakeWorker()
    const { result } = renderHook(useTestHarness)

    act(() => result.current.session.startProcessing({ kind: 'microphone' }))
    act(() => result.current.transcriber.transcribe(AUDIO))

    act(() =>
      instances[0]?.emit({ type: 'error', code: 'transcribe-failed', message: 'falhou a sério' }),
    )

    expect(result.current.session.state).toMatchObject({
      status: 'error',
      code: 'transcribe-failed',
    })
  })

  it('uma falha no pipeline depois do resultado leva a "error", em vez de ficar presa em "processing" (Tarefa 20, casos limite)', async () => {
    const { quantize } = await import('@/lib/quantize/quantize')
    vi.mocked(quantize).mockImplementationOnce(() => {
      throw new Error('[quantize] compasso 0 soma 1980 ticks, esperado 1920')
    })

    const { instances } = installFakeWorker()
    const { result } = renderHook(useTestHarness)

    act(() => result.current.session.startProcessing({ kind: 'microphone' }))
    act(() => result.current.transcriber.transcribe(AUDIO))

    act(() => instances[0]?.emit({ type: 'result', notes: NOTES }))

    expect(result.current.session.state).toMatchObject({
      status: 'error',
      code: 'transcribe-failed',
    })
  })

  it('onmessageerror leva a sessão a "error" em vez de ficar presa (Tarefa 21, decisão 5)', async () => {
    const { instances } = installFakeWorker()
    const { result } = renderHook(useTestHarness)

    act(() => result.current.session.startProcessing({ kind: 'microphone' }))
    act(() => result.current.transcriber.transcribe(AUDIO))

    act(() => instances[0]?.onmessageerror?.({} as MessageEvent))

    expect(result.current.session.state).toMatchObject({
      status: 'error',
      code: 'transcribe-failed',
    })
  })

  it('sem nenhuma mensagem do worker, o limite de tempo dispara "operation-timeout" (Tarefa 21, decisão 6)', async () => {
    vi.useFakeTimers()
    try {
      installFakeWorker()
      const { result } = renderHook(useTestHarness)

      act(() => result.current.session.startProcessing({ kind: 'microphone' }))
      act(() => result.current.transcriber.transcribe(AUDIO))

      await act(async () => {
        await vi.advanceTimersByTimeAsync(120_001)
      })

      expect(result.current.session.state).toMatchObject({
        status: 'error',
        code: 'operation-timeout',
      })
    } finally {
      vi.useRealTimers()
    }
  })
})
