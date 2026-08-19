import { VISUAL_EXPORT } from './constants'

/** Par de tipos de letra ativado por `VexFlow.setFonts('Bravura',
 *  'Academico')` (Tarefa 13) — Bravura para os glifos musicais (SMuFL),
 *  Academico como recurso para o que Bravura não tem. O SVG ao vivo herda
 *  isto de algures fora do alcance de `document.styleSheets` e dos
 *  atributos inspecionáveis (nem uma regra CSS nem um `style` em nenhum
 *  antecessor do `<text>` o explicam) — por isso fica reafirmado
 *  explicitamente aqui em cada `<text>` do clone, em vez de se confiar em
 *  o clone continuar a herdar o que quer que o fizesse funcionar no ecrã. */
const MUSIC_FONT_STACK = 'Bravura, Academico'

/** 1pt = 4/3px. O VexFlow escreve `font-size="30pt"` em cada `<text>`, mas
 *  o `svg2pdf.js` só sabe ler `em`, `px` e números sem unidade — em `pt`
 *  devolve 0 (`toPixels`, `svg2pdf.es.js`), e um texto a tamanho zero é
 *  desenhado sem sair nada. Daí a conversão explícita para px aqui: a
 *  pauta saía com pentagrama, hastes e ligaduras (que são caminhos) mas sem
 *  claves nem cabeças de nota (que são texto). */
const PT_TO_PX = 4 / 3

function normalizeFontSize(text: SVGTextElement): void {
  const fontSize = text.getAttribute('font-size')
  const match = fontSize?.match(/^([\d.]+)pt$/)
  if (match?.[1]) {
    text.setAttribute('font-size', String(parseFloat(match[1]) * PT_TO_PX))
  }
}

/**
 * Prepara um clone do SVG da pauta para ser serializado isoladamente (PNG e
 * PDF) — Tarefa 15, decisão 4. O SVG ao vivo herda a cor de `currentColor`
 * de `ScoreView.module.css` (`.canvas svg { fill: currentColor; stroke:
 * currentColor }`, Tarefa 13, Notas); fora do DOM, sem essa folha de estilo
 * externa, essa regra deixa de se aplicar e o desenho sairia sem cor
 * nenhuma. Por isso a cor, o tipo de letra e o tamanho do texto ficam
 * embutidos como atributos explícitos no próprio SVG antes de o serializar
 * — nunca a depender de CSS externo (guardrail em `AGENTS.md`).
 *
 * Usa sempre tinta escura sobre fundo branco (`VISUAL_EXPORT`), não a cor
 * do tema atual do ecrã: um ficheiro exportado para imprimir ou abrir
 * noutro programa não deve ficar preso ao modo escuro de quem o exportou.
 *
 * Remove também o cursor de reprodução (Tarefa 14), se estiver visível — um
 * ficheiro exportado não deve levar o realce de "nota a tocar agora".
 *
 * Devolve um clone; o SVG no ecrã não é tocado.
 */
export function embedSvgColors(svg: SVGSVGElement): SVGSVGElement {
  const clone = svg.cloneNode(true) as SVGSVGElement

  clone.setAttribute('fill', VISUAL_EXPORT.INK_COLOR)
  clone.setAttribute('stroke', VISUAL_EXPORT.INK_COLOR)
  clone.style.color = VISUAL_EXPORT.INK_COLOR
  clone.style.fontFamily = MUSIC_FONT_STACK

  clone.querySelectorAll('text').forEach((text) => {
    text.setAttribute('font-family', MUSIC_FONT_STACK)
    normalizeFontSize(text)
  })

  clone.querySelector('.cursor')?.remove()

  return clone
}
