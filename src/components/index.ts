/**
 * Barrel dos componentes de interface.
 *
 * Inventário fechado de oito (Tarefa 3, decisão 2, alargado na Tarefa 12):
 * `Button`, `IconButton`, `Sheet`, `Progress`, `Alert`, `Spinner`, `Toast`,
 * `Input`. Acrescentar aqui exige justificação escrita na tarefa que o
 * introduz — `Input` entrou na Tarefa 12 para a edição do título (texto
 * livre, não enumerável como o BPM ou a tonalidade).
 *
 * `icons/` e `cx` não são desse inventário — são suporte (glifos e um
 * utilitário de classes), não primitivas de interação com opinião de design
 * própria a manter.
 */
export { AppErrorBoundary } from './AppErrorBoundary'
export { Alert } from './Alert'
export type { AlertProps, AlertTone } from './Alert'
export { Button } from './Button'
export type { ButtonProps, ButtonShape, ButtonSize, ButtonVariant } from './Button'
export { IconButton } from './IconButton'
export type { IconButtonProps, IconButtonSize, IconButtonVariant } from './IconButton'
export { Input } from './Input'
export type { InputProps } from './Input'
export { Progress } from './Progress'
export type { ProgressProps } from './Progress'
export { Sheet } from './Sheet'
export type { SheetPadding, SheetProps } from './Sheet'
export { Spinner } from './Spinner'
export type { SpinnerProps, SpinnerSize } from './Spinner'
export { Toast, ToastProvider } from './Toast'
export type { ToastAction, ToastProps } from './Toast'
