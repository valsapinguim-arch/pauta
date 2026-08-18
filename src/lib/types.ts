/**
 * Tipos do pipeline de transcrição — ver docs/architecture.md (decisão 3).
 *
 *   NoteEvent[] → TempoMap → QuantizedNote[] → KeyAnalysis → ScoreDocument
 *
 * Estes tipos são deliberadamente pobres nesta fase: o objetivo da Tarefa 1 é
 * fixar os NOMES e as FRONTEIRAS do pipeline, não a riqueza das estruturas. As
 * Tarefas 8 a 12 refinam-nos. O que não deve acontecer é cada tarefa inventar
 * o seu próprio tipo de nota — por isso vivem todos aqui e só aqui.
 *
 * Convenção de unidades: sufixo explícito (`Sec`, `Ticks`, `Ms`). O pipeline
 * atravessa três unidades de tempo diferentes e a confusão entre elas é um bug
 * silencioso — produz uma pauta errada, não uma exceção.
 */

/** Resolução interna de notação. Coincide com `divisions` do MusicXML e com os
 *  ticks do MIDI (Tarefa 15), o que elimina conversões na exportação. */
export const TICKS_PER_QUARTER = 480

/** Proveniência de um valor analisado. O utilizador vê isto: um andamento
 *  assumido nunca é apresentado como detetado (Tarefas 9 e 11). */
export type AnalysisSource = 'detected' | 'assumed' | 'manual'

// ---------------------------------------------------------------------------
// 0. Áudio capturado (Tarefas 4/5), antes do pré-processamento (Tarefa 6)
// ---------------------------------------------------------------------------

/**
 * PCM + taxa de amostragem — a forma de saída partilhada pela captura por
 * microfone (Tarefa 4) e pela importação de ficheiro (Tarefa 5); ver
 * `@/features/capture`. Vive aqui (e não numa das duas features) porque a
 * Tarefa 6 e a sessão (`@/features/session`) também precisam dele, e as
 * features não se importam uma à outra por um tipo — só por um `index.ts`
 * que ambas consomem.
 *
 * Não é ainda o formato que o modelo de transcrição exige (mono a 22050 Hz,
 * `docs/architecture.md`, decisão 5) — essa garantia só existe depois do
 * worker de áudio (Tarefa 6, `assertModelInput`).
 */
export interface CapturedAudio {
  pcm: Float32Array
  sampleRate: number
}

// ---------------------------------------------------------------------------
// 1. Saída do modelo (Tarefa 7), depois de limpa pela Tarefa 8
// ---------------------------------------------------------------------------

export interface NoteEvent {
  /** Altura em número de nota MIDI. 60 = dó central (C4). */
  pitchMidi: number
  startSec: number
  durationSec: number
  /** Amplitude relativa em [0, 1]. Usada pelos filtros da Tarefa 8. */
  amplitude: number
}

// ---------------------------------------------------------------------------
// 2. Tempo (Tarefa 9)
// ---------------------------------------------------------------------------

export interface TimeSignature {
  numerator: number
  denominator: number
}

export interface TempoMap {
  bpm: number
  /** Assumido 4/4 nesta fase — ver Tarefa 9, decisão 4. */
  timeSignature: TimeSignature
  /** Momento do primeiro tempo forte, em segundos. */
  firstBeatSec: number
  confidence: number
  source: AnalysisSource
}

/** Grelha de tempos e limites de compasso sobre a qual a Tarefa 10
 *  (quantização) trabalha — ver Tarefa 9, Âmbito técnico. Derivada de um
 *  `TempoMap` e de uma duração; não guarda estado próprio nenhum. */
export interface BeatGrid {
  /** Momento de cada tempo (batida), em segundos, do primeiro ao último
   *  dentro da duração da peça. */
  beatsSec: number[]
  /** Subconjunto de `beatsSec`: só os tempos que iniciam um compasso novo. */
  measureBoundariesSec: number[]
}

// ---------------------------------------------------------------------------
// 3. Quantização (Tarefa 10)
// ---------------------------------------------------------------------------

/** Grelha binária até à semicorchea — sem tercinas (Tarefa 10, decisão 1). */
export type NoteType = 'whole' | 'half' | 'quarter' | 'eighth' | 'sixteenth'

export interface QuantizedNote {
  /** `null` numa pausa. */
  pitchMidi: number | null
  startTick: number
  durationTicks: number
  noteType: NoteType
  dots: 0 | 1
  isRest: boolean
  /** Ligadura de prolongação — partes de uma nota dividida na barra de
   *  compasso partilham `sourceIndex` e são tratadas como uma unidade. */
  tiedToNext: boolean
  tiedFromPrevious: boolean
  /** Índice da `NoteEvent` de origem; `null` numa pausa gerada. */
  sourceIndex: number | null
  measureIndex: number
}

// ---------------------------------------------------------------------------
// 4. Tonalidade (Tarefa 11)
// ---------------------------------------------------------------------------

export type KeyMode = 'major' | 'minor'

export interface KeyAnalysis {
  /** Tónica como classe de altura, 0 = dó. */
  tonic: number
  mode: KeyMode
  /** Armação de clave: negativo = bemóis, positivo = sustenidos, −7…+7. */
  sharpsOrFlats: number
  confidence: number
  source: AnalysisSource
}

// ---------------------------------------------------------------------------
// 5. Documento de notação (Tarefa 12) — a ÚNICA representação da partitura
// ---------------------------------------------------------------------------

export type Clef = 'treble' | 'bass'

/** Grau da escala, `C`…`B`. Separado de `alter` para espelhar o MusicXML. */
export type Step = 'C' | 'D' | 'E' | 'F' | 'G' | 'A' | 'B'

/** Acidente visível. `null` = não escrever nada (a nota segue a armação). */
export type Accidental = 'sharp' | 'flat' | 'natural' | null

export type TieRole = 'start' | 'stop' | 'continue' | null

export interface NotationNote {
  kind: 'note'
  step: Step
  /** −1 = bemol, 0 = natural, +1 = sustenido. */
  alter: -1 | 0 | 1
  /** Convenção científica: dó central (MIDI 60) é oitava 4. */
  octave: number
  pitchMidi: number
  noteType: NoteType
  dots: 0 | 1
  accidental: Accidental
  tie: TieRole
  sourceIndex: number | null
}

export interface NotationRest {
  kind: 'rest'
  noteType: NoteType
  dots: 0 | 1
}

export type NotationElement = NotationNote | NotationRest

export interface Measure {
  /** 1-indexado, como se lê numa pauta. */
  number: number
  elements: NotationElement[]
}

/** Confiança detalhada por etapa. O agregado decide se se mostra o aviso; os
 *  detalhes dizem ao utilizador O QUE corrigir (Tarefa 12, decisão 5). */
export interface ConfidenceBreakdown {
  overall: number
  notes: number
  tempo: number
  key: number
}

export interface ScoreMetadata {
  /** Incrementa em qualquer alteração à estrutura de `ScoreDocument`, com
   *  migração correspondente em `@/lib/migrations` (Tarefa 16). */
  schemaVersion: number
  /** Nunca vazio — ver Tarefa 12, decisão 4. */
  title: string
  createdAt: string
  /** Nome do ficheiro importado, ou `null` se veio do microfone. */
  sourceName: string | null
  durationSec: number
  confidence: ConfidenceBreakdown
}

export interface ScoreDocument {
  metadata: ScoreMetadata
  tempo: TempoMap
  key: KeyAnalysis
  /** Uma só clave por documento (Tarefa 12, decisão 3). */
  clef: Clef
  measures: Measure[]
}
