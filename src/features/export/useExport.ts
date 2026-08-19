import { useCallback, useState } from 'react'
import { sanitizeFilename } from '@/lib/export/sanitizeFilename'
import { toMidi } from '@/lib/export/toMidi'
import { toMusicXml } from '@/lib/export/toMusicXml'
import type { ScoreDocument } from '@/lib/types'
import { shareOrDownload } from './shareOrDownload'
import { svgToPdf } from './svgToPdf'
import { svgToPng } from './svgToPng'

export type ExportFormat = 'musicxml' | 'midi' | 'png' | 'pdf'

export interface ExportApi {
  /** Formato a gerar neste momento, para mostrar `Spinner` no botão certo
   *  (Âmbito técnico da Tarefa 15) — `null` quando nenhuma exportação está
   *  em curso. Só um de cada vez: os botões ficam desativados enquanto
   *  `pending` não for `null` (evita duas exportações a competir pelo
   *  mesmo `<canvas>`/SVG clonado). */
  pending: ExportFormat | null
  /** Formato da última exportação falhada, ou `null` — um código, não uma
   *  mensagem (mesmo padrão de `MicrophoneErrorCode`, Tarefa 4): quem
   *  mostra o erro ao utilizador é que traduz, aqui só se regista o quê
   *  falhou. Substituído a cada nova tentativa, nunca acumulado. */
  error: ExportFormat | null
  dismissError: () => void
  exportFormat: (format: ExportFormat) => void
}

/**
 * Gera e entrega os quatro formatos de exportação (Tarefa 15) sempre a
 * partir do `ScoreDocument` — nunca de `NoteEvent[]`/`QuantizedNote[]`
 * (decisão 8, guardrail em `AGENTS.md`); PNG e PDF recebem também o SVG já
 * renderizado (o que está mesmo no ecrã, incluindo edições e correções).
 *
 * `getSvgElement` é uma função (não o elemento em si) porque o SVG só
 * existe depois de o VexFlow desenhar (Tarefa 13) — chamada no momento do
 * clique, nunca guardada, para nunca exportar uma referência a um nó já
 * destruído por um redesenho entretanto.
 */
export function useExport(
  scoreDocument: ScoreDocument,
  getSvgElement: () => SVGSVGElement | null,
): ExportApi {
  const [pending, setPending] = useState<ExportFormat | null>(null)
  const [error, setError] = useState<ExportFormat | null>(null)

  const dismissError = useCallback(() => setError(null), [])

  const exportFormat = useCallback(
    (format: ExportFormat) => {
      if (pending) return

      const baseName = sanitizeFilename(scoreDocument.metadata.title)

      const run = async () => {
        if (format === 'musicxml') {
          const blob = new Blob([toMusicXml(scoreDocument)], {
            type: 'application/vnd.recordare.musicxml+xml',
          })
          await shareOrDownload(blob, `${baseName}.musicxml`, blob.type)
          return
        }

        if (format === 'midi') {
          const blob = new Blob([toMidi(scoreDocument)], { type: 'audio/midi' })
          await shareOrDownload(blob, `${baseName}.mid`, blob.type)
          return
        }

        const svg = getSvgElement()
        if (!svg) throw new Error('Pauta ainda não desenhada')

        if (format === 'png') {
          const blob = await svgToPng(svg)
          await shareOrDownload(blob, `${baseName}.png`, blob.type)
          return
        }

        const blob = await svgToPdf(svg, scoreDocument.metadata.title)
        await shareOrDownload(blob, `${baseName}.pdf`, blob.type)
      }

      setError(null)
      setPending(format)
      void run()
        .catch(() => {
          setError(format)
        })
        .finally(() => {
          setPending(null)
        })
    },
    [pending, scoreDocument, getSvgElement],
  )

  return { pending, error, dismissError, exportFormat }
}
