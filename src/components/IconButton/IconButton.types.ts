import type { ButtonHTMLAttributes, ReactNode } from 'react'

export type IconButtonVariant = 'default' | 'ghost'
export type IconButtonSize = 'sm' | 'md'

export interface IconButtonProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'aria-label'
> {
  icon: ReactNode
  /** Obrigatório: um botão só com ícone não tem nome acessível sem isto. */
  label: string
  variant?: IconButtonVariant
  size?: IconButtonSize
}
