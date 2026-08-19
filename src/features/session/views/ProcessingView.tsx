import { Button, Progress, Spinner } from '@/components'
import type { ProcessingStage } from '@/features/session/session.types'
import { processing, processingStage } from '@/strings'
import styles from './ProcessingView.module.css'
import { useMilestoneAnnouncement } from './useMilestoneAnnouncement'

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
  const milestone = useMilestoneAnnouncement(stage, progress)

  return (
    <div className={styles.container}>
      <Spinner size="lg" />
      <p className={styles.stage} aria-live="polite">
        {label}
      </p>
      {/* Marcos de progresso (Tarefa 18, decisão 2) — região própria,
          separada do nome da etapa acima: muda só em 25/50/75/100%, nunca a
          cada atualização de `progress`. Sem equivalente visual próprio
          (a barra já é visível) — só para leitor de ecrã. */}
      <p className="sr-only" aria-live="polite">
        {milestone}
      </p>
      <Progress value={progress} label={processing.progressLabel} className={styles.progress} />
      <Button variant="secondary" onClick={onCancel}>
        {processing.cancel}
      </Button>
    </div>
  )
}
