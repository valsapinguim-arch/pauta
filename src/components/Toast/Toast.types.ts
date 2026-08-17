export interface ToastAction {
  label: string
  onClick: () => void
  /** Texto alternativo para quem navega direto ao botão por leitor de ecrã,
   *  sem ouvir o toast inteiro. Por omissão usa o próprio `label` — os textos
   *  aqui são sempre curtos e já autoexplicativos (ex.: "Atualizar"). */
  altText?: string
}

export interface ToastProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  /* `| undefined` explícito nestes dois: em App.tsx passam-se como
     `condição ? valor : undefined`, não omitidos — ver Progress.types.ts
     para a mesma nota sobre `exactOptionalPropertyTypes`. */
  description?: string | undefined
  action?: ToastAction | undefined
}
