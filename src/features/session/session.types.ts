import type { NoteEvent, ScoreDocument } from '@/lib/types'

/**
 * Estado do ecrã principal — ver Tarefa 1, decisão 3.
 *
 * União discriminada, não um conjunto de booleanos. Com `isRecording` e
 * `isProcessing` independentes é trivial chegar a "a gravar e a processar ao
 * mesmo tempo"; aqui essa combinação é inexprimível. Cada estado carrega
 * exclusivamente os dados que lhe pertencem.
 */

/** De onde veio o áudio. O resto do pipeline não deve saber a diferença
 *  (Tarefa 5, decisão: as Tarefas 4 e 5 convergem no mesmo formato) — isto
 *  serve só para a interface e para nomear a exportação. */
export type AudioSource = { kind: 'microphone' } | { kind: 'file'; name: string }

/**
 * Etapa do processamento. `preparing-model` existe separada de `transcribing`
 * porque a primeira transcrição de uma sessão espera pelo download do modelo e
 * tem de ter mensagem própria (Tarefa 7, decisão 5) — sem isso parece que a
 * app está pendurada.
 */
export type ProcessingStage = 'preprocessing' | 'preparing-model' | 'transcribing' | 'analysing'

export type SessionState =
  | { status: 'idle' }
  | {
      status: 'recording'
      source: AudioSource
      /** RMS em [0, 1], para o indicador de nível (Tarefa 4, decisão 8). */
      level: number
      elapsedMs: number
    }
  | {
      status: 'processing'
      source: AudioSource
      stage: ProcessingStage
      /** Fração de trabalho concluído em [0, 1]. Monótona por contrato
       *  (Tarefa 7, decisão 6): baseada em blocos processados, nunca em
       *  tempo estimado. */
      progress: number
    }
  | {
      status: 'result'
      document: ScoreDocument
      /** Notas limpas (Tarefa 8) que geraram o documento — mantidas depois
       *  de consumidas para que a correção manual do BPM (Tarefa 9, decisão
       *  7) recalcule sem repetir a inferência do modelo. Não descartar. */
      notes: NoteEvent[]
    }
  | {
      status: 'error'
      /** Código do catálogo de erros (`@/lib/errors`, Tarefa 21, decisão 1).
       *  Tipado como `string`, não `ErrorCode`: os workers (Tarefas 6, 7) e o
       *  registo de diagnóstico também usam códigos que não são para mostrar
       *  ao utilizador (`app-crash`, por exemplo) — `ErrorView` já trata um
       *  código desconhecido do catálogo com a mensagem genérica. */
      code: string
      recoverable: boolean
    }

export type SessionAction =
  | { type: 'recording/start'; source: AudioSource }
  | { type: 'recording/level'; level: number; elapsedMs: number }
  | { type: 'recording/stop' }
  | { type: 'processing/start'; source: AudioSource }
  | { type: 'processing/advance'; stage: ProcessingStage; progress: number }
  | { type: 'processing/done'; document: ScoreDocument; notes: NoteEvent[] }
  /** Correção de BPM (Tarefa 9), de tonalidade (Tarefa 11) ou edição manual
   *  (Tarefa 17): substitui o documento sem repetir a inferência. */
  | { type: 'result/replace'; document: ScoreDocument }
  /** Abrir uma transcrição a partir da biblioteca local (Tarefa 16) — entra
   *  direto em `result`, sem gravar nem processar. `notes: []` porque a
   *  biblioteca guarda só o `ScoreDocument`, nunca o áudio nem as
   *  `NoteEvent[]` de origem (decisão 4); a correção manual de BPM não as
   *  usa hoje (ver `applyManualBpm`), e um documento aberto da biblioteca
   *  não pode voltar a ser re-transcrito de qualquer forma. */
  | { type: 'library/open'; document: ScoreDocument }
  | { type: 'fail'; code: string; recoverable: boolean }
  | { type: 'cancel' }
  | { type: 'reset' }

export type SessionStatus = SessionState['status']
