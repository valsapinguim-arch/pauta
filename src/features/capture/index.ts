/* Captura de áudio: microfone (Tarefa 4) e importação de ficheiro (Tarefa 5).
   Ambas convergem no mesmo formato de saída: Float32Array + sampleRate. */
export type { CapturedAudio, MicrophoneErrorCode } from './useMicrophone'
export { MAX_RECORDING_MS, WARNING_THRESHOLD_MS } from './useMicrophone'
export type { RecordingFlowApi } from './useRecordingFlow'
export { useRecordingFlow } from './useRecordingFlow'
export type { FileErrorCode, FilePickerApi, PendingTruncation } from './useFilePicker'
export { useFilePicker } from './useFilePicker'
