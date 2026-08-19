import { vi } from 'vitest'

/**
 * Duplo de teste do `Worker` nativo — Tarefa 20, decisão 4: a maioria dos
 * testes não deve carregar TensorFlow.js nem o modelo real (custa
 * segundos); só os de regressão (`e2e/regression.spec.ts`, com Playwright
 * e inferência a sério) o fazem. `useTranscriber`/`usePreprocessAudio`
 * (Tarefas 6/7) só falam com o worker por `postMessage`/`onmessage` — este
 * duplo intercepta exatamente essa fronteira, sem tocar no que corre
 * dentro do worker de verdade.
 *
 * `postMessage` é espiado (`vi.fn`) para os testes poderem verificar o
 * pedido enviado; `emit` simula uma resposta do worker chamando
 * `onmessage` como o browser chamaria.
 */
export class FakeWorker {
  onmessage: ((event: MessageEvent) => void) | null = null
  onerror: ((event: ErrorEvent) => void) | null = null
  onmessageerror: ((event: MessageEvent) => void) | null = null
  postMessage = vi.fn()
  terminate = vi.fn()

  emit(data: unknown): void {
    this.onmessage?.({ data } as MessageEvent)
  }

  emitError(): void {
    this.onerror?.({} as ErrorEvent)
  }
}

/**
 * Substitui o construtor global `Worker` por um que devolve (e regista)
 * instâncias de `FakeWorker` — chamar em `beforeEach`. `instances` fica
 * acessível através do valor devolvido para o teste apanhar a instância
 * criada por `new Worker(...)` dentro do hook em teste, sem o hook saber
 * que está a falar com um duplo.
 */
export function installFakeWorker(): { instances: FakeWorker[] } {
  const instances: FakeWorker[] = []

  vi.stubGlobal('Worker', function FakeWorkerConstructor(this: unknown) {
    const instance = new FakeWorker()
    instances.push(instance)
    return instance
  })

  return { instances }
}
