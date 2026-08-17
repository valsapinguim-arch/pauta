import { useState } from 'react'
import { Alert, Button, Sheet } from '@/components'
import { MicIcon } from '@/components/icons'
import { idle } from '@/strings'
import styles from './IdleView.module.css'

export interface IdleViewProps {
  /** Sem isto, o botão fica visualmente desativado. */
  onStartRecording?: () => void
  /** Ver Tarefa 4, decisão 6. `false` por omissão: sem `onConfirmPermissionExplainer`
   *  ligado (ex.: numa view isolada em teste), não há explicação nenhuma para mostrar. */
  needsPermissionExplainer?: boolean
  onConfirmPermissionExplainer?: () => void
  /** TODO Tarefa 5: abrir o seletor de ficheiro / zona de drop. */
  onPickFile?: () => void
}

/**
 * Ecrã de repouso — ver Tarefa 3, decisão 4: o botão de gravar é o único
 * elemento visualmente primário. Tudo o resto é secundário.
 *
 * A explicação de permissão (Tarefa 4, decisão 6) é um passo local a este
 * ecrã, não um estado novo da sessão — nunca chegou a existir uma gravação,
 * por isso não faz sentido a máquina de estados saber disto.
 */
export function IdleView({
  onStartRecording,
  needsPermissionExplainer = false,
  onConfirmPermissionExplainer,
  onPickFile,
}: IdleViewProps) {
  const [showExplainer, setShowExplainer] = useState(false)

  function handleRecordClick(): void {
    if (needsPermissionExplainer) {
      setShowExplainer(true)
    } else {
      onStartRecording?.()
    }
  }

  function handleConfirmExplainer(): void {
    setShowExplainer(false)
    onConfirmPermissionExplainer?.()
  }

  if (showExplainer) {
    return (
      <div className={styles.container}>
        <Sheet elevated padding="lg" className={styles.explainer}>
          <h2 className={styles.explainerTitle}>{idle.micExplainerTitle}</h2>
          <p className={styles.explainerBody}>{idle.micExplainerBody}</p>
          <div className={styles.explainerActions}>
            <Button variant="secondary" onClick={() => setShowExplainer(false)}>
              {idle.micExplainerCancel}
            </Button>
            <Button variant="primary" onClick={handleConfirmExplainer}>
              {idle.micExplainerConfirm}
            </Button>
          </div>
        </Sheet>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <div className={styles.primary}>
        <Button
          variant="primary"
          shape="circle"
          size="lg"
          disabled={!onStartRecording}
          onClick={handleRecordClick}
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
