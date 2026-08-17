import {
  useCallback,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type RefObject,
} from 'react'
import type { SessionApi } from '@/features/session'
import { downmixToMono } from '@/lib/audio/downmixToMono'
import { calculateRms } from '@/lib/audio/rms'
import { MAX_RECORDING_MS, TOO_QUIET_RMS_THRESHOLD } from './useMicrophone'

export type FileErrorCode =
  'file-too-large' | 'unsupported-format' | 'decode-failed' | 'no-audio-track' | 'too-quiet'

/** Ver Tarefa 5, decisão 4 — barreira mais barata que ler o ficheiro inteiro
 *  para a memória só para descobrir que é longo demais. */
const MAX_FILE_SIZE_BYTES = 30 * 1024 * 1024

export interface PendingTruncation {
  /** Duração original do ficheiro, em ms — para mostrar ao utilizador com
   *  `formatElapsed` (`@/features/session`). */
  originalDurationMs: number
  /** Continua com os primeiros `MAX_RECORDING_MS` do ficheiro. */
  confirm: () => void
  /** Descarta o ficheiro; a sessão fica onde estava. */
  cancel: () => void
}

export interface FilePickerApi {
  fileInputRef: RefObject<HTMLInputElement | null>
  /** `onChange` do `<input type="file">` escondido — ver Âmbito técnico da
   *  Tarefa 5. */
  handleFileInputChange: (event: ChangeEvent<HTMLInputElement>) => void
  handleDrop: (event: DragEvent<HTMLElement>) => void
  /** Aciona o `<input>` escondido; ligar ao botão já existente da Tarefa 3. */
  pickFile: () => void
  /** `true` enquanto `decodeAudioData` está a correr — Tarefa 5, decisão 2:
   *  na thread principal, mas sem bloquear a UI de forma percetível dentro
   *  dos limites da decisão 4. */
  decoding: boolean
  pendingTruncation: PendingTruncation | null
}

/** Exportada só para teste — nunca chamada fora deste ficheiro em produção.
 *  Só evita guardar uma string vazia como nome de sessão. Não é a
 *  sanitização de nome de ficheiro de saída que a Tarefa 15 vai precisar
 *  (caracteres proibidos por SO, extensão) — essa fica para lá. */
export function sanitizeFileName(name: string): string {
  const trimmed = name.trim()
  return trimmed.length > 0 ? trimmed : 'audio'
}

/**
 * Importação de ficheiro — ver Tarefa 5. Converge no mesmo formato de saída
 * que `useMicrophone` (Tarefa 4) e reutiliza o seu vocabulário de erros
 * nomeados (decisão 5): entrega `{ pcm, sampleRate }` a
 * `session.startProcessing`, exatamente como `useRecordingFlow` entrega a
 * `session.stopRecording`.
 *
 * Ao contrário de `useMicrophone`, não há recursos com vida útil para gerir
 * entre `start`/`stop` — cada ficheiro é um ciclo síncrono de validar,
 * descodificar e decidir, por isso não há separação entre um hook "puro" e
 * uma ponte para a sessão: aqui os dois cabem juntos.
 */
export function useFilePicker(session: SessionApi): FilePickerApi {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [decoding, setDecoding] = useState(false)
  const [pendingTruncation, setPendingTruncation] = useState<PendingTruncation | null>(null)

  const finish = useCallback(
    (pcm: Float32Array, sampleRate: number, fileName: string) => {
      // TODO Tarefa 6: entregar { pcm, sampleRate } ao pré-processamento —
      // por agora só se confirma que a importação funciona de ponta a ponta,
      // tal como em `useRecordingFlow.onCaptured`.
      console.warn(`[pauta] ficheiro descodificado: ${pcm.length} amostras a ${sampleRate} Hz`)
      session.startProcessing({ kind: 'file', name: fileName })
    },
    [session],
  )

  const processFile = useCallback(
    async (file: File) => {
      if (file.size > MAX_FILE_SIZE_BYTES) {
        session.fail('file-too-large', true)
        return
      }

      setDecoding(true)
      let audioContext: AudioContext | null = null
      try {
        const arrayBuffer = await file.arrayBuffer()
        audioContext = new AudioContext()

        let audioBuffer: AudioBuffer
        try {
          audioBuffer = await audioContext.decodeAudioData(arrayBuffer)
        } catch {
          /* Decisões 1 e 3: sem distinguir corrompido de formato não
             suportado — a única pergunta que interessa é se o browser
             conseguiu descodificar, e aqui a resposta é não. */
          session.fail('unsupported-format', true)
          return
        }

        if (audioBuffer.numberOfChannels === 0) {
          session.fail('no-audio-track', true)
          return
        }

        const channels: Float32Array[] = []
        for (let i = 0; i < audioBuffer.numberOfChannels; i += 1) {
          channels.push(audioBuffer.getChannelData(i))
        }
        const pcm = downmixToMono(channels)
        const sampleRate = audioBuffer.sampleRate
        const durationMs = (pcm.length / sampleRate) * 1000
        const fileName = sanitizeFileName(file.name)

        const proceed = (samples: Float32Array) => {
          if (calculateRms(samples) < TOO_QUIET_RMS_THRESHOLD) {
            session.fail('too-quiet', true)
            return
          }
          finish(samples, sampleRate, fileName)
        }

        if (durationMs > MAX_RECORDING_MS) {
          const truncatedLength = Math.round((MAX_RECORDING_MS / 1000) * sampleRate)
          const truncated = pcm.slice(0, truncatedLength)
          setPendingTruncation({
            originalDurationMs: durationMs,
            confirm: () => {
              setPendingTruncation(null)
              proceed(truncated)
            },
            cancel: () => setPendingTruncation(null),
          })
          return
        }

        proceed(pcm)
      } catch {
        session.fail('decode-failed', true)
      } finally {
        setDecoding(false)
        if (audioContext && audioContext.state !== 'closed') {
          void audioContext.close()
        }
      }
    },
    [session, finish],
  )

  const pickFile = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const handleFileInputChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      /* Repor já aqui, não só depois de processar: sem isto, escolher o MESMO
         ficheiro outra vez (ex.: depois de cancelar a truncagem) não dispara
         `onChange` da segunda vez. */
      event.target.value = ''
      if (file) void processFile(file)
    },
    [processFile],
  )

  const handleDrop = useCallback(
    (event: DragEvent<HTMLElement>) => {
      event.preventDefault()
      const file = event.dataTransfer.files[0]
      if (file) void processFile(file)
    },
    [processFile],
  )

  return { fileInputRef, handleFileInputChange, handleDrop, pickFile, decoding, pendingTruncation }
}
