import { useCallback, useRef } from 'react'
import type { SessionApi } from '@/features/session'
import type { CapturedAudio } from '@/lib/types'
import type { PreprocessRequest, PreprocessResponse } from '@/workers/audio.worker.types'

export type PreprocessErrorCode = 'preprocess-failed'

export interface PreprocessAudioApi {
  /** Arranca um worker de pré-processamento novo e descartável
   *  (`docs/architecture.md`, decisão 4) com o áudio capturado. Chamar
   *  imediatamente a seguir a `session.stopRecording()`/`startProcessing()`
   *  — quem decide QUANDO é quem capturou o áudio (`useRecordingFlow` /
   *  `useFilePicker`), nunca uma reação a `session.state` (isso dispararia
   *  também com o mecanismo `?state=processing` da Tarefa 3, que nunca
   *  passou por aqui). */
  run: (audio: CapturedAudio) => void
  /** Termina o worker ativo (se houver) e devolve a sessão a `idle` — ver
   *  Tarefa 7, decisão 7: cancelar é terminar, nunca uma _flag_ verificada a
   *  meio (a convolução em curso não é interrompível de dentro). */
  cancel: () => void
}

/**
 * Ponte entre `audio.worker.ts` (Tarefa 6) e a máquina de estados da sessão
 * (Tarefa 1) — mesmo papel que `useRecordingFlow` tem para `useMicrophone`.
 *
 * Sem transcrição real ainda (Tarefa 7): ao terminar, só se regista o
 * resultado e a sessão fica em `processing`, tal como `useRecordingFlow` e
 * `useFilePicker` já deixam ao chegar aqui.
 */
export function usePreprocessAudio(session: SessionApi): PreprocessAudioApi {
  const workerRef = useRef<Worker | null>(null)

  const terminate = useCallback(() => {
    workerRef.current?.terminate()
    workerRef.current = null
  }, [])

  const run = useCallback(
    (audio: CapturedAudio) => {
      // Nunca deveria haver um worker ativo aqui (uma sessão só processa um
      // áudio de cada vez) — por segurança, se houver, não o deixamos por
      // trás a consumir memória.
      terminate()

      const worker = new Worker(new URL('../../workers/audio.worker.ts', import.meta.url), {
        type: 'module',
      })
      workerRef.current = worker

      worker.onmessage = (event: MessageEvent<PreprocessResponse>) => {
        const message = event.data

        if (message.type === 'progress') {
          session.advanceProcessing('preprocessing', message.progress)
          return
        }

        if (message.type === 'result') {
          // TODO Tarefa 7: entregar { pcm, sampleRate, trimOffsetSamples } à
          // inferência — por agora só se confirma que o pré-processamento
          // funciona de ponta a ponta.
          console.warn(
            `[pauta] áudio pré-processado: ${message.pcm.length} amostras a ` +
              `${message.sampleRate} Hz, ${message.trimOffsetSamples} amostras cortadas do início`,
          )
          terminate()
          return
        }

        // message.type === 'error'
        session.fail('preprocess-failed', true)
        terminate()
      }

      worker.onerror = () => {
        session.fail('preprocess-failed', true)
        terminate()
      }

      const request: PreprocessRequest = {
        type: 'preprocess',
        pcm: audio.pcm,
        sampleRate: audio.sampleRate,
      }
      // Transferido, não copiado — Tarefa 6, decisão 2. `audio.pcm` não
      // volta a ser lido depois desta linha.
      worker.postMessage(request, [audio.pcm.buffer])
    },
    [session, terminate],
  )

  const cancel = useCallback(() => {
    terminate()
    session.cancel()
  }, [terminate, session])

  return { run, cancel }
}
