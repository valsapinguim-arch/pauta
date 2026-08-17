import { forwardRef } from 'react'
import { cx } from '@/components/cx'
import styles from './Sheet.module.css'
import type { SheetProps } from './Sheet.types'

/**
 * Contentor de conteúdo genérico — ver Tarefa 3, decisão 2. Sem semântica
 * própria (é um `<div>`); Radix não entra aqui porque não há acessibilidade
 * não trivial nenhuma a resolver (decisão 3).
 */
export const Sheet = forwardRef<HTMLDivElement, SheetProps>(function Sheet(
  { padding = 'md', elevated = false, className, ...props },
  ref,
) {
  return (
    <div
      ref={ref}
      className={cx(styles.sheet, styles[padding], elevated && styles.elevated, className)}
      {...props}
    />
  )
})
