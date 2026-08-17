import type { HTMLAttributes, ReactNode } from 'react'

export type AlertTone = 'info' | 'error'

export interface AlertProps extends HTMLAttributes<HTMLDivElement> {
  tone: AlertTone
  /** `info` é para o aviso de limitação (Tarefa 3, decisão 6): discreto, não
   *  alarmante. `error` é para falhas reais (`ErrorView`) e precisa de se
   *  notar. Um `Alert` não decide isto sozinho — quem o usa escolhe o tom. */
  title?: string
  children: ReactNode
}
