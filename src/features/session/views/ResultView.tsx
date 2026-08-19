import { Alert, Button, IconButton, Input, Sheet } from '@/components'
import {
  MetronomeIcon,
  MinusIcon,
  PauseIcon,
  PlayIcon,
  PlusIcon,
  StopIcon,
} from '@/components/icons'
import { ScoreView, usePlayback } from '@/features/notation'
import { PLAYBACK } from '@/lib/playback/constants'
import type { KeyMode, ScoreDocument } from '@/lib/types'
import { playback as playbackStrings, result } from '@/strings'
import styles from './ResultView.module.css'

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
}: ResultViewProps) {
  const { bpm, source: tempoSource } = scoreDocument.tempo
  const { tonic, mode, source: keySource } = scoreDocument.key
  const { confidence } = scoreDocument.metadata
  const playback = usePlayback(scoreDocument)

  return (
    <div className={styles.container}>
      <Input
        className={styles.title}
        label={result.titleLabel}
        value={scoreDocument.metadata.title}
        onChange={(event) => onTitleChange(event.target.value)}
      />

      <Sheet elevated padding="lg" className={styles.score}>
        <ScoreView document={scoreDocument} cursor={playback.currentPosition} />
      </Sheet>

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

      <div className={styles.actions}>
        <Button variant="secondary" onClick={onNewTranscription}>
          {result.newTranscription}
        </Button>
        {/* TODO Tarefa 15: os cinco formatos reais de exportação. */}
        <Button variant="secondary" disabled>
          {result.export}
        </Button>
      </div>
    </div>
  )
}
