import { forwardRef } from 'react'
import { cx } from '@/components/cx'
import styles from './List.module.css'
import type { ListItemProps, ListProps } from './List.types'

/**
 * Nono componente do inventário (Tarefa 3, decisão 2, fechado em oito até
 * aqui). Justificação (Tarefa 16): a biblioteca local é a primeira lista de
 * itens repetidos e selecionáveis do plano — a lista de formatos de
 * exportação (Tarefa 15) usa `Button` porque são quatro ações fixas, não
 * uma coleção de tamanho variável com uma linha por registo guardado. Sem
 * `List`, `LibraryView` teria de reinventar semântica de lista e
 * espaçamento entre itens à mão. Ver `AGENTS.md`.
 *
 * `<ul>`/`<li>` semânticos — nenhuma acessibilidade não trivial a resolver
 * (nenhum Radix, mesma regra do resto do inventário).
 */
export const List = forwardRef<HTMLUListElement, ListProps>(function List(
  { className, ...props },
  ref,
) {
  return <ul ref={ref} className={cx(styles.list, className)} {...props} />
})

export const ListItem = forwardRef<HTMLLIElement, ListItemProps>(function ListItem(
  { className, ...props },
  ref,
) {
  return <li ref={ref} className={cx(styles.item, className)} {...props} />
})
