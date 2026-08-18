import type { FileErrorCode, MicrophoneErrorCode } from '@/features/capture'
import type { PreprocessErrorCode } from '@/features/transcribe'

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

/**
 * Erros da Tarefa 5 (importação de ficheiro), alinhados com a Tarefa 4,
 * decisão 9 — ver Tarefa 5, decisão 5. `too-quiet` não é redefinido aqui: é o
 * mesmo código e a mesma mensagem de `microphoneErrors`, reutilizado tal e
 * qual — um ficheiro em silêncio é o mesmo problema que uma gravação em
 * silêncio. `too-long` fica de fora deste catálogo de propósito: não é um
 * erro, é uma oferta de truncagem tratada localmente em `IdleView`.
 */
export const fileErrors: Record<Exclude<FileErrorCode, 'too-quiet'>, ErrorMessage> = {
  'file-too-large': {
    title: 'Ficheiro demasiado grande',
    body: 'Este ficheiro tem mais de 30 MB. Escolhe um ficheiro mais pequeno, ou grava diretamente pelo microfone.',
    action: 'Tentar novamente',
  },
  'unsupported-format': {
    title: 'Não foi possível abrir este ficheiro',
    body: 'O formato não é suportado por este browser, ou o ficheiro está corrompido. Experimenta outro ficheiro, ou outro browser.',
    action: 'Tentar novamente',
  },
  'decode-failed': {
    title: 'Não foi possível ler o ficheiro',
    body: 'Alguma coisa correu mal a processar este ficheiro. Tenta outra vez, ou escolhe outro ficheiro.',
    action: 'Tentar novamente',
  },
  'no-audio-track': {
    title: 'Sem áudio neste ficheiro',
    body: 'Este ficheiro não tem uma faixa de áudio para transcrever. Escolhe outro ficheiro.',
    action: 'Tentar novamente',
  },
}

/**
 * Erro da Tarefa 6 (pré-processamento). Ao contrário dos catálogos acima,
 * não há vários códigos nomeados — `assertModelInput` e o resto da cadeia de
 * DSP são a última linha de defesa (Tarefa 6, decisão 9): se falharem, é o
 * próprio pipeline a produzir algo inválido, não uma escolha do utilizador
 * com uma ação diferente para cada caso. Um código único chega.
 */
export const preprocessErrors: Record<PreprocessErrorCode, ErrorMessage> = {
  'preprocess-failed': {
    title: 'Não foi possível preparar o áudio',
    body: 'Alguma coisa correu mal a processar o áudio antes de transcrever. Tenta gravar ou importar outra vez.',
    action: 'Tentar novamente',
  },
}

/** Junta os catálogos — ver a nota sobre `too-quiet` acima. Único sítio que
 *  sabe que há vários mapas; `isKnownErrorCode` e `getErrorMessage`
 *  consomem só isto. */
const allErrors: Record<string, ErrorMessage> = {
  ...microphoneErrors,
  ...fileErrors,
  ...preprocessErrors,
}

export function isKnownErrorCode(
  code: string,
): code is MicrophoneErrorCode | FileErrorCode | PreprocessErrorCode {
  return code in allErrors
}

/** `ErrorView` usa isto em vez de indexar `microphoneErrors`/`fileErrors`
 *  diretamente — evita que a view precise de saber que há dois catálogos. */
export function getErrorMessage(code: string): ErrorMessage | null {
  return allErrors[code] ?? null
}
