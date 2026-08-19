import type { InputHTMLAttributes } from 'react'

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  /** Rótulo acessível — obrigatório, mesma regra do `IconButton` (Tarefa 3):
   *  um campo sem rótulo visível associado precisa de um nome acessível. */
  label: string
}
