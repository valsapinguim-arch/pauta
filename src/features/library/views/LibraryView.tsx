import { useState } from 'react'
import { Alert, Button, IconButton, Input, List, ListItem, Spinner } from '@/components'
import { ChevronLeftIcon, PencilIcon, TrashIcon } from '@/components/icons'
import { formatDate } from '@/features/library/formatDate'
import type { LibraryEntry } from '@/features/library/repository'
import { useLibrary } from '@/features/library/useLibrary'
import { formatElapsed } from '@/features/session/formatElapsed'
import type { ScoreDocument } from '@/lib/types'
import { library } from '@/strings'
import styles from './LibraryView.module.css'

export interface LibraryViewProps {
  onClose: () => void
  /** Abre a transcrição no ecrã principal — quem chama (`App.tsx`) é que
   *  sabe associar `id` ao documento na sessão (Tarefa 16, Âmbito
   *  técnico); esta view só entrega os dois. */
  onOpen: (id: string, document: ScoreDocument) => void
}

/** Uma ação inline de cada vez, por item — renomear e eliminar partilham o
 *  mesmo espaço de confirmação em vez de abrirem um diálogo modal novo
 *  (Tarefa 3, decisão 3: só entra Radix onde há acessibilidade não trivial
 *  a resolver, e nenhuma das duas é isso). */
type ItemAction = { id: string; kind: 'rename' | 'remove' } | null

/**
 * Ecrã da biblioteca local (Tarefa 16) — lista as transcrições guardadas,
 * ordenadas por data (decisão 3), com abrir, renomear e eliminar. Estado
 * próprio (`useLibrary`), sem router (decisão 11): é `App.tsx` que decide
 * quando esta view existe por cima do ecrã principal.
 */
export function LibraryView({ onClose, onOpen }: LibraryViewProps) {
  const { entries, loading, remove, rename } = useLibrary()
  const [activeAction, setActiveAction] = useState<ItemAction>(null)
  const [renameValue, setRenameValue] = useState('')

  function startRename(entry: LibraryEntry): void {
    if (!entry.result.legible) return
    setRenameValue(entry.result.document.metadata.title)
    setActiveAction({ id: entry.id, kind: 'rename' })
  }

  function confirmRename(id: string): void {
    void rename(id, renameValue)
    setActiveAction(null)
  }

  function confirmRemove(id: string): void {
    void remove(id)
    setActiveAction(null)
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <IconButton
          icon={<ChevronLeftIcon />}
          label={library.closeButton}
          variant="ghost"
          onClick={onClose}
        />
        <h2 className={styles.title}>{library.title}</h2>
      </div>

      {/* Decisão 10: sempre visível, nunca atrás de ajuda. */}
      <Alert tone="info" className={styles.notice}>
        {library.localStorageNotice}
      </Alert>

      {loading && (
        <div className={styles.loading} role="status">
          <Spinner size="sm" />
          <span>{library.loading}</span>
        </div>
      )}

      {!loading && entries.length === 0 && (
        <div className={styles.empty}>
          <p className={styles.emptyTitle}>{library.emptyTitle}</p>
          <p className={styles.emptyBody}>{library.emptyBody}</p>
        </div>
      )}

      {!loading && entries.length > 0 && (
        <List aria-label={library.title} className={styles.list}>
          {entries.map((entry) => {
            const isRenaming = activeAction?.id === entry.id && activeAction.kind === 'rename'
            const isRemoving = activeAction?.id === entry.id && activeAction.kind === 'remove'
            const { result } = entry

            return (
              <ListItem key={entry.id} className={styles.item}>
                {result.legible ? (
                  <div className={styles.info}>
                    <span className={styles.itemTitle}>{result.document.metadata.title}</span>
                    <span className={styles.itemMeta}>
                      {formatDate(entry.createdAt)} ·{' '}
                      {formatElapsed(result.document.metadata.durationSec * 1000)} ·{' '}
                      {Math.round(result.document.metadata.confidence.overall * 100)}%
                    </span>
                  </div>
                ) : (
                  <div className={styles.info}>
                    <span className={styles.itemTitle}>{library.illegibleTitle}</span>
                    <span className={styles.itemMeta}>{formatDate(entry.createdAt)}</span>
                    <span className={styles.itemMeta}>{library.illegibleBody}</span>
                  </div>
                )}

                {isRenaming && (
                  <div className={styles.inlineActions}>
                    <Input
                      label={library.renameLabel}
                      value={renameValue}
                      onChange={(event) => setRenameValue(event.target.value)}
                      autoFocus
                    />
                    <Button variant="secondary" onClick={() => setActiveAction(null)}>
                      {library.renameCancel}
                    </Button>
                    <Button variant="primary" onClick={() => confirmRename(entry.id)}>
                      {library.renameConfirm}
                    </Button>
                  </div>
                )}

                {isRemoving && (
                  <div className={styles.inlineActions}>
                    <span className={styles.confirmBody}>
                      {library.removeConfirmTitle} {library.removeConfirmBody}
                    </span>
                    <Button variant="secondary" onClick={() => setActiveAction(null)}>
                      {library.removeCancelAction}
                    </Button>
                    <Button variant="danger" onClick={() => confirmRemove(entry.id)}>
                      {library.removeConfirmAction}
                    </Button>
                  </div>
                )}

                {!isRenaming && !isRemoving && (
                  <div className={styles.actions}>
                    {result.legible && (
                      <>
                        <Button
                          variant="secondary"
                          onClick={() => onOpen(entry.id, result.document)}
                        >
                          {library.open}
                        </Button>
                        <IconButton
                          icon={<PencilIcon />}
                          label={library.rename}
                          variant="ghost"
                          onClick={() => startRename(entry)}
                        />
                      </>
                    )}
                    <IconButton
                      icon={<TrashIcon />}
                      label={library.remove}
                      variant="ghost"
                      onClick={() => setActiveAction({ id: entry.id, kind: 'remove' })}
                    />
                  </div>
                )}
              </ListItem>
            )
          })}
        </List>
      )}
    </div>
  )
}
