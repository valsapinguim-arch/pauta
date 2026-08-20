import { getErrorEntry, isKnownErrorCode as isKnownCatalogCode } from '@/lib/errors'

/**
 * Textos de erro — ver Tarefa 4, Âmbito técnico, e Tarefa 21, decisão 1.
 *
 * O catálogo (código, mensagem, ação, recuperabilidade) vive em
 * `@/lib/errors.ts` — a partir da Tarefa 21, único sítio que o define. Este
 * ficheiro fica como a camada que a interface consome (`getErrorMessage`,
 * `isKnownErrorCode`), mais os textos que não são "um erro nomeado" (o
 * genérico de recurso e o ecrã de crash do `AppErrorBoundary`).
 */

export const crash = {
  title: 'Algo correu mal',
  body: 'A app encontrou um erro inesperado. Recarregar costuma resolver — as transcrições que já tinhas guardadas não se perdem.',
  reload: 'Recarregar',
  /** Tarefa 21, decisão 10 — só aparece quando havia um `ScoreDocument` no
   *  momento do crash. */
  savedNotice: 'A última transcrição já estava guardada na biblioteca — não se perdeu.',
} as const

export interface ErrorMessage {
  title: string
  body: string
  action: string
}

/** `ErrorView` cai aqui quando o código não é nenhum dos conhecidos do
 *  catálogo — mostrar `state.code` cru ao utilizador seria expor um detalhe
 *  técnico. */
export const generic: ErrorMessage = {
  title: 'Não foi possível continuar',
  body: 'Alguma coisa correu mal. Podes voltar ao início e tentar outra vez.',
  action: 'Tentar novamente',
}

export const genericRestart = 'Voltar ao início'

export function isKnownErrorCode(code: string): boolean {
  return isKnownCatalogCode(code)
}

/** `ErrorView` usa isto em vez de importar `@/lib/errors` diretamente —
 *  mantém a interface sem saber a forma exata do catálogo. */
export function getErrorMessage(code: string): ErrorMessage | null {
  const entry = getErrorEntry(code)
  if (!entry) return null
  return { title: entry.title, body: entry.body, action: entry.action }
}
