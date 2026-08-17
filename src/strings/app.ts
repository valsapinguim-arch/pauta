/**
 * Textos da app, em pt-PT. Nenhum texto visível ao utilizador é escrito inline
 * no JSX — ver AGENTS.md.
 *
 * Sem biblioteca de i18n: há um só idioma (Tarefa 1, decisão 6). A Tarefa 18
 * revê a qualidade e a terminologia musical.
 */

export const app = {
  name: 'pauta',
  tagline: 'Toca ou canta, e sai a pauta.',
} as const

export const idle = {
  recordButton: 'Gravar',
  recordButtonHint: 'Toca para começar a gravar',
  pickFile: 'Usar um ficheiro de áudio',
  dropHint: 'Ou arrasta um ficheiro de áudio para aqui',

  /**
   * Aviso de limitação — Tarefa 3, decisão 6.
   *
   * Fica no ecrã inicial, ANTES de gravar. Enterrado num ecrã de ajuda ninguém
   * o lê; mostrado depois do resultado, é uma desculpa. Não remover, não
   * esconder, não adiar. Discreto de propósito: não deve parecer que a app
   * está estragada.
   */
  limitationNotice:
    'Funciona com uma voz ou um instrumento de cada vez. Com vários instrumentos ao mesmo tempo — uma banda, uma música do rádio — o resultado não vai prestar.',
} as const

export const recording = {
  stop: 'Parar',
  cancel: 'Cancelar',
  levelLabel: 'Nível de áudio',
} as const

/** Um rótulo por `ProcessingStage` (Tarefa 1) — a etapa existe no tipo desde
 *  a Tarefa 1, o texto que a descreve não devia ficar a reboque de quem a vier
 *  a disparar (Tarefas 6/7). */
export const processingStage = {
  preprocessing: 'A preparar o áudio…',
  'preparing-model': 'A preparar o modelo pela primeira vez…',
  transcribing: 'A transcrever…',
  analysing: 'A analisar o resultado…',
} as const

export const processing = {
  cancel: 'Cancelar',
  progressLabel: 'Progresso da transcrição',
} as const

export const result = {
  newTranscription: 'Nova transcrição',
  /* TODO Tarefa 15: os cinco formatos reais (MusicXML, MIDI, PNG, PDF,
     partilha). Este é só o slot, desativado. */
  export: 'Exportar',
} as const

export const errors = {
  /* O catálogo a sério é da Tarefa 21. Aqui só o suficiente para o error
     boundary ter o que mostrar desde o primeiro dia. */
  unexpectedTitle: 'Algo correu mal',
  unexpectedBody:
    'A app encontrou um erro inesperado. Recarregar costuma resolver — as transcrições que já tinhas guardadas não se perdem.',
  reload: 'Recarregar',

  /**
   * `ErrorView` — mensagem genérica de propósito. Sem catálogo (Tarefa 21),
   * mostrar `state.code` cru ao utilizador seria expor um detalhe técnico que
   * o `AGENTS.md` dessa tarefa vai proibir; fica à espera do catálogo, não
   * adiantado aqui.
   */
  viewTitle: 'Não foi possível continuar',
  viewBody: 'Alguma coisa correu mal. Podes voltar ao início e tentar outra vez.',
  retry: 'Tentar novamente',
  restart: 'Voltar ao início',
} as const
