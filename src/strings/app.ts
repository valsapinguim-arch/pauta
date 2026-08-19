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

  /**
   * Controlo de BPM — Tarefa 9, decisão 6: o andamento nunca se apresenta
   * como facto, é sempre uma estimativa editável.
   */
  tempoLabel: 'Andamento',
  bpmUnit: 'BPM',
  decreaseBpm: 'Diminuir andamento em 1 BPM',
  increaseBpm: 'Aumentar andamento em 1 BPM',

  /** Aviso quando `tempo.source === 'assumed'` (Tarefa 9, decisão 5) — o
   *  andamento não foi detetado com confiança suficiente. */
  assumedTempoTitle: 'Andamento assumido',
  assumedTempoBody:
    'Não foi possível detetar o andamento com confiança. Corrige o valor ao lado se não for este.',

  /**
   * Controlo de tonalidade — Tarefa 11, decisão 6, mesmo espírito do BPM.
   * Nomes das doze classes de altura em pt-PT, com sustenido — só para este
   * controlo (decorativo); a grafia real de cada nota na pauta segue
   * `spellPitch`/`applyAccidentals` (`@/lib/key`), que escolhe sustenidos ou
   * bemóis conforme a armação (decisão 3), não esta lista.
   */
  noteNames: ['Dó', 'Dó#', 'Ré', 'Ré#', 'Mi', 'Fá', 'Fá#', 'Sol', 'Sol#', 'Lá', 'Lá#', 'Si'],
  keyLabel: 'Tonalidade',
  modeLabels: { major: 'maior', minor: 'menor' },
  decreaseTonic: 'Tonalidade anterior',
  increaseTonic: 'Tonalidade seguinte',
  toggleMode: 'Alternar entre maior e menor',

  /** Aviso quando `key.source === 'assumed'` (Tarefa 11, decisão 5). */
  assumedKeyTitle: 'Tonalidade assumida',
  assumedKeyBody:
    'Não foi possível detetar a tonalidade com confiança. Corrige ao lado se não for esta.',

  /** Edição do título e confiança agregada — Tarefa 12, decisão 4 e 5. */
  titleLabel: 'Título da transcrição',
  confidenceLabel: 'Confiança geral',
  confidenceNotes: 'notas',
  confidenceTempo: 'andamento',
  confidenceKey: 'tonalidade',
} as const

/** Controlos de reprodução (Tarefa 14) — `ResultView`, via `usePlayback`. */
export const playback = {
  play: 'Reproduzir',
  pause: 'Pausar',
  stop: 'Parar reprodução',
  speedLabel: 'Velocidade',
  decreaseSpeed: 'Diminuir a velocidade',
  increaseSpeed: 'Aumentar a velocidade',
  metronomeOn: 'Ligar o metrónomo',
  metronomeOff: 'Desligar o metrónomo',
} as const

/** Ações de exportação (Tarefa 15) — `ResultView`, via `useExport`.
 *  `export` é palavra reservada em JS/TS, daí `exportPanel`. */
export const exportPanel = {
  musicxml: 'MusicXML',
  midi: 'MIDI',
  png: 'Imagem (PNG)',
  pdf: 'PDF',
  errorTitle: 'Não foi possível exportar',
  errorBody: 'Tenta outra vez — se persistir, tenta um dos outros formatos.',
} as const

/** Textos de `@/features/notation/ScoreView` — Tarefa 13. */
export const notation = {
  /** Documento sem notas nenhumas — nunca um pentagrama vazio (decisão 9,
   *  Âmbito técnico). */
  emptyTitle: 'Nada para desenhar',
  emptyBody: 'A transcrição não teve notas suficientes para desenhar uma pauta.',

  decreaseZoom: 'Diminuir o zoom',
  increaseZoom: 'Aumentar o zoom',

  /** Aviso de confiança baixa (decisão 8) — identifica sempre a causa e
   *  aponta para a correção correspondente; nunca um aviso genérico. */
  lowConfidenceTitle: 'Este resultado pode não estar certo',
  lowConfidenceNotes:
    'As notas detetadas têm baixa confiança. Tenta gravar outra vez num sítio mais silencioso.',
  lowConfidenceTempo: 'O andamento pode estar errado — corrige-o abaixo, junto ao BPM.',
  lowConfidenceKey: 'A tonalidade pode estar errada — corrige-a abaixo.',
} as const
