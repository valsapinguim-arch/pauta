import { forwardRef } from 'react'
import { cx } from '@/components/cx'
import styles from './Button.module.css'
import type { ButtonProps } from './Button.types'

/**
 * Botão de texto — ver Tarefa 3, decisão 2.
 *
 * `type="button"` por omissão: um botão dentro de um `<form>` que devia
 * apenas acionar algo (ex.: "Gravar") não deve submeter nada por acidente.
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', shape = 'default', size = 'md', className, type = 'button', ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cx(
        styles.button,
        styles[variant],
        shape === 'circle' && styles.circle,
        styles[size],
        className,
      )}
      {...props}
    />
  )
})
