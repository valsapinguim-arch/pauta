export interface AudioWindow {
  startSample: number
  endSample: number
  /** Início da janela em segundos, dentro do áudio completo — soma-se ao
   *  início de cada nota transcrita nesta janela para a repor na linha do
   *  tempo inteira (Tarefa 19, decisão 5). */
  offsetSec: number
  index: number
  count: number
}

/**
 * Divide `totalSamples` em janelas de `windowSec` com `overlapSec` de
 * sobreposição entre consecutivas — Tarefa 19, decisão 5. Pura: só
 * aritmética, nenhuma chamada ao modelo aqui.
 *
 * Uma sobreposição real (não só um pequeno gap tolerado na fusão) é o que
 * garante que uma nota a meio de uma fronteira é vista inteira por pelo
 * menos uma das duas janelas — sem isso, `mergeWindowedNotes` teria dois
 * fragmentos parciais para fundir em vez de pelo menos uma versão completa.
 *
 * Áudio mais curto do que uma janela devolve uma só janela a cobrir tudo —
 * é o caso "processamento num só bloco", sem sobreposição nenhuma a fundir.
 */
export function planWindows(
  totalSamples: number,
  sampleRate: number,
  windowSec: number,
  overlapSec: number,
): AudioWindow[] {
  if (totalSamples <= 0) return []

  const windowSamples = Math.round(windowSec * sampleRate)
  const overlapSamples = Math.round(overlapSec * sampleRate)
  const stepSamples = Math.max(1, windowSamples - overlapSamples)

  if (totalSamples <= windowSamples) {
    return [{ startSample: 0, endSample: totalSamples, offsetSec: 0, index: 0, count: 1 }]
  }

  const starts: number[] = []
  for (let start = 0; start < totalSamples; start += stepSamples) {
    starts.push(start)
    if (start + windowSamples >= totalSamples) break
  }

  return starts.map((startSample, index) => ({
    startSample,
    endSample: Math.min(startSample + windowSamples, totalSamples),
    offsetSec: startSample / sampleRate,
    index,
    count: starts.length,
  }))
}
