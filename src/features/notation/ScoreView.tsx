import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react'
import { Alert, IconButton, Spinner } from '@/components'
import { MinusIcon, PlusIcon } from '@/components/icons'
import type { NotationPosition } from '@/lib/notation/edit'
import type { ScoreDocument } from '@/lib/types'
import { notation } from '@/strings'
import { drawScore } from './drawScore'
import type { VexFlowModule } from './drawScore'
import type { PlaybackCursor } from './usePlayback'
import styles from './ScoreView.module.css'
import { useElementSize } from './useElementSize'

/** Margem à volta da nota destacada, em unidades do SVG (coincidem com
 *  píxeis antes do `viewBox`/zoom escalar) — só o suficiente para não colar
 *  ao desenho da nota. */
const CURSOR_PADDING = 4

/** Área sensível mínima ao toque, em unidades do SVG (Tarefa 17, decisão 3)
 *  — mesmo valor de `--touch-target-min` em `tokens.css`, repetido aqui
 *  como número puro porque isto corre em espaço de coordenadas do SVG, não
 *  em CSS (mesmo padrão de `CURSOR_PADDING`/`ZOOM_STEPS` nesta função:
 *  literais, não tokens). Cabeças de nota desenhadas são bem mais pequenas
 *  do que isto em telefone — sem alargar a área clicável, selecionar uma
 *  nota com o dedo é impossível. */
const MIN_TOUCH_TARGET = 44

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
  /** Nota atualmente a soar (Tarefa 14) — `undefined`/`null` fora de
   *  reprodução, sem cursor nenhum desenhado. */
  cursor?: PlaybackCursor | null | undefined
  /** Posição selecionada para edição (Tarefa 17) — realçada com um
   *  contorno, distinto do preenchimento do cursor de reprodução (os dois
   *  não deviam aparecer ao mesmo tempo na prática: decisão 11, qualquer
   *  edição para a reprodução). `null`/`undefined` = nada selecionado. */
  selection?: NotationPosition | null | undefined
  /** Clique/toque numa nota ou pausa (Tarefa 17, decisão 3) — `null`
   *  quando o clique não acertou em nenhum elemento (des-seleciona). Sem
   *  isto, o SVG não responde a cliques (só leitura, como até à Tarefa
   *  16). */
  onSelect?: ((position: NotationPosition | null) => void) | undefined
  /** Chamado com o `<svg>` acabado de desenhar, ou `null` quando deixa de
   *  existir (sem notas, ou antes do primeiro desenho) — Tarefa 15: a
   *  exportação para PNG/PDF precisa do SVG exatamente como está no ecrã
   *  (decisão 8 da tarefa), nunca de uma cópia guardada que possa já não
   *  corresponder a um redesenho entretanto. */
  onSvgReady?: ((svg: SVGSVGElement | null) => void) | undefined
}

/**
 * Desenha `document` com VexFlow — Tarefa 13. Só lê o `ScoreDocument`
 * (decisão 9, guardrail em `AGENTS.md`); nunca o modifica — quem muda o
 * documento é sempre `@/lib/notation/edit` (Tarefa 17), nunca este
 * componente. Com `onSelect` ligado, cliques/toques resolvem-se pelos
 * atributos `data-measure`/`data-element` (decisão 3 da Tarefa 17) e sobem
 * como uma posição — nunca por depender da ordem dos nós que o VexFlow
 * gera.
 */
export function ScoreView({
  document: scoreDocument,
  cursor,
  selection,
  onSelect,
  onSvgReady,
}: ScoreViewProps) {
  const [vf, setVf] = useState<VexFlowModule | null>(null)
  const [zoomIndex, setZoomIndex] = useState(DEFAULT_ZOOM_INDEX)
  const { ref: viewportRef, width: viewportWidth } = useElementSize<HTMLDivElement>()
  const canvasRef = useRef<HTMLDivElement | null>(null)
  const cursorElRef = useRef<SVGRectElement | null>(null)
  const selectionElRef = useRef<SVGRectElement | null>(null)
  /* Em ref, não direto nas deps do efeito de desenho: `onSvgReady` é quase
     sempre uma função nova a cada render de quem usa `ScoreView`
     (`ResultView.tsx`) e não deve forçar um redesenho VexFlow inteiro só
     por isso — mesmo padrão de `optionsRef` em `useMicrophone`. */
  const onSvgReadyRef = useRef(onSvgReady)
  useEffect(() => {
    onSvgReadyRef.current = onSvgReady
  }, [onSvgReady])
  /* Mesmo padrão de `onSvgReadyRef` — `onSelect` (Tarefa 17) muda de
     identidade a cada render de `ResultView`, e não deve forçar um
     redesenho inteiro do VexFlow. */
  const onSelectRef = useRef(onSelect)
  useEffect(() => {
    onSelectRef.current = onSelect
  }, [onSelect])

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

      // Área sensível alargada por elemento (Tarefa 17, decisão 3) — um
      // retângulo invisível, do tamanho de `MIN_TOUCH_TARGET` no mínimo,
      // inserido como primeiro filho de cada grupo `[data-measure]
      // [data-element]`. Fica dentro do próprio grupo (não ao lado) para o
      // clique continuar a resolver-se por `closest` sem duplicar
      // atributos `data-*`.
      svg.querySelectorAll<SVGGElement>('[data-measure][data-element]').forEach((group) => {
        const box = group.getBBox()
        const width = Math.max(box.width, MIN_TOUCH_TARGET)
        const height = Math.max(box.height, MIN_TOUCH_TARGET)
        const hitRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
        hitRect.setAttribute('x', String(box.x - (width - box.width) / 2))
        hitRect.setAttribute('y', String(box.y - (height - box.height) / 2))
        hitRect.setAttribute('width', String(width))
        hitRect.setAttribute('height', String(height))
        hitRect.setAttribute('fill', 'transparent')
        hitRect.style.pointerEvents = onSelectRef.current ? 'all' : 'none'
        hitRect.style.cursor = onSelectRef.current ? 'pointer' : 'default'
        group.insertBefore(hitRect, group.firstChild)
      })
    }

    // `drawScore` limpa o contentor a cada redesenho (Tarefa 13, decisão 4)
    // — o cursor e a seleção, se existiam, foram destruídos com o resto do
    // SVG anterior.
    cursorElRef.current = null
    selectionElRef.current = null

    onSvgReadyRef.current?.(svg)
    return () => onSvgReadyRef.current?.(null)
  }, [vf, scoreDocument, viewportWidth, zoom, hasNotes])

  /* Posiciona o cursor (Tarefa 14, decisão 4) sobre o grupo `[data-measure]
     [data-element]` correspondente (Tarefa 13, decisão 7) e mantém-no
     visível com auto-scroll. Efeito próprio, separado do redesenho: corre a
     cada nota nova sem repetir o trabalho caro do VexFlow. */
  useEffect(() => {
    const canvas = canvasRef.current
    const svg = canvas?.querySelector('svg')
    if (!canvas || !svg) return

    if (!cursor) {
      cursorElRef.current?.remove()
      return
    }

    const target = canvas.querySelector<SVGGElement>(
      `[data-measure="${cursor.measureIndex + 1}"][data-element="${cursor.elementIndex}"]`,
    )
    if (!target) {
      cursorElRef.current?.remove()
      return
    }

    let cursorEl = cursorElRef.current
    if (!cursorEl) {
      cursorEl = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
      // Classe literal, não `styles.cursor`: este `<rect>` é criado com
      // `createElementNS`, fora do JSX — o CSS Modules não o vê para
      // gerar/hashar uma classe local, por isso a regra em
      // `ScoreView.module.css` usa `:global(.cursor)` e o nome tem de bater
      // certo aqui também.
      cursorEl.setAttribute('class', 'cursor')
      cursorElRef.current = cursorEl
    }

    const box = target.getBBox()
    cursorEl.setAttribute('x', String(box.x - CURSOR_PADDING))
    cursorEl.setAttribute('y', String(box.y - CURSOR_PADDING))
    cursorEl.setAttribute('width', String(box.width + CURSOR_PADDING * 2))
    cursorEl.setAttribute('height', String(box.height + CURSOR_PADDING * 2))
    if (cursorEl.parentNode !== svg) svg.insertBefore(cursorEl, svg.firstChild)

    target.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  }, [cursor])

  /* Realce da seleção de edição (Tarefa 17) — mesmo mecanismo do cursor de
   *  reprodução acima, `<rect>` próprio para não competir por classe com
   *  `.cursor` (as duas podem em teoria coexistir na marcação, mesmo que a
   *  decisão 11 evite que apareçam ao mesmo tempo na prática). */
  useEffect(() => {
    const canvas = canvasRef.current
    const svg = canvas?.querySelector('svg')
    if (!canvas || !svg) return

    if (!selection) {
      selectionElRef.current?.remove()
      return
    }

    const target = canvas.querySelector<SVGGElement>(
      `[data-measure="${selection.measureNumber}"][data-element="${selection.elementIndex}"]`,
    )
    if (!target) {
      selectionElRef.current?.remove()
      return
    }

    let selectionEl = selectionElRef.current
    if (!selectionEl) {
      selectionEl = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
      selectionEl.setAttribute('class', 'selection')
      selectionElRef.current = selectionEl
    }

    const box = target.getBBox()
    selectionEl.setAttribute('x', String(box.x - CURSOR_PADDING))
    selectionEl.setAttribute('y', String(box.y - CURSOR_PADDING))
    selectionEl.setAttribute('width', String(box.width + CURSOR_PADDING * 2))
    selectionEl.setAttribute('height', String(box.height + CURSOR_PADDING * 2))
    if (selectionEl.parentNode !== svg) svg.insertBefore(selectionEl, svg.firstChild)
  }, [selection])

  function handleCanvasClick(event: ReactMouseEvent<HTMLDivElement>): void {
    if (!onSelectRef.current) return
    const target = (event.target as Element).closest<SVGGElement>('[data-measure][data-element]')
    if (!target) {
      onSelectRef.current(null)
      return
    }
    const measureNumber = Number(target.getAttribute('data-measure'))
    const elementIndex = Number(target.getAttribute('data-element'))
    onSelectRef.current({ measureNumber, elementIndex })
  }

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
        <div ref={canvasRef} className={styles.canvas} onClick={handleCanvasClick} />
      </div>
    </div>
  )
}
