import type { ReactNode } from 'react'
import { Toast as RadixToast } from 'radix-ui'
import styles from './Toast.module.css'

/**
 * Monta-se uma única vez, na raiz da app (`main.tsx`) — é o `Provider` +
 * `Viewport` do Radix Toast, que qualquer `<Toast>` (mesmo módulo) usa para se
 * portalizar. Ver Tarefa 3, decisão 3: Radix só entra aqui porque a gestão de
 * foco e a ordem de anúncio de um toast são fáceis de fazer mal.
 *
 * `duration={Infinity}`: os toasts desta app pedem uma decisão (instalar,
 * atualizar) — nenhum se justifica desaparecer sozinho ao fim de 5 segundos.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  return (
    <RadixToast.Provider label="Notificação" duration={Infinity} swipeDirection="down">
      {children}
      <RadixToast.Viewport className={styles.viewport} label="Notificações ({hotkey})" />
    </RadixToast.Provider>
  )
}
