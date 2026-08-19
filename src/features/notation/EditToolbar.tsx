import { Button, IconButton, Sheet } from '@/components'
import { ArrowDownIcon, ArrowUpIcon, TrashIcon } from '@/components/icons'
import type { ScoreEditorApi } from './useScoreEditor'
import type { NoteType } from '@/lib/types'
import { edit as strings } from '@/strings'
import styles from './EditToolbar.module.css'

const DURATION_OPTIONS: NoteType[] = ['whole', 'half', 'quarter', 'eighth', 'sixteenth']

/** Semitons de uma oitava — decisão 4 (Tarefa 17): "oitava com um gesto
 *  secundário". Sem gesto (arrastar/premir longo) por ser frágil e pouco
 *  descobrível em telefone; um segundo par de botões, visualmente
 *  distinto do par de semitom, cumpre a mesma decisão de forma mais
 *  robusta ao toque. */
const OCTAVE_SEMITONES = 12

export interface EditToolbarProps {
  editor: ScoreEditorApi
}

/**
 * Barra de edição — Tarefa 17, Âmbito técnico: "aparece com uma nota
 * selecionada, com altura, duração, eliminar". Com uma pausa selecionada,
 * mostra só "inserir nota" (decisão 1); a seleção segue a nota inserida, e
 * a barra troca sozinha para o modo de nota no próximo desenho.
 */
export function EditToolbar({ editor }: EditToolbarProps) {
  const { selectedElement } = editor
  if (!selectedElement) return null

  return (
    <Sheet padding="md" className={styles.toolbar}>
      {selectedElement.kind === 'rest' ? (
        <Button variant="primary" onClick={() => editor.insertAtSelection(60, 'quarter')}>
          {strings.insertNote}
        </Button>
      ) : (
        <>
          <div className={styles.group}>
            <span className={styles.groupLabel}>{strings.pitchLabel}</span>
            <IconButton
              icon={<ArrowDownIcon />}
              label={strings.decreaseOctave}
              size="sm"
              variant="ghost"
              onClick={() => editor.changePitch(-OCTAVE_SEMITONES)}
            />
            <IconButton
              icon={<ArrowDownIcon />}
              label={strings.decreaseSemitone}
              size="sm"
              onClick={() => editor.changePitch(-1)}
            />
            <IconButton
              icon={<ArrowUpIcon />}
              label={strings.increaseSemitone}
              size="sm"
              onClick={() => editor.changePitch(1)}
            />
            <IconButton
              icon={<ArrowUpIcon />}
              label={strings.increaseOctave}
              size="sm"
              variant="ghost"
              onClick={() => editor.changePitch(OCTAVE_SEMITONES)}
            />
          </div>

          <div className={styles.group}>
            <span className={styles.groupLabel}>{strings.durationLabel}</span>
            {DURATION_OPTIONS.map((noteType) => (
              <Button
                key={noteType}
                variant={
                  selectedElement.noteType === noteType && selectedElement.dots === 0
                    ? 'primary'
                    : 'secondary'
                }
                onClick={() => editor.changeDuration(noteType, 0)}
              >
                {strings.noteTypeNames[noteType]}
              </Button>
            ))}
            <Button
              variant={selectedElement.dots === 1 ? 'primary' : 'secondary'}
              onClick={() =>
                editor.changeDuration(selectedElement.noteType, selectedElement.dots === 1 ? 0 : 1)
              }
            >
              {strings.toggleDot}
            </Button>
          </div>

          <IconButton
            icon={<TrashIcon />}
            label={strings.deleteNote}
            variant="ghost"
            onClick={editor.deleteSelected}
          />
        </>
      )}
    </Sheet>
  )
}
