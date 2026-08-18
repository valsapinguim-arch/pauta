import { Alert, Button, IconButton, Sheet } from '@/components'
import { MinusIcon, PlusIcon } from '@/components/icons'
import type { ScoreDocument } from '@/lib/types'
import { result } from '@/strings'
import { ResultPlaceholderScore } from './ResultPlaceholderScore'
import styles from './ResultView.module.css'

export interface ResultViewProps {
  document: ScoreDocument
  /** Já real: `session.reset()` volta a `idle`, transição que o reducer trata
   *  desde a Tarefa 1. */
  onNewTranscription: () => void
  /** Correção manual do BPM (Tarefa 9, decisão 6/7) — recebe o novo valor já
   *  clampado por quem chama (`applyManualBpm`, `@/lib/tempo`); esta view só
   *  incrementa/decrementa e mostra o resultado, nunca recalcula sozinha. */
  onBpmChange: (bpm: number) => void
}

/**
 * A pauta desenhada aqui é uma ilustração estática — ver
 * `ResultPlaceholderScore` e prompts/tasks/03-interface-minima.md, Notas. A
 * Tarefa 13 substitui-a pelo `ScoreDocument` desenhado a sério com VexFlow.
 */
export function ResultView({
  document: scoreDocument,
  onNewTranscription,
  onBpmChange,
}: ResultViewProps) {
  const { bpm, source } = scoreDocument.tempo

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>{scoreDocument.metadata.title}</h2>

      <Sheet elevated padding="lg" className={styles.score}>
        <ResultPlaceholderScore />
      </Sheet>

      <div className={styles.tempo}>
        <span className={styles.tempoLabel}>{result.tempoLabel}</span>
        <div className={styles.tempoControl}>
          <IconButton
            icon={<MinusIcon />}
            label={result.decreaseBpm}
            size="sm"
            onClick={() => onBpmChange(bpm - 1)}
          />
          <span className={styles.tempoValue}>
            {Math.round(bpm)} {result.bpmUnit}
          </span>
          <IconButton
            icon={<PlusIcon />}
            label={result.increaseBpm}
            size="sm"
            onClick={() => onBpmChange(bpm + 1)}
          />
        </div>
      </div>

      {source === 'assumed' && (
        <Alert tone="info" title={result.assumedTempoTitle}>
          {result.assumedTempoBody}
        </Alert>
      )}

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
