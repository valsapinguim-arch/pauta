/**
 * Junta nomes de classe condicionalmente. Não é `class-variance-authority`
 * nem `clsx` — com sete componentes de duas ou três variantes cada, uma
 * dependência para isto seria mais opinião do que valor (Tarefa 3, decisão 1).
 */
export function cx(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(' ')
}
