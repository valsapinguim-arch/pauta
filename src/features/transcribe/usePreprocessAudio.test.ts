// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useSession } from '@/features/session'
import type { CapturedAudio } from '@/lib/types'
import { installFakeWorker } from '@/test/fakeWorker'
import { usePreprocessAudio } from './usePreprocessAudio'

/** Fábrica, não uma constante partilhada: `FakeWorker.postMessage` destaca
 *  de verdade o buffer transferido (Tarefa 21, ver `@/test/fakeWorker`) —
 *  reutilizar o mesmo `Float32Array` entre testes faria o segundo `run()`
 *  tentar transferir um buffer já destacado pelo primeiro. */
function audio(): CapturedAudio {
  return { pcm: new Float32Array(22_050), sampleRate: 22_050 }
}

describe('usePreprocessAudio', () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
  })

  it('entrega o áudio pré-processado a onPreprocessed, sem correr o worker real', () => {
    const { instances } = installFakeWorker()
    const onPreprocessed = vi.fn()
    const { result } = renderHook(() => {
      const session = useSession()
      const preprocess = usePreprocessAudio(session, onPreprocessed)
      return { session, preprocess }
    })

    act(() => result.current.session.startProcessing({ kind: 'microphone' }))
    act(() => result.current.preprocess.run(audio()))

    const worker = instances[0]
    expect(worker?.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'preprocess' }),
      expect.any(Array),
    )

    const processed = new Float32Array(10)
    act(() =>
      worker?.emit({ type: 'result', pcm: processed, sampleRate: 22_050, trimOffsetSamples: 0 }),
    )

    expect(onPreprocessed).toHaveBeenCalledWith({ pcm: processed, sampleRate: 22_050 })
  })

  it('um erro do worker falha a sessão com preprocess-failed', () => {
    const { instances } = installFakeWorker()
    const { result } = renderHook(() => {
      const session = useSession()
      const preprocess = usePreprocessAudio(session, vi.fn())
      return { session, preprocess }
    })

    act(() => result.current.session.startProcessing({ kind: 'microphone' }))
    act(() => result.current.preprocess.run(audio()))
    act(() => instances[0]?.emit({ type: 'error', message: 'falhou' }))

    expect(result.current.session.state).toMatchObject({
      status: 'error',
      code: 'preprocess-failed',
    })
  })
})
