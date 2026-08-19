import type { Canvg as CanvgClass } from 'canvg'
import { VISUAL_EXPORT } from './constants'
import { embedSvgColors } from './embedSvgColors'

function svgSize(svg: SVGSVGElement): { width: number; height: number } {
  const width = Number(svg.getAttribute('width')) || svg.viewBox.baseVal.width
  const height = Number(svg.getAttribute('height')) || svg.viewBox.baseVal.height
  return { width, height }
}

/** `canvg` importado dinamicamente, uma só vez por sessão de página (mesmo
 *  padrão de `loadVexFlow`, Tarefa 13, decisão 10) — só quem exporta PNG
 *  paga o custo desta dependência. */
let canvgModulePromise: Promise<{ Canvg: typeof CanvgClass }> | null = null
function loadCanvg() {
  canvgModulePromise ??= import('canvg')
  return canvgModulePromise
}

/**
 * Serializa `svg` para uma imagem PNG (Tarefa 15, decisão 4), a
 * `VISUAL_EXPORT.PNG_SCALE`x de resolução, fundo branco sólido.
 *
 * Usa `canvg` (desenha o SVG no `<canvas>` replicando cada elemento com as
 * APIs de 2D, incluindo `fillText`) em vez de `Image` + `drawImage`: uma
 * imagem SVG carregada por `<img src="blob:...">` fica num contexto de
 * documento isolado que NÃO vê os tipos de letra da pauta (`Bravura`,
 * `Academico`, Tarefa 13) registados via `document.fonts` — o resultado
 * seria notas e claves como caixas vazias. O `<canvas>` do `canvg`, por
 * viver no documento principal, tem acesso normal a `document.fonts`, sem
 * ser preciso extrair e embutir os bytes do tipo de letra.
 */
export async function svgToPng(svg: SVGSVGElement): Promise<Blob> {
  const { Canvg } = await loadCanvg()
  const prepared = embedSvgColors(svg)
  const { width, height } = svgSize(prepared)

  const background = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
  background.setAttribute('width', '100%')
  background.setAttribute('height', '100%')
  background.setAttribute('fill', VISUAL_EXPORT.BACKGROUND_COLOR)
  prepared.insertBefore(background, prepared.firstChild)

  const svgString = new XMLSerializer().serializeToString(prepared)

  const canvas = document.createElement('canvas')
  canvas.width = Math.max(Math.round(width * VISUAL_EXPORT.PNG_SCALE), 1)
  canvas.height = Math.max(Math.round(height * VISUAL_EXPORT.PNG_SCALE), 1)

  const context = canvas.getContext('2d')
  if (!context) throw new Error('Canvas 2D indisponível')

  const renderer = await Canvg.from(context, svgString)
  await renderer.render({
    ignoreAnimation: true,
    ignoreMouse: true,
    // Sem isto, o `canvg` repõe `canvas.width`/`height` para o tamanho
    // nativo do SVG na primeira passagem (lido do `width`/`height` do
    // elemento), ignorando o `canvas.width`/`height` já definidos acima —
    // é o que permite a resolução 2x (`scaleWidth`/`scaleHeight` abaixo só
    // controlam a escala do DESENHO dentro do canvas, não o canvas em si).
    ignoreDimensions: true,
    scaleWidth: canvas.width,
    scaleHeight: canvas.height,
  })

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob)
      else reject(new Error('Falha ao gerar o PNG'))
    }, 'image/png')
  })
}
