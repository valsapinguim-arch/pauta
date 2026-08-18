import { Button, Sheet } from '@/components'
import type { ScoreDocument } from '@/lib/types'
import { result } from '@/strings'
import { ResultPlaceholderScore } from './ResultPlaceholderScore'
import styles from './ResultView.module.css'

export interface ResultViewProps {
  document: ScoreDocument
  /** Já real: `session.reset()` volta a `idle`, transição que o reducer trata
   *  desde a Tarefa 1. */
  onNewTranscription: () => void
}

/**
 * A pauta desenhada aqui é uma ilustração estática — ver
 * `ResultPlaceholderScore` e prompts/tasks/03-interface-minima.md, Notas. A
 * Tarefa 13 substitui-a pelo `ScoreDocument` desenhado a sério com VexFlow.
 */
export function ResultView({ document: scoreDocument, onNewTranscription }: ResultViewProps) {
  return (
    <div className={styles.container}>
      <h2 className={styles.title}>{scoreDocument.metadata.title}</h2>

      <Sheet elevated padding="lg" className={styles.score}>
        <ResultPlaceholderScore />
      </Sheet>

      <div className={styles.actions}>
        <Button variant="secondary" onClick={onNewTranscription}>
          {result.newTranscription}
        </Button>
        {/* TODO Tarefa 15: os cinco formatos reais de exportação. */}
        <Button variant="secondary" disabled>
          {result.export}
        </Button>
      </div>
    </div>
  )
}
