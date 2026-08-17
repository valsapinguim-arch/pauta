/* Orquestração dos workers: pré-processamento (Tarefa 6) e inferência (Tarefa 7).
   `MODEL_THRESHOLDS` fica só em `@/workers/transcribe.worker.ts` — nunca
   reexportado daqui: fazê-lo arrastaria o corpo do worker (TensorFlow.js
   incluído) para o grafo de módulos da thread principal. */
export type { PreprocessAudioApi, PreprocessErrorCode } from './usePreprocessAudio'
export { usePreprocessAudio } from './usePreprocessAudio'
export type { TranscriberApi } from './useTranscriber'
export { useTranscriber } from './useTranscriber'
export type { TranscribeErrorCode } from '@/workers/transcribe.worker.types'
