/**
 * Cinco views, uma por estado da sessão — ver Tarefa 3, decisão 7. `App.tsx`
 * escolhe entre elas por `switch` exaustivo sobre `state.status`.
 */
export { ErrorView } from './ErrorView'
export type { ErrorViewProps } from './ErrorView'
export { IdleView } from './IdleView'
export type { IdleViewProps } from './IdleView'
export { ProcessingView } from './ProcessingView'
export type { ProcessingViewProps } from './ProcessingView'
export { RecordingView } from './RecordingView'
export type { RecordingViewProps } from './RecordingView'
export { ResultView } from './ResultView'
export type { ResultViewProps } from './ResultView'
