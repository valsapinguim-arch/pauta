import { useSession } from '@/features/session'
import { app, idle } from '@/strings'
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

      <p className={styles.debug}>estado: {state.status}</p>
    </main>
  )
}
