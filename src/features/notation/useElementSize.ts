import { useCallback, useEffect, useRef, useState } from 'react'

/** Atraso do debounce (decisão 5 da Tarefa 13) — sem isto, arrastar a
 *  janela em desktop dispara dezenas de redesenhos por segundo. */
const RESIZE_DEBOUNCE_MS = 150

/**
 * Largura do contentor, observada com `ResizeObserver` e amortecida — Tarefa
 * 13, decisão 5. `ResizeObserver`, não o evento `resize` da `window`: o
 * contentor também muda de tamanho quando a interface à volta muda (avisos
 * a aparecer), sem a janela em si mudar.
 *
 * `ref` é uma callback ref (não um `useRef` lido em `.current`): guardar o
 * nó em estado é o que garante que o `useEffect` corre de novo quando o nó
 * monta — um `useRef` mutado fora do render não dispara isso.
 */
export function useElementSize<T extends HTMLElement>(): {
  ref: (node: T | null) => void
  width: number
} {
  const [element, setElement] = useState<T | null>(null)
  const [width, setWidth] = useState(0)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Largura inicial medida aqui, não num `useEffect` — isto corre na fase
  // de commit do próprio nó (não é "um efeito" para efeitos da regra do
  // ESLint sobre `setState` em efeitos) e dá um valor imediato, sem
  // esperar pela primeira notificação do `ResizeObserver` nem pelo atraso
  // do debounce abaixo.
  const ref = useCallback((node: T | null) => {
    setElement(node)
    if (node) setWidth(node.getBoundingClientRect().width)
  }, [])

  useEffect(() => {
    if (!element) return

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (!entry) return

      if (timeoutRef.current !== null) clearTimeout(timeoutRef.current)
      timeoutRef.current = setTimeout(() => {
        setWidth(entry.contentRect.width)
      }, RESIZE_DEBOUNCE_MS)
    })

    observer.observe(element)

    return () => {
      observer.disconnect()
      if (timeoutRef.current !== null) clearTimeout(timeoutRef.current)
    }
  }, [element])

  return { ref, width }
}
