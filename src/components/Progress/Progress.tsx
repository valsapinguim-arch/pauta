import { cx } from '@/components/cx'
import styles from './Progress.module.css'
import type { ProgressProps } from './Progress.types'

/**
 * Barra de progresso — ver Tarefa 3, decisão 2.
 *
 * `<progress>` nativo, não uma `<div>` a fingir: já tem `role="progressbar"`
 * e o valor é anunciado por leitores de ecrã sem esforço nenhum. `accent-color`
 * é suficiente para o tematizar nos browsers atuais, sem reinventar a barra em
 * CSS — ver Tarefa 18 (não duplicar semântica nativa com ARIA por cima).
 */
export function Progress({ value, label, className }: ProgressProps) {
  const clamped = value === undefined ? undefined : Math.min(1, Math.max(0, value))

  return (
    <progress
      className={cx(styles.progress, className)}
      aria-label={label}
      value={clamped}
      max={clamped === undefined ? undefined : 1}
    />
  )
}
