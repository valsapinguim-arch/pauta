import { useCallback, useEffect, useRef } from 'react'
import { chooseDurationLimitMs } from '@/lib/performance/durationLimit'
import type { CapturedAudio } from '@/lib/types'
import { detectDeviceCapability } from './deviceCapability'
/* `?worker&url`: dá a URL do ficheiro já compilado pelo Vite (TypeScript
   transpilado, imports de @/lib resolvidos), sem o instanciar como Worker —
   é exatamente o que `audioWorklet.addModule(url)` precisa. `new URL(...,
   import.meta.url)` sozinho NÃO chega aqui: só copia o .ts tal e qual, sem o
   passar pelo pipeline de build (ver AGENTS.md). */
import recorderWorkletUrl from '@/workers/recorder.worklet.ts?worker&url'

export type MicrophoneErrorCode =
  'permission-denied' | 'no-microphone' | 'microphone-busy' | 'not-supported' | 'too-quiet'

export type { CapturedAudio }

export interface UseMicrophoneOptions {
  onLevel: (level: number, elapsedMs: number) => void
  onCaptured: (audio: CapturedAudio) => void
  onError: (code: MicrophoneErrorCode) => void
}

export interface MicrophoneApi {
  /** `true` se a gravação arrancou; `false` se falhou — `onError` já foi
   *  chamado nesse caso, com o código certo. */
  start: () => Promise<boolean>
  stop: () => void
  cancel: () => void
}

/** Ver Tarefa 4, decisão 3, ajustado por dispositivo na Tarefa 19, decisão
 *  4 — calculado uma só vez, ao carregar o módulo (a capacidade do
 *  dispositivo não muda durante a sessão). Também usadas por `RecordingView`
 *  e `IdleView` para o aviso visual e o valor mostrado ao utilizador —
 *  importar sempre daqui, nunca duplicar o número nem recalcular. */
export const MAX_RECORDING_MS = chooseDurationLimitMs(detectDeviceCapability())
/** 10 s antes do limite, qualquer que ele seja — nunca um valor absoluto
 *  fixo, que deixaria de fazer sentido se `MAX_RECORDING_MS` descer para um
 *  dispositivo fraco (Tarefa 19). */
export const WARNING_THRESHOLD_MS = MAX_RECORDING_MS - 10_000

/** RMS abaixo disto conta como "não se ouviu nada" (decisão 9). Provisório —
 *  por afinar com áudio real, tal como `MODEL_THRESHOLDS` (Tarefa 7) e
 *  `NOTE_CLEANUP` (Tarefa 8); mesma razão: só se sabe o valor certo depois de
 *  ver o resultado em pautas reais. Exportada porque a Tarefa 5 reutiliza o
 *  mesmo limiar tal e qual, para o `too-quiet` de ficheiro importado. */
export const TOO_QUIET_RMS_THRESHOLD = 0.01

/** Ver Tarefa 4, decisão 4 — nunca ativar sem medição documentada. */
const AUDIO_CONSTRAINTS: MediaTrackConstraints = {
  echoCancellation: false,
  noiseSuppression: false,
  autoGainControl: false,
}

/** Exportada só para teste — nunca chamada fora deste ficheiro em produção. */
export function mapGetUserMediaError(error: unknown): MicrophoneErrorCode {
  const name = error instanceof DOMException ? error.name : ''
  switch (name) {
    case 'NotAllowedError':
    case 'SecurityError':
      return 'permission-denied'
    case 'NotFoundError':
    case 'DevicesNotFoundError':
      return 'no-microphone'
    case 'NotReadableError':
    case 'TrackStartError':
    case 'AbortError':
      return 'microphone-busy'
    default:
      return 'not-supported'
  }
}

interface LevelMessage {
  type: 'level'
  rms: number
}

interface BufferMessage {
  type: 'buffer'
  samples: Float32Array
}

type WorkletMessage = LevelMessage | BufferMessage

/**
 * Captura de microfone — ver Tarefa 4.
 *
 * Web Audio + `AudioWorkletNode` (decisão 1), nunca `MediaRecorder`. Todo o
 * ciclo de vida dos recursos (stream, `AudioContext`, worklet) vive em refs
 * geridas por este hook; `options.onLevel/onCaptured/onError` são o único
 * contacto com quem o usa — normalmente `useRecordingFlow`, que traduz estes
 * eventos para transições da máquina de estados da sessão.
 */
export function useMicrophone(options: UseMicrophoneOptions): MicrophoneApi {
  /* Guardado em ref para o handler do worklet (definido uma vez, dentro de
     `start`) chamar sempre a versão mais recente das opções, sem precisar de
     recriar o AudioWorkletNode a cada render. A atualização vive num efeito
     (nunca direto no corpo do render) — mutar `ref.current` durante o render
     é proibido pelas regras mais recentes do react-hooks. */
  const optionsRef = useRef(options)
  useEffect(() => {
    optionsRef.current = options
  }, [options])

  const streamRef = useRef<MediaStream | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const workletNodeRef = useRef<AudioWorkletNode | null>(null)
  const recordingStartTimeRef = useRef(0)
  const maxRmsRef = useRef(0)

  const cleanup = useCallback(() => {
    const workletNode = workletNodeRef.current
    if (workletNode) {
      workletNode.port.onmessage = null
      workletNode.port.close()
      workletNode.disconnect()
      workletNodeRef.current = null
    }

    for (const track of streamRef.current?.getTracks() ?? []) {
      track.stop()
    }
    streamRef.current = null

    const audioContext = audioContextRef.current
    if (audioContext && audioContext.state !== 'closed') {
      void audioContext.close()
    }
    audioContextRef.current = null
  }, [])

  /* Decisão 7: mesmo que o componente desmonte sem stop()/cancel() explícito
     — ex.: navegação inesperada — o microfone não pode continuar ativo. */
  useEffect(() => cleanup, [cleanup])

  const sendStop = useCallback(() => {
    workletNodeRef.current?.port.postMessage({ type: 'stop' })
  }, [])

  const start = useCallback(async (): Promise<boolean> => {
    if (!navigator.mediaDevices?.getUserMedia) {
      optionsRef.current.onError('not-supported')
      return false
    }

    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: AUDIO_CONSTRAINTS })
    } catch (error) {
      optionsRef.current.onError(mapGetUserMediaError(error))
      return false
    }

    /* Sem forçar sampleRate — decisão 5; a reamostragem para 22050 Hz é da
       Tarefa 6. */
    const audioContext = new AudioContext()

    let workletNode: AudioWorkletNode
    try {
      await audioContext.audioWorklet.addModule(recorderWorkletUrl)
      workletNode = new AudioWorkletNode(audioContext, 'recorder-processor')
    } catch {
      for (const track of stream.getTracks()) track.stop()
      void audioContext.close()
      optionsRef.current.onError('not-supported')
      return false
    }

    workletNode.port.onmessage = (event: MessageEvent<WorkletMessage>) => {
      const message = event.data

      if (message.type === 'level') {
        maxRmsRef.current = Math.max(maxRmsRef.current, message.rms)
        const elapsedMs = (audioContext.currentTime - recordingStartTimeRef.current) * 1000
        optionsRef.current.onLevel(message.rms, elapsedMs)
        if (elapsedMs >= MAX_RECORDING_MS) {
          sendStop()
        }
        return
      }

      // message.type === 'buffer'
      const sampleRate = audioContext.sampleRate
      const tooQuiet = maxRmsRef.current < TOO_QUIET_RMS_THRESHOLD
      cleanup()
      if (tooQuiet) {
        optionsRef.current.onError('too-quiet')
      } else {
        optionsRef.current.onCaptured({ pcm: message.samples, sampleRate })
      }
    }

    const source = audioContext.createMediaStreamSource(stream)
    source.connect(workletNode)
    /* Sem connect(audioContext.destination): não se quer ouvir o próprio
       microfone em eco enquanto se grava. */

    streamRef.current = stream
    audioContextRef.current = audioContext
    workletNodeRef.current = workletNode
    recordingStartTimeRef.current = audioContext.currentTime
    maxRmsRef.current = 0

    return true
  }, [cleanup, sendStop])

  const stop = useCallback(() => {
    sendStop()
  }, [sendStop])

  const cancel = useCallback(() => {
    cleanup()
  }, [cleanup])

  return { start, stop, cancel }
}
