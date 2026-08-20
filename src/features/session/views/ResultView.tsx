import { useCallback, useEffect, useRef } from 'react'
import { Alert, Button, IconButton, Input, Sheet, Spinner, Toast } from '@/components'
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  MetronomeIcon,
  MinusIcon,
  PauseIcon,
  PlayIcon,
  PlusIcon,
  RedoIcon,
  StopIcon,
  UndoIcon,
} from '@/components/icons'
import type { ExportFormat } from '@/features/export'
import { useExport } from '@/features/export'
import { EditToolbar, ScoreView, useScoreEditor, usePlayback } from '@/features/notation'
import { PLAYBACK } from '@/lib/playback/constants'
import type { KeyMode, ScoreDocument } from '@/lib/types'
import { edit as editStrings, exportPanel, playback as playbackStrings, result } from '@/strings'
import styles from './ResultView.module.css'

const EXPORT_FORMATS: { format: ExportFormat; label: string }[] = [
  { format: 'musicxml', label: exportPanel.musicxml },
  { format: 'midi', label: exportPanel.midi },
  { format: 'png', label: exportPanel.png },
  { format: 'pdf', label: exportPanel.pdf },
]

export interface ResultViewProps {
  document: ScoreDocument
  /** Já real: `session.reset()` volta a `idle`, transição que o reducer trata
   *  desde a Tarefa 1. */
  onNewTranscription: () => void
  /** Correção manual do BPM (Tarefa 9, decisão 6/7) — recebe o novo valor já
   *  clampado por quem chama (`applyManualBpm`, `@/lib/tempo`); esta view só
   *  incrementa/decrementa e mostra o resultado, nunca recalcula sozinha. */
  onBpmChange: (bpm: number) => void
  /** Correção manual da tonalidade (Tarefa 11, decisão 6) — mesmo espírito
   *  do BPM: esta view só escolhe a próxima tónica/modo, quem chama aplica
   *  (`applyManualKey`, `@/lib/key`). */
  onKeyChange: (tonic: number, mode: KeyMode) => void
  /** Edição do título (Tarefa 12) — em branco é ignorado por quem aplica
   *  (`applyTitle`, `@/lib/notation`), nunca por esta view. */
  onTitleChange: (title: string) => void
  /** Edição manual nota a nota, transposição e desfazer/refazer (Tarefa
   *  17) — `useScoreEditor` já devolve o documento seguinte pronto
   *  (`@/lib/notation/edit`); esta view só o repassa à sessão, mesmo
   *  padrão de `onBpmChange`/`onKeyChange`/`onTitleChange` acima. */
  onDocumentChange: (document: ScoreDocument) => void
}

/**
 * A pauta é desenhada a sério com VexFlow desde a Tarefa 13 (`ScoreView`,
 * `@/features/notation`) — substitui a ilustração estática da Tarefa 3.
 */
export function ResultView({
  document: scoreDocument,
  onNewTranscription,
  onBpmChange,
  onKeyChange,
  onTitleChange,
  onDocumentChange,
}: ResultViewProps) {
  const { bpm, source: tempoSource } = scoreDocument.tempo
  const { tonic, mode, source: keySource } = scoreDocument.key
  const { confidence } = scoreDocument.metadata
  const playback = usePlayback(scoreDocument)
  const editor = useScoreEditor(scoreDocument, onDocumentChange, playback.stop)

  const svgRef = useRef<SVGSVGElement | null>(null)
  const getSvgElement = useCallback(() => svgRef.current, [])
  const handleSvgReady = useCallback((svg: SVGSVGElement | null) => {
    svgRef.current = svg
  }, [])
  const exportApi = useExport(scoreDocument, getSvgElement)

  /* Foco na região da pauta ao entrar em `result` (Tarefa 18, decisão 5) —
   *  `ResultView` é montada de novo a cada transição de estado (Tarefa 3,
   *  decisão 7: as views substituem-se por completo), por isso um efeito
   *  sem dependências corre exatamente uma vez, na montagem, que é
   *  exatamente quando se entra neste estado. Sem isto o foco cai no
   *  `body` e um utilizador de teclado ou de leitor de ecrã perde o
   *  contexto. */
  const scoreRegionRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    scoreRegionRef.current?.focus()
  }, [])

  return (
    <div className={styles.container}>
      <Input
        className={styles.title}
        label={result.titleLabel}
        value={scoreDocument.metadata.title}
        onChange={(event) => onTitleChange(event.target.value)}
      />

      <Sheet elevated padding="lg" className={styles.score} ref={scoreRegionRef} tabIndex={-1}>
        <ScoreView
          document={scoreDocument}
          cursor={playback.currentPosition}
          selection={editor.selection}
          onSelect={editor.select}
          onSvgReady={handleSvgReady}
        />
      </Sheet>

      <div className={styles.noteNav}>
        <IconButton
          icon={<ChevronLeftIcon />}
          label={editStrings.previousNote}
          size="sm"
          onClick={editor.selectPrevious}
        />
        <IconButton
          icon={<ChevronRightIcon />}
          label={editStrings.nextNote}
          size="sm"
          onClick={editor.selectNext}
        />
      </div>

      <EditToolbar editor={editor} />

      <div className={styles.playback}>
        <IconButton
          icon={playback.isPlaying ? <PauseIcon /> : <PlayIcon />}
          label={playback.isPlaying ? playbackStrings.pause : playbackStrings.play}
          onClick={() => (playback.isPlaying ? playback.pause() : playback.play())}
        />
        <IconButton icon={<StopIcon />} label={playbackStrings.stop} onClick={playback.stop} />

        <div className={styles.tempoControl}>
          <IconButton
            icon={<MinusIcon />}
            label={playbackStrings.decreaseSpeed}
            size="sm"
            disabled={playback.speed <= PLAYBACK.MIN_SPEED}
            onClick={() => playback.setSpeed(playback.speed - PLAYBACK.SPEED_STEP)}
          />
          <span className={styles.tempoValue}>{playback.speed.toFixed(2)}x</span>
          <IconButton
            icon={<PlusIcon />}
            label={playbackStrings.increaseSpeed}
            size="sm"
            disabled={playback.speed >= PLAYBACK.MAX_SPEED}
            onClick={() => playback.setSpeed(playback.speed + PLAYBACK.SPEED_STEP)}
          />
        </div>

        <IconButton
          icon={<MetronomeIcon />}
          label={
            playback.isMetronomeOn ? playbackStrings.metronomeOff : playbackStrings.metronomeOn
          }
          variant={playback.isMetronomeOn ? 'default' : 'ghost'}
          onClick={playback.toggleMetronome}
        />
      </div>

      <p className={styles.confidence}>
        {result.confidenceLabel} {Math.round(confidence.overall * 100)}% ({result.confidenceNotes}{' '}
        {Math.round(confidence.notes * 100)}%, {result.confidenceTempo}{' '}
        {Math.round(confidence.tempo * 100)}%, {result.confidenceKey}{' '}
        {Math.round(confidence.key * 100)}%)
      </p>

      <div className={styles.tempo}>
        <span className={styles.tempoLabel}>{result.tempoLabel}</span>
        <div className={styles.tempoControl}>
          <IconButton
            icon={<MinusIcon />}
            label={result.decreaseBpm}
            size="sm"
            onClick={() => onBpmChange(bpm - 1)}
          />
          <span className={styles.tempoValue}>
            {Math.round(bpm)} {result.bpmUnit}
          </span>
          <IconButton
            icon={<PlusIcon />}
            label={result.increaseBpm}
            size="sm"
            onClick={() => onBpmChange(bpm + 1)}
          />
        </div>
      </div>

      {tempoSource === 'assumed' && (
        <Alert tone="info" title={result.assumedTempoTitle}>
          {result.assumedTempoBody}
        </Alert>
      )}

      <div className={styles.tempo}>
        <span className={styles.tempoLabel}>{result.keyLabel}</span>
        <div className={styles.tempoControl}>
          <IconButton
            icon={<MinusIcon />}
            label={result.decreaseTonic}
            size="sm"
            onClick={() => onKeyChange((tonic + 11) % 12, mode)}
          />
          <span className={styles.tempoValue}>
            {result.noteNames[tonic]} {result.modeLabels[mode]}
          </span>
          <IconButton
            icon={<PlusIcon />}
            label={result.increaseTonic}
            size="sm"
            onClick={() => onKeyChange((tonic + 1) % 12, mode)}
          />
        </div>
        <Button
          variant="secondary"
          onClick={() => onKeyChange(tonic, mode === 'major' ? 'minor' : 'major')}
        >
          {result.toggleMode}
        </Button>
      </div>

      {keySource === 'assumed' && (
        <Alert tone="info" title={result.assumedKeyTitle}>
          {result.assumedKeyBody}
        </Alert>
      )}

      <div className={styles.tempo}>
        <span className={styles.tempoLabel}>{editStrings.transposeLabel}</span>
        <div className={styles.tempoControl}>
          <IconButton
            icon={<MinusIcon />}
            label={editStrings.decreaseTranspose}
            size="sm"
            onClick={() => editor.transpose(-1)}
          />
          <IconButton
            icon={<PlusIcon />}
            label={editStrings.increaseTranspose}
            size="sm"
            onClick={() => editor.transpose(1)}
          />
        </div>
        <IconButton
          icon={<UndoIcon />}
          label={editStrings.undo}
          size="sm"
          variant="ghost"
          disabled={!editor.canUndo}
          onClick={editor.undo}
        />
        <IconButton
          icon={<RedoIcon />}
          label={editStrings.redo}
          size="sm"
          variant="ghost"
          disabled={!editor.canRedo}
          onClick={editor.redo}
        />
      </div>

      <div className={styles.actions}>
        <Button variant="secondary" onClick={onNewTranscription}>
          {result.newTranscription}
        </Button>
        {EXPORT_FORMATS.map(({ format, label }) => (
          <Button
            key={format}
            variant="secondary"
            disabled={exportApi.pending !== null}
            onClick={() => exportApi.exportFormat(format)}
          >
            {exportApi.pending === format && <Spinner size="sm" />}
            {label}
          </Button>
        ))}
      </div>

      <Toast
        open={exportApi.error !== null}
        onOpenChange={(open) => {
          if (!open) exportApi.dismissError()
        }}
        title={exportPanel.errorTitle}
        description={exportPanel.errorBody}
      />

      <Toast
        open={editor.error}
        onOpenChange={(open) => {
          if (!open) editor.dismissError()
        }}
        title={editStrings.errorTitle}
        description={editStrings.errorBody}
      />
    </div>
  )
}
