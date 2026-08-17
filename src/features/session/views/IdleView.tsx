import { useState, type ChangeEvent, type DragEvent, type RefObject } from 'react'
import { Alert, Button, Sheet, Spinner } from '@/components'
import { cx } from '@/components/cx'
import { MicIcon } from '@/components/icons'
import { formatElapsed } from '@/features/session/formatElapsed'
import { idle } from '@/strings'
import styles from './IdleView.module.css'

/** Ver Tarefa 5, decisão 4. Definido aqui (não importado de
 *  `@/features/capture`) para a view não precisar de conhecer o tipo exato
 *  de `useFilePicker` — só a forma de que precisa. */
export interface PendingFileTruncation {
  originalDurationMs: number
  onConfirm: () => void
  onCancel: () => void
}

export interface IdleViewProps {
  /** Sem isto, o botão fica visualmente desativado. */
  onStartRecording?: () => void
  /** Ver Tarefa 4, decisão 6. `false` por omissão: sem `onConfirmPermissionExplainer`
   *  ligado (ex.: numa view isolada em teste), não há explicação nenhuma para mostrar. */
  needsPermissionExplainer?: boolean
  onConfirmPermissionExplainer?: () => void
  /** Aciona o `<input>` escondido abaixo — ver Tarefa 5, Âmbito técnico. */
  onPickFile?: () => void
  fileInputRef?: RefObject<HTMLInputElement | null>
  onFileInputChange?: (event: ChangeEvent<HTMLInputElement>) => void
  /** Zona de _drop_ — Tarefa 5, decisão 6. */
  onFileDrop?: (event: DragEvent<HTMLDivElement>) => void
  /** `true` enquanto `decodeAudioData` está a correr (Tarefa 5, decisão 2). */
  decodingFile?: boolean
  /** Não nulo quando o ficheiro excede os 60 s e se espera confirmação para
   *  continuar só com o início (Tarefa 5, decisão 4). */
  pendingTruncation?: PendingFileTruncation | null
}

/**
 * Ecrã de repouso — ver Tarefa 3, decisão 4: o botão de gravar é o único
 * elemento visualmente primário. Tudo o resto é secundário.
 *
 * A explicação de permissão (Tarefa 4, decisão 6) e a oferta de truncagem
 * (Tarefa 5, decisão 4) são passos locais a este ecrã, não estados novos da
 * sessão — nenhuma das duas envolve uma gravação ou um processamento em
 * curso, por isso não fazem sentido na máquina de estados.
 */
export function IdleView({
  onStartRecording,
  needsPermissionExplainer = false,
  onConfirmPermissionExplainer,
  onPickFile,
  fileInputRef,
  onFileInputChange,
  onFileDrop,
  decodingFile = false,
  pendingTruncation = null,
}: IdleViewProps) {
  const [showExplainer, setShowExplainer] = useState(false)
  const [isDraggingOver, setIsDraggingOver] = useState(false)

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

  function handleDragOver(event: DragEvent<HTMLDivElement>): void {
    // O browser recusa o drop sem isto — comportamento por omissão.
    event.preventDefault()
  }

  function handleDragEnter(event: DragEvent<HTMLDivElement>): void {
    event.preventDefault()
    setIsDraggingOver(true)
  }

  function handleDragLeave(): void {
    setIsDraggingOver(false)
  }

  function handleDrop(event: DragEvent<HTMLDivElement>): void {
    event.preventDefault()
    setIsDraggingOver(false)
    onFileDrop?.(event)
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

  if (pendingTruncation) {
    return (
      <div className={styles.container}>
        <Sheet elevated padding="lg" className={styles.explainer}>
          <h2 className={styles.explainerTitle}>{idle.truncateTitle}</h2>
          <p className={styles.explainerBody}>{idle.truncateBody}</p>
          <p className={styles.explainerDuration}>
            {formatElapsed(pendingTruncation.originalDurationMs)}
          </p>
          <div className={styles.explainerActions}>
            <Button variant="secondary" onClick={pendingTruncation.onCancel}>
              {idle.truncateCancel}
            </Button>
            <Button variant="primary" onClick={pendingTruncation.onConfirm}>
              {idle.truncateConfirm}
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
          disabled={!onStartRecording || decodingFile}
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

      <Button variant="secondary" disabled={!onPickFile || decodingFile} onClick={onPickFile}>
        {idle.pickFile}
      </Button>
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*"
        className={styles.hiddenInput}
        onChange={onFileInputChange}
      />

      {/* Tarefa 5, decisão 6: só existe onde há um dispositivo apontador
          fino — escondida por CSS (@media (pointer: fine)), nunca por JS. O
          botão acima cobre telefone e desktop; isto acrescenta-se só onde o
          gesto de arrastar existe. */}
      <div
        className={cx(styles.dropZone, isDraggingOver && styles.dropZoneActive)}
        onDragOver={handleDragOver}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {idle.dropHint}
      </div>

      {decodingFile && (
        <div className={styles.decoding} role="status">
          <Spinner size="sm" />
          <span>{idle.decodingFile}</span>
        </div>
      )}

      {/* Não remover, não esconder atrás de ajuda, não adiar para depois do
          resultado — ver Tarefa 3, decisão 6. */}
      <Alert tone="info" className={styles.limitation}>
        {idle.limitationNotice}
      </Alert>
    </div>
  )
}
