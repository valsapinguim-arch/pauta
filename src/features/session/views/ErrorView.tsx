import { Alert, Button } from '@/components'
import { genericError, genericRestart, getErrorMessage } from '@/strings'
import styles from './ErrorView.module.css'

export interface ErrorViewProps {
  code: string
  recoverable: boolean
  /** Já real: `session.reset()` volta a `idle`. Independentemente do texto do
   *  botão, a ação é sempre "voltar ao início" — nunca se tenta adivinhar uma
   *  recuperação mais específica (ex.: repetir automaticamente a gravação)
   *  aqui. */
  onRestart: () => void
}

/**
 * Erros de captura (Tarefa 4, decisão 9) e de importação (Tarefa 5, decisão
 * 5) mostram a sua mensagem própria — `getErrorMessage(code)`. Um código
 * desconhecido (de uma tarefa futura que ainda não tenha entrado no
 * catálogo, ou de antes de existir catálogo completo, Tarefa 21) cai no
 * genérico de `@/strings`; mostrar `code` cru seria expor um detalhe
 * técnico.
 */
export function ErrorView({ code, recoverable, onRestart }: ErrorViewProps) {
  const known = getErrorMessage(code)
  const message = known ?? genericError
  const actionLabel = known ? known.action : recoverable ? genericError.action : genericRestart

  return (
    <div className={styles.container}>
      <Alert tone="error" title={message.title}>
        {message.body}
      </Alert>
      <Button variant="primary" onClick={onRestart}>
        {actionLabel}
      </Button>
    </div>
  )
}
