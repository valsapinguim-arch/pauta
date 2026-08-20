/**
 * Catálogo único de erros nomeados — Tarefa 21, decisões 1-3.
 *
 * Todo o erro da app vive aqui: código, mensagem para o utilizador (pt-PT),
 * ação sugerida e se é recuperável (se faz sentido "Tentar novamente" ou só
 * "Voltar ao início"). As Tarefas 4-20 já tinham criado a maior parte destes
 * códigos e mensagens de forma independente, em `src/strings/errors.ts` — este
 * ficheiro é agora a fonte única; `src/strings/errors.ts` importa daqui.
 *
 * Nenhuma entrada pode faltar `action` — é a decisão 2 ("toda a mensagem de
 * erro diz o que fazer a seguir"), verificada por teste
 * (`src/lib/errors.test.ts`).
 */

export interface ErrorCatalogEntry {
  code: string
  title: string
  body: string
  action: string
  recoverable: boolean
}

export const errorCatalog = {
  // Tarefa 4 — captura de microfone.
  'permission-denied': {
    title: 'Sem acesso ao microfone',
    body: 'Autoriza o acesso ao microfone nas definições do browser e tenta outra vez.',
    action: 'Tentar novamente',
    recoverable: true,
  },
  'no-microphone': {
    title: 'Nenhum microfone encontrado',
    body: 'Liga um microfone ao dispositivo, ou verifica se já tens um disponível.',
    action: 'Tentar novamente',
    recoverable: true,
  },
  'microphone-busy': {
    title: 'Microfone ocupado',
    body: 'Outra aplicação está a usar o microfone. Fecha-a e tenta outra vez.',
    action: 'Tentar novamente',
    recoverable: true,
  },
  'not-supported': {
    title: 'Gravação não suportada',
    body: 'Este browser não suporta gravação de áudio. Experimenta um browser atual, como o Chrome ou o Safari.',
    action: 'Voltar ao início',
    recoverable: false,
  },
  'too-quiet': {
    title: 'Não se ouviu nada',
    body: 'A gravação ficou demasiado baixa para transcrever. Aproxima-te da fonte de som e tenta outra vez.',
    action: 'Tentar novamente',
    recoverable: true,
  },

  // Tarefa 5 — importação de ficheiro.
  'file-too-large': {
    title: 'Ficheiro demasiado grande',
    body: 'Este ficheiro tem mais de 30 MB. Escolhe um ficheiro mais pequeno, ou grava diretamente pelo microfone.',
    action: 'Tentar novamente',
    recoverable: true,
  },
  'unsupported-format': {
    title: 'Não foi possível abrir este ficheiro',
    body: 'O formato não é suportado por este browser, ou o ficheiro está corrompido. Experimenta outro ficheiro, ou outro browser.',
    action: 'Tentar novamente',
    recoverable: true,
  },
  'decode-failed': {
    title: 'Não foi possível ler o ficheiro',
    body: 'Alguma coisa correu mal a processar este ficheiro. Tenta outra vez, ou escolhe outro ficheiro.',
    action: 'Tentar novamente',
    recoverable: true,
  },
  'no-audio-track': {
    title: 'Sem áudio neste ficheiro',
    body: 'Este ficheiro não tem uma faixa de áudio para transcrever. Escolhe outro ficheiro.',
    action: 'Tentar novamente',
    recoverable: true,
  },

  // Tarefa 6 — pré-processamento.
  'preprocess-failed': {
    title: 'Não foi possível preparar o áudio',
    body: 'Alguma coisa correu mal a processar o áudio antes de transcrever. Tenta gravar ou importar outra vez.',
    action: 'Tentar novamente',
    recoverable: true,
  },

  // Tarefa 7 — transcrição.
  'model-unavailable': {
    title: 'Não foi possível carregar o modelo',
    body: 'É preciso estar ligado à internet na primeira transcrição, para descarregar o modelo uma única vez. Verifica a ligação e tenta outra vez.',
    action: 'Tentar novamente',
    recoverable: true,
  },
  'backend-unavailable': {
    title: 'Este browser não consegue transcrever',
    body: 'Não foi possível iniciar o motor de transcrição neste dispositivo. Experimenta um browser atual, como o Chrome ou o Safari.',
    action: 'Voltar ao início',
    recoverable: false,
  },
  'transcribe-failed': {
    title: 'Não foi possível transcrever',
    body: 'Alguma coisa correu mal durante a transcrição. Tenta outra vez, ou experimenta um trecho mais curto.',
    action: 'Tentar novamente',
    recoverable: true,
  },

  // Tarefa 21 — limite de tempo (decisão 6) e falha de gravação local.
  'operation-timeout': {
    title: 'Isto está a demorar demasiado',
    body: 'A operação não respondeu a tempo — pode ter ficado presa. Tenta outra vez; se voltar a acontecer, experimenta um trecho mais curto.',
    action: 'Tentar novamente',
    recoverable: true,
  },
  'diagnostics-log-failed': {
    title: 'Não foi possível guardar o registo de diagnóstico',
    body: 'O registo local de erros não pôde ser escrito. Isto não afeta a transcrição em curso.',
    action: 'Tentar novamente',
    recoverable: true,
  },
} as const satisfies Record<string, Omit<ErrorCatalogEntry, 'code'>>

export type ErrorCode = keyof typeof errorCatalog

export function isKnownErrorCode(code: string): code is ErrorCode {
  return code in errorCatalog
}

/** Único ponto de leitura do catálogo — `ErrorView`, `AppErrorBoundary` e o
 *  registo de diagnóstico usam sempre isto, nunca indexam `errorCatalog`
 *  diretamente, para nenhum deles poder mostrar uma entrada sem `action`. */
export function getErrorEntry(code: string): ErrorCatalogEntry | null {
  if (!isKnownErrorCode(code)) return null
  return { code, ...errorCatalog[code] }
}
