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

export const errors = {
  /* O catálogo a sério é da Tarefa 21. Aqui só o suficiente para o error
     boundary ter o que mostrar desde o primeiro dia. */
  unexpectedTitle: 'Algo correu mal',
  unexpectedBody:
    'A app encontrou um erro inesperado. Recarregar costuma resolver — as transcrições que já tinhas guardadas não se perdem.',
  reload: 'Recarregar',
} as const
