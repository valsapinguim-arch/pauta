import type { HTMLAttributes } from 'react'

export type SheetPadding = 'sm' | 'md' | 'lg'

export interface SheetProps extends HTMLAttributes<HTMLDivElement> {
  padding?: SheetPadding
  /** Sombra além do contorno — usar com moderação, é o destaque visual do
   *  ecrã (ex.: a área da pauta em `ResultView`). */
  elevated?: boolean
}
