import { Component, type ErrorInfo, type ReactNode } from 'react'
import { errors } from '@/strings'
import styles from './AppErrorBoundary.module.css'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
}

/**
 * Rede de segurança contra o ecrã branco — ver Tarefa 1, decisão 7.
 *
 * Um erro não capturado numa app cliente dá página em branco, sem pista
 * nenhuma. Como esta app faz trabalho pesado e assíncrono em workers, é uma
 * questão de quando e não de se.
 *
 * A Tarefa 21 refina isto: catálogo de erros, registo local, e a mensagem passa
 * a dizer que o resultado ficou guardado na biblioteca. Aqui garante-se apenas
 * que existe algo desde o primeiro dia.
 *
 * Continua a ter de ser uma classe: não há equivalente em hooks para
 * `componentDidCatch`.
 */
export class AppErrorBoundary extends Component<Props, State> {
  override state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    /* Detalhes técnicos nunca vão para a interface (regra da Tarefa 21), mas
       também não se descartam — sem eles não há diagnóstico possível numa app
       sem servidor. A Tarefa 21 substitui isto pelo registo local. */
    console.error('[pauta] erro não capturado', error, info.componentStack)
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
        <h1 className={styles.title}>{errors.unexpectedTitle}</h1>
        <p className={styles.body}>{errors.unexpectedBody}</p>
        <button type="button" className={styles.button} onClick={this.handleReload}>
          {errors.reload}
        </button>
      </div>
    )
  }
}
