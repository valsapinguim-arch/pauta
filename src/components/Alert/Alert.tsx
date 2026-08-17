import { cx } from '@/components/cx'
import { AlertTriangleIcon } from '@/components/icons'
import styles from './Alert.module.css'
import type { AlertProps } from './Alert.types'

/**
 * Mensagem inline estática — ver Tarefa 3, decisão 2.
 *
 * Sem Radix: só entra quando há um diálogo modal por cima (decisão 3), e este
 * não é um. `role` segue o tom: `error` interrompe o que o leitor de ecrã
 * estava a anunciar (é suposto interromper), `info` não.
 */
export function Alert({ tone, title, children, className, ...props }: AlertProps) {
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={cx(styles.alert, styles[tone], className)}
      {...props}
    >
      {tone === 'error' && <AlertTriangleIcon className={styles.icon} />}
      <div className={styles.body}>
        {title && <p className={styles.title}>{title}</p>}
        <div className={styles.content}>{children}</div>
      </div>
    </div>
  )
}
