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

  /**
   * Explicação prévia de permissão — Tarefa 4, decisão 6.
   *
   * Mostrada só uma vez (`useRecordingFlow`, `needsPermissionExplainer`),
   * antes de `getUserMedia` disparar o diálogo do próprio browser. Um pedido
   * de permissão sem contexto é recusado com frequência, e a recusa é difícil
   * de reverter — vale mais um ecrã a explicar do que perder o utilizador
   * aqui.
   */
  micExplainerTitle: 'Usar o microfone',
  micExplainerBody:
    'A seguir vais ver o pedido de permissão do browser. O áudio fica só neste dispositivo — nunca é enviado para lado nenhum.',
  micExplainerConfirm: 'Continuar',
  micExplainerCancel: 'Agora não',

  /** Enquanto `decodeAudioData` corre — Tarefa 5, decisão 2. */
  decodingFile: 'A preparar o ficheiro…',

  /**
   * Oferta de truncagem — Tarefa 5, decisão 4. Não é um erro (fica fora de
   * `@/strings/errors.ts`): o ficheiro é válido, só mais longo do que a app
   * consegue transcrever de uma vez. A duração original mostra-se ao lado,
   * formatada com `formatElapsed` — não faz parte deste texto estático.
   */
  truncateTitle: 'Ficheiro mais longo do que o limite',
  truncateBody:
    'Só é possível transcrever até 60 segundos de cada vez. Continuar só com o início do ficheiro?',
  truncateConfirm: 'Usar os primeiros 60 segundos',
  truncateCancel: 'Cancelar',
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
