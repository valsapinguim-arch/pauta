import { useCallback, useRef } from 'react'
import { logError } from '@/features/diagnostics/errorLog'
import type { SessionApi } from '@/features/session'
import { analyzeKey } from '@/lib/key/analyzeKey'
import { cleanNotes } from '@/lib/notes/cleanNotes'
import { buildScoreDocument } from '@/lib/notation/buildScoreDocument'
import { defaultTitle } from '@/lib/notation/defaultTitle'
import { quantize } from '@/lib/quantize/quantize'
import { buildTempoMap } from '@/lib/tempo/buildTempoMap'
import type { CapturedAudio } from '@/lib/types'
import type { TranscribeRequest, TranscribeResponse } from '@/workers/transcribe.worker.types'

/** Tarefa 21, decisão 6 — cobre o caso em que o worker não morre mas fica
 *  pendurado (memória esgotada, contexto WebGL perdido, Notas/Dependências
 *  da tarefa). Generoso de propósito: o processamento por blocos (Tarefa
 *  19) já pode legitimamente demorar dezenas de segundos num dispositivo
 *  fraco — o limite existe para o caso "nunca mais responde", não para
 *  apertar o caso lento. */
const TRANSCRIBE_TIMEOUT_MS = 120_000

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
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearTimeoutGuard = useCallback(() => {
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
  }, [])

  const terminate = useCallback(() => {
    clearTimeoutGuard()
    workerRef.current?.terminate()
    workerRef.current = null
  }, [clearTimeoutGuard])

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

  /** Regista no diagnóstico local antes de falhar a sessão (Tarefa 21,
   *  decisão 3) — a mensagem técnica fica só aqui, nunca na interface. */
  const fail = useCallback(
    (code: string, technicalDetails: string) => {
      void logError({
        code,
        occurredAt: new Date().toISOString(),
        context: 'useTranscriber',
        technicalDetails,
      })
      session.fail(code, true)
    },
    [session],
  )

  const armTimeout = useCallback(() => {
    clearTimeoutGuard()
    timeoutRef.current = setTimeout(() => {
      fail('operation-timeout', 'transcribe.worker.ts não respondeu dentro do limite')
      terminate()
    }, TRANSCRIBE_TIMEOUT_MS)
  }, [clearTimeoutGuard, fail, terminate])

  const transcribe = useCallback(
    (audio: CapturedAudio) => {
      const worker = getWorker()
      // Calculado já aqui, não dentro de `onmessage`: `audio.pcm.buffer` é
      // TRANSFERIDO (não copiado) para o worker no `postMessage` mais
      // abaixo — depois disso, `audio.pcm.length` fica permanentemente 0
      // (o `ArrayBuffer` original fica destacado). Ler a duração só quando
      // o resultado chega, mais tarde, dava sempre 0 — bug real encontrado
      // ao inspecionar a Biblioteca (Tarefa 16), onde toda a duração
      // guardada aparecia como "00:00".
      const durationSec = audio.pcm.length / audio.sampleRate

      worker.onmessage = (event: MessageEvent<TranscribeResponse>) => {
        const message = event.data

        if (message.type === 'progress') {
          // Progresso é sinal de vida — reinicia o limite de tempo (decisão
          // 6) em vez de o deixar contar desde o pedido original.
          armTimeout()
          session.advanceProcessing(message.stage, message.progress)
          return
        }

        if (message.type === 'result') {
          // Tarefa 20 (casos limite): o pipeline daqui para a frente
          // (limpeza, tempo, quantização, tonalidade, notação) já lançou em
          // produção com áudio sintético de teste — uma exceção não
          // apanhada aqui deixava a sessão presa em "processing" para
          // sempre (progresso a 100%, sem erro nenhum visível, sem forma
          // de recuperar exceto recarregar a página). `transcribe-failed`
          // é o mesmo código catch-all já usado para falhas dentro do
          // worker (ver o `case 'error'` abaixo) — do ponto de vista de
          // quem vê o ecrã, uma inferência que falhou e uma quantização
          // que rejeitou o resultado são o mesmo tipo de falha.
          try {
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
                durationSec,
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

            clearTimeoutGuard()
            session.finishProcessing(document, notes)
          } catch (error) {
            if (import.meta.env.DEV) {
              console.error('[pauta] pipeline de notação falhou depois da inferência', error)
            }
            fail('transcribe-failed', String(error))
            terminate()
          }
          return
        }

        // message.type === 'error' — um worker que falhou a meio de uma
        // transcrição já não está num estado de confiar para a próxima; ver
        // decisão 7, mesma lógica do cancelamento: descartar e recarregar.
        fail(message.code, message.message)
        terminate()
      }

      // Tarefa 21, decisão 5: cobre a morte inesperada do worker
      // (`onerror`, ex.: exceção não apanhada a meio do módulo) E uma
      // mensagem que chega mas não pode ser desserializada (`onmessageerror`,
      // ex.: `postMessage` de algo não clonável) — nenhum dos dois passa por
      // `onmessage`, por isso precisam do seu próprio tratamento.
      worker.onerror = () => {
        fail('transcribe-failed', 'worker.onerror — worker de transcrição morreu inesperadamente')
        terminate()
      }

      worker.onmessageerror = () => {
        fail('transcribe-failed', 'worker.onmessageerror — mensagem do worker não pôde ser lida')
        terminate()
      }

      const request: TranscribeRequest = {
        type: 'transcribe',
        pcm: audio.pcm,
        sampleRate: audio.sampleRate,
      }
      armTimeout()
      // Transferido, não copiado — mesma decisão 2 da Tarefa 6. `audio.pcm`
      // não volta a ser lido depois desta linha; nada no pipeline atual
      // guarda essa referência para mais tarde.
      worker.postMessage(request, [audio.pcm.buffer])
    },
    [session, getWorker, terminate, fail, armTimeout, clearTimeoutGuard],
  )

  return { transcribe, cancel: terminate }
}
