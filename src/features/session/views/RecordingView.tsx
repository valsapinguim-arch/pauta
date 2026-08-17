import { Button, IconButton, Progress } from '@/components'
import { CloseIcon, StopIcon } from '@/components/icons'
import { cx } from '@/components/cx'
import { WARNING_THRESHOLD_MS } from '@/features/capture'
import { formatElapsed } from '@/features/session/formatElapsed'
import { recording } from '@/strings'
import styles from './RecordingView.module.css'

export interface RecordingViewProps {
  /** Vem de `state.level`/`state.elapsedMs` (Tarefa 1), alimentado com RMS
   *  real do microfone desde a Tarefa 4 (`useMicrophone`, via
   *  `useRecordingFlow`). */
  level: number
  elapsedMs: number
  onStop: () => void
  onCancel: () => void
}

export function RecordingView({ level, elapsedMs, onStop, onCancel }: RecordingViewProps) {
  /* Ver Tarefa 4, decisão 3: aviso visual perto do limite de 60 s. O corte
     automático em si acontece em `useMicrophone`, não aqui — isto é só o
     "estás quase lá", não o limite. */
  const nearLimit = elapsedMs >= WARNING_THRESHOLD_MS

  return (
    <div className={styles.container}>
      <IconButton
        icon={<CloseIcon />}
        label={recording.cancel}
        variant="ghost"
        className={styles.cancel}
        onClick={onCancel}
      />

      <div className={styles.primary}>
        <Button variant="danger" shape="circle" size="lg" onClick={onStop}>
          <StopIcon aria-hidden />
          {recording.stop}
        </Button>
        <p className={cx(styles.elapsed, nearLimit && styles.elapsedWarning)} aria-live="off">
          {formatElapsed(elapsedMs)}
        </p>
      </div>

      <Progress value={level} label={recording.levelLabel} className={styles.level} />
    </div>
  )
}
