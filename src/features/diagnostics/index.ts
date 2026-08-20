/* Erros e telemetria (Tarefa 21): registo local em anel, ecrã de
   diagnóstico e consentimento de telemetria. */
export {
  clearErrorLog,
  ERROR_LOG_LIMIT,
  formatErrorLogAsText,
  listErrorLog,
  logError,
} from './errorLog'
export type { ErrorLogEntry } from './errorLog'
export { useDiagnostics } from './useDiagnostics'
export type { DeviceInfo, DiagnosticsApi } from './useDiagnostics'
export { DiagnosticsView } from './views/DiagnosticsView'
export type { DiagnosticsViewProps } from './views/DiagnosticsView'
