import { forwardRef } from 'react'
import { cx } from '@/components/cx'
import styles from './Input.module.css'
import type { InputProps } from './Input.types'

/**
 * Campo de texto de uma linha — oitavo componente do inventário (Tarefa 3,
 * decisão 2, fechado em sete até aqui). Justificação (Tarefa 12): a edição
 * do título da transcrição é texto livre — ao contrário do BPM (Tarefa 9) e
 * da tonalidade (Tarefa 11), que se resolvem com um par de `IconButton`
 * porque o espaço de valores é enumerável, um título não tem enumeração
 * nenhuma possível. Ver `AGENTS.md`.
 *
 * `type="text"` por omissão: os únicos campos previstos no plano (título
 * aqui; nenhum outro texto livre até à Tarefa 22) são texto simples.
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, className, type = 'text', ...props },
  ref,
) {
  return (
    <input
      ref={ref}
      type={type}
      aria-label={label}
      className={cx(styles.input, className)}
      {...props}
    />
  )
})
