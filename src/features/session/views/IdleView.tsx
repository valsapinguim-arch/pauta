import { Alert, Button } from '@/components'
import { MicIcon } from '@/components/icons'
import { idle } from '@/strings'
import styles from './IdleView.module.css'

export interface IdleViewProps {
  /** TODO Tarefa 4: pedir permissão de microfone e começar a gravar. Sem isto,
   *  o botão fica visualmente desativado — é o estado real da app hoje. */
  onStartRecording?: () => void
  /** TODO Tarefa 5: abrir o seletor de ficheiro / zona de drop. */
  onPickFile?: () => void
}

/**
 * Ecrã de repouso — ver Tarefa 3, decisão 4: o botão de gravar é o único
 * elemento visualmente primário. Tudo o resto é secundário.
 */
export function IdleView({ onStartRecording, onPickFile }: IdleViewProps) {
  return (
    <div className={styles.container}>
      <div className={styles.primary}>
        <Button
          variant="primary"
          shape="circle"
          size="lg"
          disabled={!onStartRecording}
          onClick={onStartRecording}
          aria-describedby="idle-record-hint"
        >
          <MicIcon aria-hidden />
          {idle.recordButton}
        </Button>
        <p id="idle-record-hint" className={styles.hint}>
          {idle.recordButtonHint}
        </p>
      </div>

      <Button variant="secondary" disabled={!onPickFile} onClick={onPickFile}>
        {idle.pickFile}
      </Button>

      {/* Não remover, não esconder atrás de ajuda, não adiar para depois do
          resultado — ver Tarefa 3, decisão 6. */}
      <Alert tone="info" className={styles.limitation}>
        {idle.limitationNotice}
      </Alert>
    </div>
  )
}
