/**
 * Agrupa compassos em linhas por largura disponível (Tarefa 13, decisão 3)
 * — puro, sem VexFlow: recebe a largura mínima já calculada de cada
 * compasso (`Formatter.preCalculateMinTotalWidth`, em `drawScore.ts`) e só
 * decide onde quebrar. Testável sem o motor de desenho.
 *
 * Guloso: acumula compassos numa linha enquanto couberem; a largura de cada
 * compasso inclui já a sua própria margem (`drawScore.ts` soma o espaço de
 * clave/armação/compasso ao primeiro compasso da peça antes de chamar
 * esta função).
 *
 * Um só compasso mais largo do que o contentor fica sozinho na sua linha
 * (nunca se corta um compasso a meio) — a pauta transborda horizontalmente
 * nesse caso, preferível a partir um compasso de forma que não existe em
 * notação nenhuma.
 */
export function computeLineBreaks(measureWidths: number[], containerWidth: number): number[][] {
  if (measureWidths.length === 0) return []

  const lines: number[][] = []
  let currentLine: number[] = []
  let currentWidth = 0

  for (let index = 0; index < measureWidths.length; index++) {
    const width = measureWidths[index] as number
    const wouldExceed = currentLine.length > 0 && currentWidth + width > containerWidth

    if (wouldExceed) {
      lines.push(currentLine)
      currentLine = []
      currentWidth = 0
    }

    currentLine.push(index)
    currentWidth += width
  }

  if (currentLine.length > 0) lines.push(currentLine)

  return lines
}
