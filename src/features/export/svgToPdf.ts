import type { jsPDF as JsPDF } from 'jspdf'
import type { svg2pdf as Svg2Pdf } from 'svg2pdf.js'
import { VISUAL_EXPORT } from './constants'
import { embedSvgColors } from './embedSvgColors'

function svgSize(svg: SVGSVGElement): { width: number; height: number } {
  const width = Number(svg.getAttribute('width')) || svg.viewBox.baseVal.width
  const height = Number(svg.getAttribute('height')) || svg.viewBox.baseVal.height
  return { width, height }
}

interface PdfModules {
  jsPDF: typeof JsPDF
  svg2pdf: typeof Svg2Pdf
  bravuraBase64: string
  academicoBase64: string
}

function base64FromDataUrl(dataUrl: string): string {
  return dataUrl.slice(dataUrl.indexOf(',') + 1)
}

/**
 * `jspdf`/`svg2pdf.js` e os dois tipos de letra da pauta importados
 * dinamicamente, uma só vez por sessão de página (mesmo padrão de
 * `loadVexFlow`, Tarefa 13, decisão 10) — só quem clica em "exportar PDF"
 * paga o custo destas dependências; nunca entram no bundle inicial.
 *
 * Bravura/Academico (`./fonts/*.ttf`, o mesmo par que `VexFlow.setFonts`
 * usa para desenhar a pauta no ecrã — Tarefa 13) vêm vendorizados aqui, em
 * vez de pedidos à CDN oficial do VexFlow em tempo real: esta app não fala
 * com a rede em runtime (`AGENTS.md`, regras de produto), o mesmo motivo
 * por que o modelo Basic Pitch (Tarefa 7) está em `public/models/` e não é
 * descarregado. `?inline` força o Vite a embutir o ficheiro como
 * `data:` URI no próprio módulo — sem isso, `import` resolvia para uma URL
 * a pedir via `fetch`, proibido fora da `NETWORK_ALLOWLIST`.
 *
 * `.ttf`, não `.otf`: a distribuição oficial da Bravura/Academico é
 * OpenType de contornos CFF, que o módulo de fontes do `jsPDF` não sabe
 * embutir (falha a meio do `addFont`, sem avisar — só um erro solto na
 * consola). Os `.ttf` aqui foram convertidos uma vez, ao preparar esta
 * tarefa, com `fontTools`/`cu2qu` (contornos CFF cúbicos para TrueType
 * quadráticos); não regenerar a partir do `.otf` dentro da app.
 */
let pdfModulesPromise: Promise<PdfModules> | null = null
function loadPdfModules(): Promise<PdfModules> {
  pdfModulesPromise ??= Promise.all([
    import('jspdf'),
    import('svg2pdf.js'),
    import('./fonts/Bravura.ttf?inline'),
    import('./fonts/Academico.ttf?inline'),
  ]).then(([jspdfModule, svg2pdfModule, bravuraModule, academicoModule]) => ({
    jsPDF: jspdfModule.jsPDF,
    svg2pdf: svg2pdfModule.svg2pdf,
    bravuraBase64: base64FromDataUrl(bravuraModule.default),
    academicoBase64: base64FromDataUrl(academicoModule.default),
  }))
  return pdfModulesPromise
}

/**
 * Serializa `svg` para PDF vetorial em A4 retrato, com o título no topo
 * (Tarefa 15, decisão 5) — via `svg2pdf.js`, que desenha os caminhos do SVG
 * como vetores reais no PDF, nunca como imagem rasterizada embutida
 * (guardrail em `AGENTS.md`). Precisa do DOM; vive em `@/features/export`.
 *
 * Bravura/Academico têm de ser registados no `jsPDF` (`addFileToVFS` +
 * `addFont`, sob os mesmos nomes usados pelo `font-family` que
 * `embedSvgColors` escreve em cada `<text>` do clone) antes de chamar
 * `svg2pdf` — sem isto, o texto (claves, alterações, andamento) sai com um
 * tipo de letra `Helvetica` genérico em vez dos glifos musicais corretos,
 * porque o `svg2pdf` não embute automaticamente um tipo de letra que não
 * conhece.
 */
export async function svgToPdf(svg: SVGSVGElement, title: string): Promise<Blob> {
  const { jsPDF, svg2pdf, bravuraBase64, academicoBase64 } = await loadPdfModules()
  const prepared = embedSvgColors(svg)
  const { width, height } = svgSize(prepared)

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  /* `Identity-H`: os glifos musicais da Bravura são caracteres SMuFL na
     Private Use Area (U+E050 e adiante, ver `textContent` dos `<text>` que
     o VexFlow gera). Com a codificação de byte único por omissão do jsPDF,
     esses pontos de código não têm representação e saem em branco — a
     pauta ficava com pentagrama e hastes mas sem claves nem cabeças de
     nota. `Identity-H` mapeia diretamente índices de glifo de dois bytes,
     que é o que a PUA exige. */
  pdf.addFileToVFS('Bravura.ttf', bravuraBase64)
  pdf.addFont('Bravura.ttf', 'Bravura', 'normal', 400, 'Identity-H')
  pdf.addFileToVFS('Academico.ttf', academicoBase64)
  pdf.addFont('Academico.ttf', 'Academico', 'normal', 400, 'Identity-H')

  pdf.setFontSize(VISUAL_EXPORT.TITLE_FONT_SIZE_PT)
  pdf.text(title, VISUAL_EXPORT.PAGE_WIDTH_MM / 2, VISUAL_EXPORT.PAGE_MARGIN_MM, {
    align: 'center',
  })

  const contentWidth = VISUAL_EXPORT.PAGE_WIDTH_MM - VISUAL_EXPORT.PAGE_MARGIN_MM * 2
  const contentHeight = (height / width) * contentWidth

  await svg2pdf(prepared, pdf, {
    x: VISUAL_EXPORT.PAGE_MARGIN_MM,
    y: VISUAL_EXPORT.PAGE_MARGIN_MM + VISUAL_EXPORT.TITLE_HEIGHT_MM,
    width: contentWidth,
    height: contentHeight,
  })

  return pdf.output('blob')
}
