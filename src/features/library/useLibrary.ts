import { useCallback, useEffect, useState } from 'react'
import { applyTitle } from '@/lib/notation/applyTitle'
import { get, list, remove, update, type LibraryEntry } from './repository'

export interface LibraryApi {
  entries: LibraryEntry[]
  loading: boolean
  /** Recarrega do IndexedDB — chamado depois de eliminar ou renomear, para
   *  a lista nunca ficar com uma cópia otimista dessincronizada do que está
   *  mesmo guardado. */
  refresh: () => void
  remove: (id: string) => Promise<void>
  rename: (id: string, title: string) => Promise<void>
}

/**
 * Carrega e mantém a lista da biblioteca (Tarefa 16) — `LibraryView` só lê
 * `entries`/`loading` e chama os três métodos; toda a lógica de acesso ao
 * IndexedDB fica em `@/features/library/repository`.
 */
export function useLibrary(): LibraryApi {
  const [entries, setEntries] = useState<LibraryEntry[]>([])
  const [loading, setLoading] = useState(true)
  /** Incrementado para forçar o efeito abaixo a recarregar — mais simples
   *  do que expor `setEntries` diretamente e arriscar uma cópia local
   *  divergente da base de dados real. */
  const [refreshToken, setRefreshToken] = useState(0)

  /* `loading` só cobre a primeira carga (estado inicial `true`, acima) — um
   * `refresh()` a seguir a eliminar/renomear atualiza `entries` em silêncio,
   * sem fazer a lista inteira piscar para o estado de carregamento outra
   * vez. Chamar `setLoading(true)` aqui dentro do corpo do efeito
   * (síncrono, a cada `refreshToken`) é o que a regra `set-state-in-effect`
   * proíbe — daí não o fazer. */
  useEffect(() => {
    let cancelled = false
    list()
      .then((loaded) => {
        if (!cancelled) setEntries(loaded)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [refreshToken])

  const refresh = useCallback(() => setRefreshToken((token) => token + 1), [])

  const removeEntry = useCallback(
    async (id: string) => {
      await remove(id)
      refresh()
    },
    [refresh],
  )

  const rename = useCallback(
    async (id: string, title: string) => {
      const entry = await get(id)
      if (!entry || !entry.result.legible) return
      await update(id, applyTitle(entry.result.document, title))
      refresh()
    },
    [refresh],
  )

  return { entries, loading, refresh, remove: removeEntry, rename }
}
