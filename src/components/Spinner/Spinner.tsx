import { cx } from '@/components/cx'
import styles from './Spinner.module.css'
import type { SpinnerProps } from './Spinner.types'

/**
 * Indicador de atividade — ver Tarefa 3, decisão 2.
 *
 * Decorativo (`aria-hidden`): quem o usa fornece o texto que descreve o que
 * está a acontecer (ex.: "A transcrever…" em `ProcessingView`) — anunciar os
 * dois duplicaria a informação para quem usa leitor de ecrã.
 *
 * A rotação para de propósito sob `prefers-reduced-motion` — já tratado
 * globalmente em `src/styles/global.css` (Tarefa 1), nada a fazer aqui.
 */
export function Spinner({ size = 'md', className }: SpinnerProps) {
  return <span aria-hidden className={cx(styles.spinner, styles[size], className)} />
}
