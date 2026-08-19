import { useState } from 'react'
import { Toast } from '@/components'
import { useFilePicker, useRecordingFlow } from '@/features/capture'
import type { FilePickerApi, RecordingFlowApi } from '@/features/capture'
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
import { app, install, update } from '@/strings'
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

  return (
    <main className={styles.main}>
      <header className={styles.header}>
        <h1 className={styles.name}>{app.name}</h1>
        <p className={styles.tagline}>{app.tagline}</p>
      </header>

      <div className={styles.stage}>
        {renderStage(state, session, recording, filePicker, preprocess, transcriber)}
      </div>

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
