import { useAppUpdate, useInstallPrompt } from '@/features/pwa'
import { useSession } from '@/features/session'
import { app, idle, install, update } from '@/strings'
import styles from './App.module.css'

/**
 * Ecrã principal.
 *
 * Nesta tarefa mostra apenas o estado `idle` com placeholders. A Tarefa 3
 * substitui isto pelas cinco views (`IdleView`, `RecordingView`,
 * `ProcessingView`, `ResultView`, `ErrorView`), escolhidas por `switch`
 * exaustivo sobre `state.status` — ver Tarefa 3, decisão 7.
 *
 * O `useSession` já está ligado de propósito: garante que a máquina de estados
 * é o ponto de partida da interface, e não algo que se enxerta depois por cima
 * de booleanos.
 */
export function App() {
  const { state } = useSession()

  /* Os dois hooks recebem o estado da sessão porque o convite de instalação e
     o aviso de atualização nunca podem aparecer a meio de gravar ou de
     processar — ver Tarefa 2, decisão 5 e Âmbito técnico. */
  const { canInstall, promptInstall, isIosManualInstall } = useInstallPrompt(state.status)
  const { showUpdatePrompt, offlineReady, dismissOfflineReady, updateNow } = useAppUpdate(
    state.status,
  )

  return (
    <main className={styles.main}>
      <header className={styles.header}>
        <h1 className={styles.name}>{app.name}</h1>
        <p className={styles.tagline}>{app.tagline}</p>
      </header>

      {/* TODO Tarefa 3: substituir por IdleView / RecordingView / ProcessingView /
          ResultView / ErrorView, com switch exaustivo sobre state.status. */}
      <div className={styles.stage}>
        {/* TODO Tarefa 4: onStartRecording */}
        <button type="button" className={styles.record} disabled aria-describedby="record-hint">
          {idle.recordButton}
        </button>
        <p id="record-hint" className={styles.hint}>
          {idle.recordButtonHint}
        </p>

        {/* TODO Tarefa 5: onPickFile + zona de drop */}
        <button type="button" className={styles.secondary} disabled>
          {idle.pickFile}
        </button>
      </div>

      {/* Não remover nem esconder — ver Tarefa 3, decisão 6. */}
      <p className={styles.limitation}>{idle.limitationNotice}</p>

      {/* TODO Tarefa 3: substituir por Toast/Alert do inventário fechado de
          componentes — isto é o mínimo funcional para verificar o fluxo. */}
      {canInstall && (
        <div className={styles.banner} role="status">
          <p>{install.message}</p>
          <button type="button" className={styles.secondary} onClick={() => void promptInstall()}>
            {install.action}
          </button>
        </div>
      )}

      {!canInstall && isIosManualInstall && (
        <div className={styles.banner} role="status">
          <p>{install.iosMessage}</p>
        </div>
      )}

      {showUpdatePrompt && (
        <div className={styles.banner} role="status">
          <p>{update.message}</p>
          <button type="button" className={styles.secondary} onClick={updateNow}>
            {update.action}
          </button>
        </div>
      )}

      {offlineReady && (
        <div className={styles.banner} role="status">
          <p>{update.offlineReadyMessage}</p>
          <button type="button" className={styles.secondary} onClick={dismissOfflineReady}>
            {update.dismiss}
          </button>
        </div>
      )}

      <p className={styles.debug}>estado: {state.status}</p>
    </main>
  )
}
