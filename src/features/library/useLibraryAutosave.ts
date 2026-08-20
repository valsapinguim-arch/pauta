import { useCallback, useEffect, useRef, useState } from 'react'
import type { SessionApi } from '@/features/session'
import type { ScoreDocument } from '@/lib/types'
import { UPDATE_DEBOUNCE_MS } from './constants'
import { save, update } from './repository'

export interface LibraryAutosaveApi {
  /** Perto do limite de armazenamento (decisão 8) — mostrar um aviso a
   *  sugerir exportar e eliminar, não bloquear nada. */
  quotaWarning: boolean
  dismissQuotaWarning: () => void
  /** Última gravação/atualização falhou (decisão 8) — o resultado continua
   *  visível no ecrã, só não ficou guardado; quem usa isto tem de dizer
   *  isso ao utilizador. */
  saveError: boolean
  dismissSaveError: () => void
  /**
   * Associa o `id` de um registo já existente ao documento atual (chamado
   * ao abrir a partir da biblioteca) — sem isto, o efeito de gravação
   * automática trataria o documento aberto como uma transcrição nova e
   * criaria um duplicado em vez de continuar a atualizar o mesmo registo
   * (decisão 6).
   */
  associate: (id: string, document: ScoreDocument) => void
}

/**
 * Gravação automática (decisão 5) e atualização com _debounce_ (decisão 6)
 * — Tarefa 16. Observa `session.state` e decide sozinho quando gravar pela
 * primeira vez e quando atualizar; `App.tsx` só chama `associate` ao abrir
 * a partir da biblioteca (Tarefa 16, Âmbito técnico).
 *
 * O `id` do registo atual vive numa ref, não em estado — mudá-lo nunca deve
 * disparar um novo render; só o `state` da sessão o faz.
 */
export function useLibraryAutosave(session: SessionApi): LibraryAutosaveApi {
  const { state } = session
  const libraryIdRef = useRef<string | null>(null)
  /** O último documento já persistido (por referência) — evita reagendar
   *  uma escrita para um documento que já está gravado tal e qual, tanto
   *  logo depois de gravar como logo depois de `associate` (abrir a partir
   *  da biblioteca devolve o mesmo objeto que já está no IndexedDB). */
  const lastPersistedRef = useRef<ScoreDocument | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  /** A gravação inicial em curso, partilhada entre invocações do efeito —
   *  em desenvolvimento, o StrictMode do React corre o efeito, o seu
   *  _cleanup_, e o efeito outra vez, tudo antes da primeira gravação
   *  terminar; sem isto, cada uma dessas duas invocações despoletava a sua
   *  própria `save()`, duplicando o registo. Só uma gravação inicial pode
   *  estar pendente de cada vez — a segunda invocação encontra esta
   *  promessa e espera pelo mesmo resultado em vez de começar outra. */
  const pendingSaveRef = useRef<Promise<void> | null>(null)

  const [quotaWarning, setQuotaWarning] = useState(false)
  const [saveError, setSaveError] = useState(false)

  const associate = useCallback((id: string, document: ScoreDocument) => {
    libraryIdRef.current = id
    lastPersistedRef.current = document
  }, [])

  useEffect(() => {
    if (state.status !== 'result') {
      libraryIdRef.current = null
      lastPersistedRef.current = null
      if (timeoutRef.current !== null) clearTimeout(timeoutRef.current)
      return
    }

    const document = state.document
    if (document === lastPersistedRef.current) return

    if (libraryIdRef.current === null) {
      pendingSaveRef.current ??= save(document)
        .then((result) => {
          libraryIdRef.current = result.id
          lastPersistedRef.current = document
          setQuotaWarning(result.quotaWarning)
          setSaveError(false)
        })
        .catch(() => {
          setSaveError(true)
        })
        .finally(() => {
          pendingSaveRef.current = null
        })
      return
    }

    const id = libraryIdRef.current
    if (timeoutRef.current !== null) clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => {
      update(id, document)
        .then(() => {
          lastPersistedRef.current = document
          setSaveError(false)
        })
        .catch(() => setSaveError(true))
    }, UPDATE_DEBOUNCE_MS)

    return () => {
      if (timeoutRef.current !== null) clearTimeout(timeoutRef.current)
    }
  }, [state])

  const dismissQuotaWarning = useCallback(() => setQuotaWarning(false), [])
  const dismissSaveError = useCallback(() => setSaveError(false), [])

  return { quotaWarning, dismissQuotaWarning, saveError, dismissSaveError, associate }
}
