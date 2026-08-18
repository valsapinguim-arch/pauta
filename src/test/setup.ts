import { cleanup } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { afterEach } from 'vitest'

/* Sem `test.globals: true` no vitest.config.ts (decisão deliberada: `describe`/
   `it`/`expect` importados explicitamente, sem globais mágicos) — a limpeza
   automática entre testes do Testing Library depende de detetar `afterEach`
   como global, o que não acontece aqui. Sem isto, cada `render()` acumulava no
   `document.body` do teste anterior e `getByRole` passava a encontrar
   duplicados. */
afterEach(() => {
  cleanup()
})

/* jsdom não implementa a API de Pointer Events usada pelo Radix Toast para o
   gesto de arrastar (swipe-to-dismiss) — sem isto, `hasPointerCapture` é
   `undefined` e qualquer teste que dispare um evento de ponteiro sobre um
   `Toast` rebenta com "target.hasPointerCapture is not a function". Lacuna
   conhecida do jsdom, não um bug do componente; ver
   https://github.com/jsdom/jsdom/issues/3029.
   Este `setupFiles` corre para TODOS os testes, incluindo os de `@/lib` em
   ambiente `node` — onde `Element` nem existe. Daqui a guarda. */
if (typeof Element !== 'undefined') {
  if (!Element.prototype.hasPointerCapture) {
    Element.prototype.hasPointerCapture = () => false
  }
  if (!Element.prototype.setPointerCapture) {
    Element.prototype.setPointerCapture = () => {}
  }
  if (!Element.prototype.releasePointerCapture) {
    Element.prototype.releasePointerCapture = () => {}
  }
  if (!Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = () => {}
  }
}
