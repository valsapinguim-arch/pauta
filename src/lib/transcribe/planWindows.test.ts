import { describe, expect, it } from 'vitest'
import { planWindows } from './planWindows'

const SAMPLE_RATE = 22_050

describe('planWindows', () => {
  it('áudio mais curto do que uma janela devolve uma só janela a cobrir tudo', () => {
    const totalSamples = 5 * SAMPLE_RATE // 5s
    const windows = planWindows(totalSamples, SAMPLE_RATE, 10, 1)

    expect(windows).toEqual([
      { startSample: 0, endSample: totalSamples, offsetSec: 0, index: 0, count: 1 },
    ])
  })

  it('divide áudio mais longo em janelas sobrepostas que cobrem tudo', () => {
    const totalSamples = 25 * SAMPLE_RATE // 25s
    const windows = planWindows(totalSamples, SAMPLE_RATE, 10, 1)

    expect(windows.length).toBeGreaterThan(1)
    expect(windows[0]?.startSample).toBe(0)
    expect(windows.at(-1)?.endSample).toBe(totalSamples)

    // cada janela seguinte começa antes do fim da anterior — sobreposição real.
    for (let i = 1; i < windows.length; i += 1) {
      const previous = windows[i - 1]
      const current = windows[i]
      expect(current?.startSample).toBeLessThan(previous?.endSample as number)
    }

    // `count` e `index` consistentes com o array final.
    windows.forEach((window, index) => {
      expect(window.index).toBe(index)
      expect(window.count).toBe(windows.length)
    })
  })

  it('sem amostras devolve nenhuma janela', () => {
    expect(planWindows(0, SAMPLE_RATE, 10, 1)).toEqual([])
  })
})
