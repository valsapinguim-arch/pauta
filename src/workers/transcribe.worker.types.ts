import type { NoteEvent } from '@/lib/types'

/**
 * Protocolo de mensagens do worker de transcrição — ver Tarefa 7, Âmbito
 * técnico. Ficheiro só de tipos, à parte de `transcribe.worker.ts`, pela
 * mesma razão documentada em `audio.worker.types.ts` (Tarefa 6): evita que
 * `@/features/transcribe/useTranscriber` (lib `DOM`, `tsconfig.json`
 * principal) arraste o corpo do worker (lib `WebWorker`,
 * `tsconfig.worker.json`) para o programa errado ao importar os tipos.
 */

export interface TranscribeRequest {
  type: 'transcribe'
  /** Contrato da Tarefa 6: mono, 22050 Hz. O worker valida isto de novo antes
   *  de correr o modelo — ver decisão 9 da Tarefa 6, "última linha de
   *  defesa", aplicada aqui do lado de quem recebe. */
  pcm: Float32Array
  sampleRate: number
}

export type TranscribeStage = 'preparing-model' | 'transcribing'

export interface TranscribeProgressMessage {
  type: 'progress'
  stage: TranscribeStage
  /** `preparing-model`: fração do download do modelo (Tarefa 7, decisão 5).
   *  `transcribing`: fração de janelas de 2 s processadas (decisão 6). */
  progress: number
}

export interface TranscribeResultMessage {
  type: 'result'
  /** Já no tipo do domínio (`@/lib/types`) — nada do TensorFlow.js ou do
   *  `@spotify/basic-pitch` atravessa esta fronteira (Tarefa 7, decisão 9). */
  notes: NoteEvent[]
}

/**
 * Ver Tarefa 7, Âmbito técnico ("Tratar falhas: modelo indisponível, backend
 * não inicializa, inferência falha"). `transcribe-failed` é o catch-all —
 * cobre também falhas de memória, difíceis de distinguir de forma fiável de
 * um erro de inferência qualquer entre browsers.
 */
export type TranscribeErrorCode = 'model-unavailable' | 'backend-unavailable' | 'transcribe-failed'

export interface TranscribeErrorMessage {
  type: 'error'
  code: TranscribeErrorCode
  /** Detalhe técnico, só para consola/diagnóstico — a mensagem mostrada ao
   *  utilizador vem do catálogo em `@/strings/errors.ts`, indexada por
   *  `code` (ver AGENTS.md: proibido expor mensagens técnicas cruas). */
  message: string
}

export type TranscribeResponse =
  TranscribeProgressMessage | TranscribeResultMessage | TranscribeErrorMessage
