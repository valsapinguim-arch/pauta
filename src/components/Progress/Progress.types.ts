export interface ProgressProps {
  /** Fração concluída, [0, 1]. Omitir para indeterminado (ex.: a preparar o
   *  modelo pela primeira vez, Tarefa 7 — ainda sem fração conhecida).
   *  `| undefined` explícito: com `exactOptionalPropertyTypes`, quem chama
   *  passa muitas vezes `value={condição ? x : undefined}` em vez de omitir
   *  a prop — e isso é um valor diferente de a prop nem existir. */
  value?: number | undefined
  /** Rótulo acessível — o que está a acontecer, não a percentagem. */
  label: string
  className?: string | undefined
}
