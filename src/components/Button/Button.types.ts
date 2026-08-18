import type { ButtonHTMLAttributes } from 'react'

export type ButtonVariant = 'primary' | 'secondary' | 'danger'
export type ButtonShape = 'default' | 'circle'
export type ButtonSize = 'md' | 'lg'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  /** `circle` + `lg` é o botão de gravar (Tarefa 3, decisão 4) — não existe
   *  um componente próprio para ele, compõe-se a partir daqui. */
  shape?: ButtonShape
  size?: ButtonSize
}
