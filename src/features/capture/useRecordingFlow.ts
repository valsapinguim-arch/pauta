import { useCallback, useState } from 'react'
import type { SessionApi } from '@/features/session'
import type { CapturedAudio } from '@/lib/types'
import { useMicrophone } from './useMicrophone'

const MIC_EXPLAINED_KEY = 'pauta:mic-explained'

export interface RecordingFlowApi {
  /** `true` até o utilizador confirmar a explicação do microfone uma vez —
   *  ver Tarefa 4, decisão 6. Fica `false` para sempre depois disso
   *  (`localStorage`), mesmo depois de recarregar a página. */
  needsPermissionExplainer: boolean
  /** Pede logo o microfone. Usar quando `needsPermissionExplainer` é
   *  `false` — a `IdleView` é quem decide isso, este hook só expõe o dado. */
  requestStart: () => void
  /** Regista que a explicação já foi mostrada e só depois pede o microfone —
   *  chamar a partir do botão de confirmar da explicação, nunca diretamente
   *  do botão de gravar. */
  confirmPermissionExplainer: () => void
  /** Pára a sério: o microfone só larga o stream depois de o worklet
   *  devolver o buffer final — só nesse momento a sessão passa a
   *  `processing` (ou a `error`, se ficou demasiado baixa). */
  stop: () => void
  cancel: () => void
}

/**
 * Ponte entre `useMicrophone` (Web Audio, não sabe nada de `SessionApi`) e a
 * máquina de estados da sessão (Tarefa 1). Mantém as duas coisas separadas de
 * propósito: `useMicrophone` só fala a linguagem do Web Audio, isto é que
 * traduz os seus eventos em transições concretas.
 *
 * `onAudioReady` (Tarefa 6) entrega o PCM capturado a quem o pré-processa —
 * chamado imediatamente a seguir a `session.stopRecording()`, nunca antes:
 * a sessão já tem de estar em `processing` quando o worker começa a reportar
 * progresso. Passado por parâmetro (em vez de o PCM viver no estado da
 * sessão) de propósito: o mecanismo `?state=` (Tarefa 3) força `processing`
 * sem nunca passar por aqui, e não pode disparar um worker de verdade.
 */
export function useRecordingFlow(
  session: SessionApi,
  onAudioReady: (audio: CapturedAudio) => void,
): RecordingFlowApi {
  const [needsPermissionExplainer, setNeedsPermissionExplainer] = useState(
    () => window.localStorage.getItem(MIC_EXPLAINED_KEY) !== '1',
  )

  const microphone = useMicrophone({
    onLevel: (level, elapsedMs) => {
      session.updateLevel(level, elapsedMs)
    },
    onCaptured: (audio) => {
      session.stopRecording()
      onAudioReady(audio)
    },
    onError: (code) => {
      session.fail(code, true)
    },
  })

  const requestStart = useCallback(() => {
    void microphone.start().then((started) => {
      if (started) {
        session.startRecording({ kind: 'microphone' })
      }
    })
  }, [microphone, session])

  const confirmPermissionExplainer = useCallback(() => {
    window.localStorage.setItem(MIC_EXPLAINED_KEY, '1')
    setNeedsPermissionExplainer(false)
    requestStart()
  }, [requestStart])

  const stop = useCallback(() => {
    microphone.stop()
  }, [microphone])

  const cancel = useCallback(() => {
    microphone.cancel()
    session.cancel()
  }, [microphone, session])

  return {
    needsPermissionExplainer,
    requestStart,
    confirmPermissionExplainer,
    stop,
    cancel,
  }
}
