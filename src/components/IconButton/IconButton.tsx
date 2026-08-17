import { forwardRef } from 'react'
import { cx } from '@/components/cx'
import styles from './IconButton.module.css'
import type { IconButtonProps } from './IconButton.types'

/**
 * Botão só com ícone — ver Tarefa 3, decisão 2.
 *
 * `size="sm"` reduz o ícone visualmente, nunca a área de toque: as duas
 * mantêm pelo menos `--touch-target-min` (Tarefa 18, decisão 9, já cumprida
 * de origem em vez de corrigida depois).
 */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { icon, label, variant = 'default', size = 'md', className, type = 'button', ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      className={cx(styles.button, styles[variant], styles[size], className)}
      {...props}
    >
      {icon}
    </button>
  )
})
