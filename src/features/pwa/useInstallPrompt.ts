import { useCallback, useEffect, useRef, useState } from 'react'
import type { SessionStatus } from '@/features/session'

/**
 * `beforeinstallprompt` não faz parte do `lib.dom.d.ts` — é uma extensão só do
 * Chromium. Declarada localmente porque só é usada aqui.
 */
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[]
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
  prompt: () => Promise<void>
}

const VISITED_KEY = 'pauta:visited'

function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    /* iOS não suporta `display-mode: standalone` antes de instalar; tem o seu
       próprio sinalizador. */
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

function isIosSafari(): boolean {
  const ua = navigator.userAgent
  const isIos = /iphone|ipad|ipod/i.test(ua)
  /* Chrome, Firefox e Edge em iOS usam o motor do Safari mas têm o seu próprio
     token no user agent — sem os excluir, "isIosSafari" apanhava-os também. */
  const isSafari = /safari/i.test(ua) && !/crios|fxios|edgios/i.test(ua)
  return isIos && isSafari
}

export interface InstallPromptApi {
  canInstall: boolean
  promptInstall: () => Promise<void>
  /**
   * iOS Safari nunca dispara `beforeinstallprompt` — não há evento nenhum
   * para capturar. Task 3 usa isto para mostrar instruções manuais ("Partilhar
   * → Adicionar ao ecrã principal") em vez de a instalação simplesmente não
   * ser oferecida a ninguém em iOS (ver Tarefa 2, Notas / Dependências).
   */
  isIosManualInstall: boolean
}

/**
 * Convite de instalação — ver Tarefa 2, Âmbito técnico.
 *
 * Nunca aparece na primeira visita (`isFirstVisit`) nem durante uma
 * transcrição (`sessionStatus`) — ninguém quer um diálogo de instalação a
 * meio de gravar ou a meio de esperar pelo resultado.
 */
export function useInstallPrompt(sessionStatus: SessionStatus): InstallPromptApi {
  const deferredEventRef = useRef<BeforeInstallPromptEvent | null>(null)
  const [hasDeferredPrompt, setHasDeferredPrompt] = useState(false)
  const [installed, setInstalled] = useState(isStandalone)

  const [isFirstVisit] = useState(() => {
    const visited = window.localStorage.getItem(VISITED_KEY)
    if (visited) return false
    window.localStorage.setItem(VISITED_KEY, '1')
    return true
  })

  useEffect(() => {
    function onBeforeInstallPrompt(event: Event): void {
      /* Impede o mini-infobar automático do Chrome — o convite mostra-se só
         quando `canInstall` decidir que é boa altura. */
      event.preventDefault()
      deferredEventRef.current = event as BeforeInstallPromptEvent
      setHasDeferredPrompt(true)
    }

    function onAppInstalled(): void {
      deferredEventRef.current = null
      setHasDeferredPrompt(false)
      setInstalled(true)
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt)
    window.addEventListener('appinstalled', onAppInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt)
      window.removeEventListener('appinstalled', onAppInstalled)
    }
  }, [])

  const promptInstall = useCallback(async () => {
    const event = deferredEventRef.current
    if (!event) return
    await event.prompt()
    await event.userChoice
    /* O browser só deixa usar cada evento uma vez, aceite ou recusado —
       descarta-se e espera-se por um `beforeinstallprompt` novo. */
    deferredEventRef.current = null
    setHasDeferredPrompt(false)
  }, [])

  const duringTranscription = sessionStatus === 'recording' || sessionStatus === 'processing'

  return {
    canInstall: hasDeferredPrompt && !isFirstVisit && !duringTranscription && !installed,
    promptInstall,
    isIosManualInstall: !installed && !isFirstVisit && !duringTranscription && isIosSafari(),
  }
}
