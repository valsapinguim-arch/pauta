import { Alert, Button } from '@/components'
import { errors } from '@/strings'
import styles from './ErrorView.module.css'

export interface ErrorViewProps {
  recoverable: boolean
  /** Já real: `session.reset()` volta a `idle`. Sem catálogo de erros
   *  (Tarefa 21), "recomeçar" é a única ação seguramente correta para
   *  qualquer código de erro — nunca se tenta adivinhar uma recuperação mais
   *  específica aqui. */
  onRestart: () => void
}

/**
 * Mensagem genérica de propósito — ver `@/strings`, `errors.viewTitle`. Sem
 * catálogo ainda (Tarefa 21), mostrar o código cru ao utilizador seria expor
 * um detalhe técnico; fica de fora até essa tarefa.
 */
export function ErrorView({ recoverable, onRestart }: ErrorViewProps) {
  return (
    <div className={styles.container}>
      <Alert tone="error" title={errors.viewTitle}>
        {errors.viewBody}
      </Alert>
      <Button variant="primary" onClick={onRestart}>
        {recoverable ? errors.retry : errors.restart}
      </Button>
    </div>
  )
}
