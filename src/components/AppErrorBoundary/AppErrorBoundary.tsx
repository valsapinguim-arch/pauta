import { Component, type ErrorInfo, type ReactNode } from 'react'
import { logError } from '@/features/diagnostics/errorLog'
import { count as countLibraryEntries } from '@/features/library/repository'
import { crash } from '@/strings'
import styles from './AppErrorBoundary.module.css'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  /** `null` enquanto a contagem da biblioteca ainda não voltou — nesse
   *  intervalo curto não se afirma nada sobre trabalho guardado (decisão
   *  10), só depois de saber a resposta. */
  hasSavedWork: boolean | null
}

/**
 * Rede de segurança contra o ecrã branco — ver Tarefa 1, decisão 7,
 * refinada pela Tarefa 21, decisão 10.
 *
 * Um erro não capturado numa app cliente dá página em branco, sem pista
 * nenhuma. Como esta app faz trabalho pesado e assíncrono em workers, é uma
 * questão de quando e não de se.
 *
 * Continua a ter de ser uma classe: não há equivalente em hooks para
 * `componentDidCatch`.
 */
export class AppErrorBoundary extends Component<Props, State> {
  override state: State = { hasError: false, hasSavedWork: null }

  static getDerivedStateFromError(): Pick<State, 'hasError'> {
    return { hasError: true }
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    /* Detalhes técnicos nunca vão para a interface (Tarefa 21, decisão 3),
       mas também não se descartam — sem eles não há diagnóstico possível
       numa app sem servidor. `console.error` fica como rede adicional: se o
       próprio registo local falhar (ex.: IndexedDB indisponível), a consola
       ainda tem alguma coisa. */
    console.error('[pauta] erro não capturado', error, info.componentStack)
    void logError({
      code: 'app-crash',
      occurredAt: new Date().toISOString(),
      context: 'AppErrorBoundary',
      technicalDetails: `${error.stack ?? error.message}\n\n${info.componentStack ?? ''}`,
    })

    /* A gravação automática (Tarefa 16, decisão 5) já corre a seguir a cada
       transcrição bem-sucedida — se há pelo menos um registo na biblioteca,
       o trabalho mais recente do utilizador não desapareceu com este crash.
       Não é uma garantia perfeita (o crash podia ter acontecido ANTES da
       gravação automática), mas é o sinal honesto que dá para mostrar sem
       inventar mais estado. */
    countLibraryEntries()
      .then((count) => this.setState({ hasSavedWork: count > 0 }))
      .catch(() => this.setState({ hasSavedWork: false }))
  }

  private readonly handleReload = (): void => {
    window.location.reload()
  }

  override render(): ReactNode {
    if (!this.state.hasError) {
      return this.props.children
    }

    return (
      <div className={styles.container} role="alert">
        <h1 className={styles.title}>{crash.title}</h1>
        <p className={styles.body}>{crash.body}</p>
        {this.state.hasSavedWork && <p className={styles.body}>{crash.savedNotice}</p>}
        <button type="button" className={styles.button} onClick={this.handleReload}>
          {crash.reload}
        </button>
      </div>
    )
  }
}
