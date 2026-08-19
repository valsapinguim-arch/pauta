import { Button, Progress, Spinner } from '@/components'
import type { ProcessingStage } from '@/features/session/session.types'
import { processing, processingStage } from '@/strings'
import styles from './ProcessingView.module.css'

export interface ProcessingViewProps {
  stage: ProcessingStage
  /** Vem de `state.progress` (Tarefa 1) — monótono por contrato (Tarefa 7,
   *  decisão 6): `preprocessing` (Tarefa 6) avança por etapa do worker de
   *  áudio, `preparing-model` pelos bytes do modelo descarregados (Tarefa 7,
   *  decisão 5, `tf.loadGraphModel`'s `onProgress`) e `transcribing` pela
   *  fração de janelas de 2 s já inferidas. */
  progress: number
  /** Já real: cancelar processamento é uma transição que o reducer trata
   *  desde a Tarefa 1. */
  onCancel: () => void
}

export function ProcessingView({ stage, progress, onCancel }: ProcessingViewProps) {
  const label = processingStage[stage]

  return (
    <div className={styles.container}>
      <Spinner size="lg" />
      <p className={styles.stage} aria-live="polite">
        {label}
      </p>
      <Progress value={progress} label={processing.progressLabel} className={styles.progress} />
      <Button variant="secondary" onClick={onCancel}>
        {processing.cancel}
      </Button>
    </div>
  )
}
