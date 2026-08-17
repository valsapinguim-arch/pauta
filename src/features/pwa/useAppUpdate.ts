import { useRegisterSW } from 'virtual:pwa-register/react'
import type { SessionStatus } from '@/features/session'

export interface AppUpdateApi {
  /** Só true quando há mesmo uma atualização à espera E é seguro mostrá-la —
   *  nunca durante `recording`/`processing` (Tarefa 2, decisão 5). Continua
   *  `true` internamente enquanto isso não acontece; assim que a sessão volta
   *  a `idle`/`result`/`error`, o aviso aparece sem se ter perdido nada. */
  showUpdatePrompt: boolean
  offlineReady: boolean
  dismissOfflineReady: () => void
  /** Só é chamado a partir de um clique explícito em "Atualizar" — nunca
   *  automaticamente. Só o próprio hook envia a mensagem `SKIP_WAITING` ao
   *  service worker (ver src/sw.ts) depois desta chamada. */
  updateNow: () => void
}

/**
 * Fluxo de atualização — ver Tarefa 2, decisão 5.
 *
 * `useRegisterSW` (de `virtual:pwa-register/react`) já implementa o padrão
 * "prompt for update" do Workbox: deteta o novo service worker em `waiting`,
 * marca `needRefresh`, e só envia `SKIP_WAITING` quando `updateServiceWorker`
 * é chamado — nunca sozinho. `src/sw.ts` do lado do worker está escrito para
 * este exato contrato (sem `skipWaiting()` automático em `install`).
 */
export function useAppUpdate(sessionStatus: SessionStatus): AppUpdateApi {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisterError(error: unknown) {
      /* Catálogo de erros só existe a partir da Tarefa 21 — regista-se para
         não desaparecer em silêncio; essa tarefa substitui isto. */
      console.error('[pauta] falha ao registar o service worker', error)
    },
  })

  const duringTranscription = sessionStatus === 'recording' || sessionStatus === 'processing'

  return {
    showUpdatePrompt: needRefresh && !duringTranscription,
    /* "Já funciona offline" é só informativo — não desfaz nada, por isso não
       precisa da mesma cautela que o aviso de atualização. */
    offlineReady,
    dismissOfflineReady: () => setOfflineReady(false),
    updateNow: () => {
      void updateServiceWorker(true)
    },
  }
}
