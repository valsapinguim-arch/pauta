import { useCallback, useRef } from 'react'
import type { SessionApi } from '@/features/session'
import { analyzeKey } from '@/lib/key/analyzeKey'
import { cleanNotes } from '@/lib/notes/cleanNotes'
import { buildScoreDocument } from '@/lib/notation/buildScoreDocument'
import { defaultTitle } from '@/lib/notation/defaultTitle'
import { quantize } from '@/lib/quantize/quantize'
import { buildTempoMap } from '@/lib/tempo/buildTempoMap'
import type { CapturedAudio } from '@/lib/types'
import type { TranscribeRequest, TranscribeResponse } from '@/workers/transcribe.worker.types'

export interface TranscriberApi {
  /** Corre uma transcrição no worker (Tarefa 7). Chamar diretamente a partir
   *  de quem entrega o áudio pré-processado (`usePreprocessAudio`) — nunca a
   *  partir de uma reação a `session.state`, pela mesma razão documentada em
   *  `usePreprocessAudio`: o mecanismo `?state=processing` (Tarefa 3) nunca
   *  passa por aqui, e não pode acordar um worker de verdade. */
  transcribe: (audio: CapturedAudio) => void
  /** Termina o worker (se houver) — a próxima `transcribe()` recria-o e
   *  recarrega o modelo (Tarefa 7, decisão 7). Não mexe na sessão: quem
   *  cancela decide também se e quando chamar `session.cancel()` (ver
   *  `App.tsx`, que cancela os dois workers do pipeline antes de tocar na
   *  sessão uma única vez). */
  cancel: () => void
}

/**
 * Ponte entre `transcribe.worker.ts` (Tarefa 7) e a máquina de estados da
 * sessão — mesmo papel que `usePreprocessAudio` tem para `audio.worker.ts`
 * (Tarefa 6). A diferença: este worker é REUTILIZADO entre transcrições
 * (Tarefa 7, decisão 4) — `workerRef` só é limpo por `cancel()` ou por um
 * erro fatal, nunca depois de um resultado com sucesso.
 *
 * A limpeza de notas (Tarefa 8, `cleanNotes`) corre aqui, na thread
 * principal, não dentro do worker: é `@/lib` puro e barato (operações sobre
 * arrays, sem tensores), e o worker de transcrição existe só para o que
 * precisa mesmo de correr lá — o modelo (Tarefa 7, decisão 9: "todo o resto
 * do pipeline trabalha sobre um tipo próprio").
 *
 * Fecha o pipeline (Tarefa 12): `notas → tempo → quantização → tonalidade →
 * ScoreDocument`, todo em `@/lib`, corre aqui na thread principal a seguir
 * ao resultado do worker, terminando em `session.finishProcessing`, que
 * transita a sessão para `result` pela primeira vez com um documento real
 * (não o fixture de `?state=result`, Tarefa 3).
 */
export function useTranscriber(session: SessionApi): TranscriberApi {
  const workerRef = useRef<Worker | null>(null)

  const terminate = useCallback(() => {
    workerRef.current?.terminate()
    workerRef.current = null
  }, [])

  const getWorker = useCallback(() => {
    if (!workerRef.current) {
      workerRef.current = new Worker(
        new URL('../../workers/transcribe.worker.ts', import.meta.url),
        {
          type: 'module',
        },
      )
    }
    return workerRef.current
  }, [])

  const transcribe = useCallback(
    (audio: CapturedAudio) => {
      const worker = getWorker()

      worker.onmessage = (event: MessageEvent<TranscribeResponse>) => {
        const message = event.data

        if (message.type === 'progress') {
          session.advanceProcessing(message.stage, message.progress)
          return
        }

        if (message.type === 'result') {
          const { notes, confidence } = cleanNotes(message.notes)
          const tempoMap = buildTempoMap(notes)
          const { notes: quantized, rhythmConfidence } = quantize(notes, tempoMap)
          const keyAnalysis = analyzeKey(quantized)

          // `session.state` aqui é o estado capturado quando `transcribe()`
          // foi chamado (closure), não uma leitura ao vivo — mas a fonte não
          // muda durante `processing`, por isso está sempre correta.
          const sourceName =
            session.state.status === 'processing' && session.state.source.kind === 'file'
              ? session.state.source.name
              : null
          const createdAt = new Date().toISOString()

          const document = buildScoreDocument({
            quantizedNotes: quantized,
            tempoMap,
            keyAnalysis,
            metadata: {
              title: defaultTitle(sourceName, createdAt),
              createdAt,
              sourceName,
              durationSec: audio.pcm.length / audio.sampleRate,
              notesConfidence: confidence,
            },
          })

          if (import.meta.env.DEV) {
            console.warn(
              `[pauta] pauta construída: ${document.measures.length} compassos, ` +
                `confiança rítmica ${rhythmConfidence.toFixed(2)} (não entra em ` +
                `ScoreDocument.metadata.confidence — só as três da decisão 5)`,
              document,
            )
          }

          session.finishProcessing(document, notes)
          return
        }

        // message.type === 'error' — um worker que falhou a meio de uma
        // transcrição já não está num estado de confiar para a próxima; ver
        // decisão 7, mesma lógica do cancelamento: descartar e recarregar.
        session.fail(message.code, true)
        terminate()
      }

      worker.onerror = () => {
        session.fail('transcribe-failed', true)
        terminate()
      }

      const request: TranscribeRequest = {
        type: 'transcribe',
        pcm: audio.pcm,
        sampleRate: audio.sampleRate,
      }
      // Transferido, não copiado — mesma decisão 2 da Tarefa 6. `audio.pcm`
      // não volta a ser lido depois desta linha; nada no pipeline atual
      // guarda essa referência para mais tarde.
      worker.postMessage(request, [audio.pcm.buffer])
    },
    [session, getWorker, terminate],
  )

  return { transcribe, cancel: terminate }
}
