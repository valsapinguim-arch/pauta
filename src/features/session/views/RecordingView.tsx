import { Button, IconButton, Progress } from '@/components'
import { CloseIcon, StopIcon } from '@/components/icons'
import { formatElapsed } from '@/features/session/formatElapsed'
import { recording } from '@/strings'
import styles from './RecordingView.module.css'

export interface RecordingViewProps {
  /** Vem de `state.level`/`state.elapsedMs` (Tarefa 1) — o valor já está
   *  ligado, só falta quem o alimente com RMS real do microfone (Tarefa 4). */
  level: number
  elapsedMs: number
  /** Já reais: parar e cancelar são transições que o reducer trata desde a
   *  Tarefa 1 — nada aqui espera pela Tarefa 4. */
  onStop: () => void
  onCancel: () => void
}

export function RecordingView({ level, elapsedMs, onStop, onCancel }: RecordingViewProps) {
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
        <p className={styles.elapsed} aria-live="off">
          {formatElapsed(elapsedMs)}
        </p>
      </div>

      <Progress value={level} label={recording.levelLabel} className={styles.level} />
    </div>
  )
}
