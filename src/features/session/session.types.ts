import type { ScoreDocument } from '@/lib/types'

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
  | { status: 'result'; document: ScoreDocument }
  | {
      status: 'error'
      /** Código do catálogo de erros (Tarefa 21, decisão 1). Tipado como
       *  `string` nesta fase porque o catálogo só existe a partir da Tarefa 21. */
      code: string
      recoverable: boolean
    }

export type SessionAction =
  | { type: 'recording/start'; source: AudioSource }
  | { type: 'recording/level'; level: number; elapsedMs: number }
  | { type: 'recording/stop' }
  | { type: 'processing/start'; source: AudioSource }
  | { type: 'processing/advance'; stage: ProcessingStage; progress: number }
  | { type: 'processing/done'; document: ScoreDocument }
  /** Correção de BPM (Tarefa 9), de tonalidade (Tarefa 11) ou edição manual
   *  (Tarefa 17): substitui o documento sem repetir a inferência. */
  | { type: 'result/replace'; document: ScoreDocument }
  | { type: 'fail'; code: string; recoverable: boolean }
  | { type: 'cancel' }
  | { type: 'reset' }

export type SessionStatus = SessionState['status']
