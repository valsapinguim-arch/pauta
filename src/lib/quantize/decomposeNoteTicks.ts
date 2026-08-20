import { largestNoteDurationAtMost, type NoteDuration } from './noteDurations'

/**
 * Parte uma duração arbitrária na menor sequência de figuras EXATAS que a
 * soma — Tarefa 21, correção de raiz.
 *
 * Existe porque `validateScoreDocument` (Tarefa 12, decisão 6) soma cada
 * compasso a partir da FIGURA de cada elemento (`noteType`/`dots`), não do
 * seu `durationTicks`. Enquanto as duas contas puderem divergir, um
 * documento pode ter as durações certas e a validação falhar à mesma — foi
 * assim que uma nota de 600 ticks com figura de semínima (480) fez um
 * compasso "somar 1800 em vez de 1920", com gravações reais.
 *
 * Devolve `[]` para durações menores do que a menor figura da tabela: não
 * há como as representar, e quem chama tem de decidir o que fazer com isso
 * (tipicamente descartar a nota) em vez de emitir uma figura que mente
 * sobre a sua própria duração.
 */
export function decomposeNoteTicks(durationTicks: number): NoteDuration[] {
  const pieces: NoteDuration[] = []
  let remaining = durationTicks

  while (remaining > 0) {
    const figure = largestNoteDurationAtMost(remaining)
    // `largestNoteDurationAtMost` promove a menor figura quando nada cabe
    // (decisão 5, "nunca eliminar") — aqui isso significaria devolver uma
    // figura maior do que o pedido, exatamente a mentira que esta função
    // existe para evitar.
    if (figure.ticks > remaining) break
    pieces.push(figure)
    remaining -= figure.ticks
  }

  return pieces
}
