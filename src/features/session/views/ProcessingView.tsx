import { Button, Progress, Spinner } from '@/components'
import type { ProcessingStage } from '@/features/session/session.types'
import { processing, processingStage } from '@/strings'
import styles from './ProcessingView.module.css'

export interface ProcessingViewProps {
  stage: ProcessingStage
  /** Vem de `state.progress` (Tarefa 1) — monótono por contrato (Tarefa 7,
   *  decisão 6). Enquanto as Tarefas 6/7 não existem, fica congelado no valor
   *  com que `processing/start` arrancou; não é um bug desta view. */
  progress: number
  /** Já real: cancelar processamento é uma transição que o reducer trata
   *  desde a Tarefa 1. */
  onCancel: () => void
}

export function ProcessingView({ stage, progress, onCancel }: ProcessingViewProps) {
  const label = processingStage[stage]
  /* Sem fração conhecida na preparação do modelo (Tarefa 7, decisão 5) — a
     barra fica indeterminada em vez de mostrar 0% parado, que pareceria que a
     app está pendurada. */
  const indeterminate = stage === 'preparing-model'

  return (
    <div className={styles.container}>
      <Spinner size="lg" />
      <p className={styles.stage} aria-live="polite">
        {label}
      </p>
      <Progress
        value={indeterminate ? undefined : progress}
        label={processing.progressLabel}
        className={styles.progress}
      />
      <Button variant="secondary" onClick={onCancel}>
        {processing.cancel}
      </Button>
    </div>
  )
}
