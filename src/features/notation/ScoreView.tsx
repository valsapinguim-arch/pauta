import { useEffect, useRef, useState } from 'react'
import { Alert, IconButton, Spinner } from '@/components'
import { MinusIcon, PlusIcon } from '@/components/icons'
import type { ScoreDocument } from '@/lib/types'
import { notation } from '@/strings'
import { drawScore } from './drawScore'
import type { VexFlowModule } from './drawScore'
import styles from './ScoreView.module.css'
import { useElementSize } from './useElementSize'

/** Zoom em passos (decisão 6 da Tarefa 13) — não contínuo: um número fixo
 *  de níveis é suficiente e evita recalcular a cada pixel arrastado. */
const ZOOM_STEPS = [0.75, 1, 1.25, 1.5, 1.75, 2] as const
const DEFAULT_ZOOM_INDEX = ZOOM_STEPS.indexOf(1)

/** Abaixo disto mostra-se o aviso da decisão 8 — separado dos limiares de
 *  `TEMPO.MIN_CONFIDENCE`/`KEY.MIN_CONFIDENCE` (Tarefas 9/11, que decidem
 *  `source: 'assumed'`): este é sobre o agregado já construído, não sobre
 *  detetar de novo. Provisório, tal como os outros, até haver áudio real
 *  para afinar (Tarefa 13, Âmbito técnico — não foi possível fazer essa
 *  afinação nesta sessão por não haver microfone disponível; ver notas do
 *  PR). */
const LOW_CONFIDENCE_THRESHOLD = 0.6

/** Módulo `vexflow` importado dinamicamente uma só vez por sessão de
 *  página (decisão 10) e reutilizado por todas as montagens de `ScoreView`
 *  — evitar reimportar a cada gravação nova. */
let vexflowModulePromise: Promise<VexFlowModule> | null = null
function loadVexFlow(): Promise<VexFlowModule> {
  vexflowModulePromise ??= import('vexflow')
  return vexflowModulePromise
}

function hasAnyNote(document: ScoreDocument): boolean {
  return document.measures.some((measure) => measure.elements.some((el) => el.kind === 'note'))
}

/** A mais fraca das três confianças detalhadas — decisão 8: o aviso aponta
 *  sempre à causa, nunca é genérico. */
function weakestConfidence(
  confidence: ScoreDocument['metadata']['confidence'],
): 'notes' | 'tempo' | 'key' {
  if (confidence.notes <= confidence.tempo && confidence.notes <= confidence.key) return 'notes'
  if (confidence.tempo <= confidence.key) return 'tempo'
  return 'key'
}

export interface ScoreViewProps {
  document: ScoreDocument
}

/**
 * Desenha `document` com VexFlow — Tarefa 13. Só lê o `ScoreDocument`
 * (decisão 9, guardrail em `AGENTS.md`); nunca o modifica — isso é a Tarefa
 * 17. Sem edição: notas desenhadas não respondem a cliques.
 */
export function ScoreView({ document: scoreDocument }: ScoreViewProps) {
  const [vf, setVf] = useState<VexFlowModule | null>(null)
  const [zoomIndex, setZoomIndex] = useState(DEFAULT_ZOOM_INDEX)
  const { ref: viewportRef, width: viewportWidth } = useElementSize<HTMLDivElement>()
  const canvasRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    let cancelled = false
    loadVexFlow().then((module) => {
      if (!cancelled) setVf(module)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const zoom = ZOOM_STEPS[zoomIndex] as number
  const hasNotes = hasAnyNote(scoreDocument)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!vf || !canvas || !hasNotes || viewportWidth <= 0) return

    // Zoom escala o SVG, não a formatação (decisão 6): desenha-se para uma
    // largura de conteúdo menor (mais zoom = menos compassos por linha) e
    // depois pede-se ao SVG para se mostrar maior — scroll vertical
    // continua o gesto normal, scroll horizontal só aparece quando o zoom
    // o torna mesmo inevitável.
    const contentWidth = Math.max(viewportWidth / zoom, 200)
    const { totalHeight } = drawScore(vf, canvas, scoreDocument, contentWidth)

    const svg = canvas.querySelector('svg')
    if (svg) {
      svg.setAttribute('width', String(contentWidth * zoom))
      svg.setAttribute('height', String(totalHeight * zoom))
    }
  }, [vf, scoreDocument, viewportWidth, zoom, hasNotes])

  if (!hasNotes) {
    return (
      <div className={styles.empty}>
        <p className={styles.emptyTitle}>{notation.emptyTitle}</p>
        <p>{notation.emptyBody}</p>
      </div>
    )
  }

  const { confidence } = scoreDocument.metadata
  const showLowConfidenceWarning = confidence.overall < LOW_CONFIDENCE_THRESHOLD
  const weakest = weakestConfidence(confidence)
  const lowConfidenceMessage = {
    notes: notation.lowConfidenceNotes,
    tempo: notation.lowConfidenceTempo,
    key: notation.lowConfidenceKey,
  }[weakest]

  return (
    <div className={styles.container}>
      {showLowConfidenceWarning && (
        <Alert tone="info" title={notation.lowConfidenceTitle}>
          {lowConfidenceMessage}
        </Alert>
      )}

      <div className={styles.zoomControl}>
        <IconButton
          icon={<MinusIcon />}
          label={notation.decreaseZoom}
          size="sm"
          disabled={zoomIndex === 0}
          onClick={() => setZoomIndex((index) => Math.max(0, index - 1))}
        />
        <IconButton
          icon={<PlusIcon />}
          label={notation.increaseZoom}
          size="sm"
          disabled={zoomIndex === ZOOM_STEPS.length - 1}
          onClick={() => setZoomIndex((index) => Math.min(ZOOM_STEPS.length - 1, index + 1))}
        />
      </div>

      <div ref={viewportRef} className={styles.viewport}>
        {!vf && (
          <div className={styles.loading}>
            <Spinner size="lg" />
          </div>
        )}
        <div ref={canvasRef} className={styles.canvas} />
      </div>
    </div>
  )
}
