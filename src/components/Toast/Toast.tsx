import { Toast as RadixToast } from 'radix-ui'
import { Button } from '@/components/Button'
import { IconButton } from '@/components/IconButton'
import { CloseIcon } from '@/components/icons'
import styles from './Toast.module.css'
import type { ToastProps } from './Toast.types'

/**
 * Toast controlado — ver Tarefa 3, decisão 2 e `ToastProvider`.
 *
 * Cada instância é independente e controlada pelo chamador (`open`/
 * `onOpenChange`); não há fila nem gestor global — com dois ou três avisos
 * possíveis em simultâneo (instalação, atualização), cada `useState` local no
 * `App.tsx` chega perfeitamente e uma fila seria estrutura a mais.
 */
export function Toast({ open, onOpenChange, title, description, action }: ToastProps) {
  return (
    <RadixToast.Root className={styles.root} open={open} onOpenChange={onOpenChange}>
      <div className={styles.content}>
        <RadixToast.Title className={styles.title}>{title}</RadixToast.Title>
        {description && (
          <RadixToast.Description className={styles.description}>
            {description}
          </RadixToast.Description>
        )}
      </div>
      <div className={styles.actions}>
        {action && (
          <RadixToast.Action asChild altText={action.altText ?? action.label}>
            <Button variant="primary" onClick={action.onClick}>
              {action.label}
            </Button>
          </RadixToast.Action>
        )}
        <RadixToast.Close asChild>
          <IconButton icon={<CloseIcon />} label="Fechar" variant="ghost" size="sm" />
        </RadixToast.Close>
      </div>
    </RadixToast.Root>
  )
}
