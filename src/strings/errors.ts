import type { MicrophoneErrorCode } from '@/features/capture'

/**
 * Textos de erro — ver Tarefa 4, Âmbito técnico.
 *
 * Todos os "algo correu mal" da app vivem aqui: o crash do `AppErrorBoundary`,
 * o genérico de `ErrorView` (sem catálogo, Tarefa 21) e, a partir de agora,
 * cada erro nomeado de captura, com a sua própria mensagem e ação — ver
 * Tarefa 4, decisão 9 ("proibido colapsar tudo num erro genérico"). As
 * Tarefas 5 (importação de ficheiro) e 21 (catálogo completo) estendem este
 * ficheiro; não criar um segundo sítio para texto de erro.
 */

export const crash = {
  title: 'Algo correu mal',
  body: 'A app encontrou um erro inesperado. Recarregar costuma resolver — as transcrições que já tinhas guardadas não se perdem.',
  reload: 'Recarregar',
} as const

export interface ErrorMessage {
  title: string
  body: string
  action: string
}

/** `ErrorView` cai aqui quando o código não é nenhum dos conhecidos abaixo.
 *  Sem catálogo completo (Tarefa 21), mostrar `state.code` cru ao utilizador
 *  seria expor um detalhe técnico — fica à espera dessa tarefa. */
export const generic: ErrorMessage = {
  title: 'Não foi possível continuar',
  body: 'Alguma coisa correu mal. Podes voltar ao início e tentar outra vez.',
  action: 'Tentar novamente',
}

export const genericRestart = 'Voltar ao início'

export const microphoneErrors: Record<MicrophoneErrorCode, ErrorMessage> = {
  'permission-denied': {
    title: 'Sem acesso ao microfone',
    body: 'Autoriza o acesso ao microfone nas definições do browser e tenta outra vez.',
    action: 'Tentar novamente',
  },
  'no-microphone': {
    title: 'Nenhum microfone encontrado',
    body: 'Liga um microfone ao dispositivo, ou verifica se já tens um disponível.',
    action: 'Tentar novamente',
  },
  'microphone-busy': {
    title: 'Microfone ocupado',
    body: 'Outra aplicação está a usar o microfone. Fecha-a e tenta outra vez.',
    action: 'Tentar novamente',
  },
  'not-supported': {
    title: 'Gravação não suportada',
    body: 'Este browser não suporta gravação de áudio. Experimenta um browser atual, como o Chrome ou o Safari.',
    action: 'Voltar ao início',
  },
  'too-quiet': {
    title: 'Não se ouviu nada',
    body: 'A gravação ficou demasiado baixa para transcrever. Aproxima-te da fonte de som e tenta outra vez.',
    action: 'Tentar novamente',
  },
}

export function isKnownErrorCode(code: string): code is MicrophoneErrorCode {
  return code in microphoneErrors
}
