/**
 * Protocolo de mensagens do worker de pré-processamento — ver Tarefa 6,
 * Âmbito técnico. Vive num ficheiro à parte de `audio.worker.ts` (e não
 * `*.worklet.ts`, por isso ainda cai no `tsconfig.worker.json`) de propósito:
 * só tipos puros, sem `self.postMessage`/`onmessage` nem nada específico do
 * `WebWorker` lib — é o que permite `@/features/transcribe/usePreprocessAudio`
 * (compilado sob o `tsconfig.json` principal, lib `DOM`) importar estes tipos
 * sem arrastar o corpo do worker para o programa errado.
 */

export interface PreprocessRequest {
  type: 'preprocess'
  pcm: Float32Array
  sampleRate: number
}

export type PreprocessStep = 'mono' | 'low-pass' | 'resample' | 'trim-silence' | 'normalize'

export interface PreprocessProgressMessage {
  type: 'progress'
  step: PreprocessStep
  /** Fração concluída do pré-processamento inteiro, [0, 1] — não só desta
   *  etapa (ver `session.advanceProcessing`, que espera um valor global). */
  progress: number
}

export interface PreprocessResultMessage {
  type: 'result'
  pcm: Float32Array
  sampleRate: number
  /** Amostras cortadas do início por `trimSilence` — propagar até à
   *  reprodução (Tarefa 14) e ao alinhamento rítmico (Tarefa 9). */
  trimOffsetSamples: number
}

export interface PreprocessErrorMessage {
  type: 'error'
  message: string
}

export type PreprocessResponse =
  PreprocessProgressMessage | PreprocessResultMessage | PreprocessErrorMessage
