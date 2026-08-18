import type { SessionAction, SessionState } from './session.types'

export const initialSessionState: SessionState = { status: 'idle' }

/** Limites do valor de progresso/nível. Recebemos estes números de workers e de
 *  um `AudioWorklet`; um valor fora de gama a chegar ao CSS produz uma barra
 *  visualmente quebrada em vez de um erro. */
function clamp01(value: number): number {
  if (Number.isNaN(value)) return 0
  return Math.min(1, Math.max(0, value))
}

/**
 * Reducer do ecrã principal — ver Tarefa 1, decisão 3.
 *
 * A estrutura é `switch (state.status)` PRIMEIRO e só depois `action.type`.
 * Isto é deliberado: as transições permitidas dependem do estado de origem, e
 * qualquer par (estado, ação) que não esteja escrito cai no `return state`
 * final. Ou seja, transições inválidas são ignoradas por construção, em vez de
 * dependerem de uma lista de proibições que alguém tem de manter completa.
 *
 * `fail` e `reset` são as duas exceções, tratadas antes do switch: uma falha
 * pode ocorrer em qualquer momento, e `reset` é a saída de emergência de
 * qualquer estado.
 */
export function sessionReducer(state: SessionState, action: SessionAction): SessionState {
  if (action.type === 'fail') {
    return { status: 'error', code: action.code, recoverable: action.recoverable }
  }

  if (action.type === 'reset') {
    return { status: 'idle' }
  }

  switch (state.status) {
    case 'idle':
      switch (action.type) {
        case 'recording/start':
          return { status: 'recording', source: action.source, level: 0, elapsedMs: 0 }
        /* Importar um ficheiro (Tarefa 5) entra direto em processamento — não
           há fase de gravação. */
        case 'processing/start':
          return {
            status: 'processing',
            source: action.source,
            stage: 'preprocessing',
            progress: 0,
          }
        default:
          return rejected(state, action)
      }

    case 'recording':
      switch (action.type) {
        case 'recording/level':
          return {
            ...state,
            level: clamp01(action.level),
            elapsedMs: Math.max(0, action.elapsedMs),
          }
        case 'recording/stop':
          return {
            status: 'processing',
            source: state.source,
            stage: 'preprocessing',
            progress: 0,
          }
        case 'cancel':
          return { status: 'idle' }
        default:
          return rejected(state, action)
      }

    case 'processing':
      switch (action.type) {
        case 'processing/advance':
          return { ...state, stage: action.stage, progress: clamp01(action.progress) }
        case 'processing/done':
          return { status: 'result', document: action.document }
        case 'cancel':
          return { status: 'idle' }
        default:
          return rejected(state, action)
      }

    case 'result':
      switch (action.type) {
        case 'result/replace':
          return { status: 'result', document: action.document }
        /* Gravar ou importar de novo a partir do resultado, sem passar por
           `idle` — o utilizador carrega no botão e grava. */
        case 'recording/start':
          return { status: 'recording', source: action.source, level: 0, elapsedMs: 0 }
        case 'processing/start':
          return {
            status: 'processing',
            source: action.source,
            stage: 'preprocessing',
            progress: 0,
          }
        default:
          return rejected(state, action)
      }

    case 'error':
      switch (action.type) {
        case 'recording/start':
          return { status: 'recording', source: action.source, level: 0, elapsedMs: 0 }
        case 'processing/start':
          return {
            status: 'processing',
            source: action.source,
            stage: 'preprocessing',
            progress: 0,
          }
        default:
          return rejected(state, action)
      }
  }
}

/**
 * Transição inválida: mantém o estado. Avisa em desenvolvimento porque uma ação
 * ignorada em silêncio é exatamente o género de bug que se manifesta como
 * "a interface não reage" e leva horas a localizar.
 */
function rejected(state: SessionState, action: SessionAction): SessionState {
  if (import.meta.env.DEV) {
    console.warn(
      `[session] transição inválida ignorada: ${action.type} em estado "${state.status}"`,
    )
  }
  return state
}
