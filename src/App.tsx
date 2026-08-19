import { useEffect, useState } from 'react'
import { IconButton, Toast } from '@/components'
import { LibraryIcon } from '@/components/icons'
import { useFilePicker, useRecordingFlow } from '@/features/capture'
import type { FilePickerApi, RecordingFlowApi } from '@/features/capture'
import { LibraryView, useLibraryAutosave } from '@/features/library'
import { useAppUpdate, useInstallPrompt } from '@/features/pwa'
import {
  ErrorView,
  IdleView,
  ProcessingView,
  RecordingView,
  ResultView,
  useSession,
} from '@/features/session'
import type { SessionApi, SessionState } from '@/features/session'
import { usePreprocessAudio, useTranscriber } from '@/features/transcribe'
import type { PreprocessAudioApi, TranscriberApi } from '@/features/transcribe'
import { applyManualKey } from '@/lib/key/applyManualKey'
import { applyTitle } from '@/lib/notation/applyTitle'
import { applyManualBpm } from '@/lib/tempo/applyManualBpm'
import type { ScoreDocument } from '@/lib/types'
import { app, install, library, update } from '@/strings'
import styles from './App.module.css'

/** Só usada aqui — se um segundo sítio precisar dela, aí sim justifica-se
 *  mover para um sítio partilhado. TypeScript falha a compilar se um `case`
 *  ficar por tratar no switch abaixo (decisão 7 da Tarefa 3, aplicada). */
function assertNever(value: never): never {
  throw new Error(`Estado de sessão não tratado: ${JSON.stringify(value)}`)
}

export function App() {
  const session = useSession()
  const { state } = session
  const transcriber = useTranscriber(session)
  const preprocess = usePreprocessAudio(session, transcriber.transcribe)
  const recording = useRecordingFlow(session, preprocess.run)
  const filePicker = useFilePicker(session, preprocess.run)

  const { canInstall, promptInstall, isIosManualInstall } = useInstallPrompt(state.status)
  const { showUpdatePrompt, offlineReady, dismissOfflineReady, updateNow } = useAppUpdate(
    state.status,
  )
  const [installDismissed, setInstallDismissed] = useState(false)
  const [updateDismissed, setUpdateDismissed] = useState(false)

  const autosave = useLibraryAutosave(session)
  const [showLibrary, setShowLibrary] = useState(false)

  /* Decisão 11 (Tarefa 16): sem router, mas o botão "voltar" físico/gesto de
     Android tem de fechar a biblioteca em vez de sair da app. Empurra uma
     entrada de histórico ao abrir; o "voltar" do sistema dispara
     `popstate`, que fecha a biblioteca — o mesmo caminho serve o botão de
     fechar desta view (`closeLibrary`, abaixo), que consome essa entrada em
     vez de a deixar pendurada. Não testado num dispositivo Android real
     neste ambiente (ver `AGENTS.md`, Biblioteca local). */
  useEffect(() => {
    if (!showLibrary) return
    window.history.pushState({ pautaLibrary: true }, '')
    const handlePopState = () => setShowLibrary(false)
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [showLibrary])

  function closeLibrary(): void {
    if (window.history.state?.pautaLibrary) {
      window.history.back()
    } else {
      setShowLibrary(false)
    }
  }

  function openFromLibrary(id: string, document: ScoreDocument): void {
    autosave.associate(id, document)
    session.openDocument(document)
    closeLibrary()
  }

  return (
    <main className={styles.main}>
      <header className={styles.header}>
        <h1 className={styles.name}>{app.name}</h1>
        <p className={styles.tagline}>{app.tagline}</p>
        {(state.status === 'idle' || state.status === 'result' || state.status === 'error') && (
          <IconButton
            icon={<LibraryIcon />}
            label={library.openButton}
            variant="ghost"
            className={styles.libraryButton}
            onClick={() => setShowLibrary(true)}
          />
        )}
      </header>

      <div className={styles.stage}>
        {showLibrary ? (
          <LibraryView onClose={closeLibrary} onOpen={openFromLibrary} />
        ) : (
          renderStage(state, session, recording, filePicker, preprocess, transcriber)
        )}
      </div>

      <Toast
        open={autosave.saveError}
        onOpenChange={(open) => {
          if (!open) autosave.dismissSaveError()
        }}
        title={library.saveErrorTitle}
        description={library.saveErrorBody}
      />

      <Toast
        open={autosave.quotaWarning}
        onOpenChange={(open) => {
          if (!open) autosave.dismissQuotaWarning()
        }}
        title={library.quotaWarningTitle}
        description={library.quotaWarningBody}
      />

      <Toast
        open={(canInstall || isIosManualInstall) && !installDismissed}
        onOpenChange={(open) => {
          if (!open) setInstallDismissed(true)
        }}
        title={install.message}
        description={isIosManualInstall ? install.iosMessage : undefined}
        action={
          canInstall ? { label: install.action, onClick: () => void promptInstall() } : undefined
        }
      />

      <Toast
        open={showUpdatePrompt && !updateDismissed}
        onOpenChange={(open) => {
          if (!open) setUpdateDismissed(true)
        }}
        title={update.message}
        action={{ label: update.action, onClick: updateNow }}
      />

      <Toast
        open={offlineReady}
        onOpenChange={(open) => {
          if (!open) dismissOfflineReady()
        }}
        title={update.offlineReadyMessage}
      />
    </main>
  )
}

/**
 * Switch exaustivo sobre `state.status` — ver Tarefa 3, decisão 7. Cada
 * estado tem exatamente uma view; nunca duas ao mesmo tempo, nunca uma view a
 * decidir sozinha o que mostrar a partir de flags de outro estado.
 */
function renderStage(
  state: SessionState,
  session: SessionApi,
  recording: RecordingFlowApi,
  filePicker: FilePickerApi,
  preprocess: PreprocessAudioApi,
  transcriber: TranscriberApi,
) {
  switch (state.status) {
    case 'idle':
      return (
        <IdleView
          onStartRecording={recording.requestStart}
          needsPermissionExplainer={recording.needsPermissionExplainer}
          onConfirmPermissionExplainer={recording.confirmPermissionExplainer}
          onPickFile={filePicker.pickFile}
          fileInputRef={filePicker.fileInputRef}
          onFileInputChange={filePicker.handleFileInputChange}
          onFileDrop={filePicker.handleDrop}
          decodingFile={filePicker.decoding}
          pendingTruncation={
            filePicker.pendingTruncation && {
              originalDurationMs: filePicker.pendingTruncation.originalDurationMs,
              onConfirm: filePicker.pendingTruncation.confirm,
              onCancel: filePicker.pendingTruncation.cancel,
            }
          }
        />
      )

    case 'recording':
      return (
        <RecordingView
          level={state.level}
          elapsedMs={state.elapsedMs}
          onStop={recording.stop}
          onCancel={recording.cancel}
        />
      )

    case 'processing':
      return (
        <ProcessingView
          stage={state.stage}
          progress={state.progress}
          onCancel={() => {
            // Termina os dois workers do pipeline antes de tocar na sessão
            // — uma só vez, nunca duas (cada `cancel()` destes já não mexe
            // em `session`, ver Tarefas 6 e 7).
            preprocess.cancel()
            transcriber.cancel()
            session.cancel()
          }}
        />
      )

    case 'result':
      return (
        <ResultView
          document={state.document}
          onNewTranscription={session.reset}
          onBpmChange={(bpm) => session.replaceDocument(applyManualBpm(state.document, bpm))}
          onKeyChange={(tonic, mode) =>
            session.replaceDocument(applyManualKey(state.document, tonic, mode))
          }
          onTitleChange={(title) => session.replaceDocument(applyTitle(state.document, title))}
        />
      )

    case 'error':
      return (
        <ErrorView code={state.code} recoverable={state.recoverable} onRestart={session.reset} />
      )

    default:
      return assertNever(state)
  }
}
