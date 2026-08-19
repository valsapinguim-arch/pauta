/**
 * Erro nomeado lançado quando uma promessa não resolve a tempo — Tarefa 21,
 * decisão 6. Mapeia sempre para o código de catálogo `operation-timeout`
 * (`@/lib/errors`); quem apanha isto decide se marca a operação como
 * recuperável (quase sempre sim — "tentar de novo" chega).
 */
export class OperationTimeoutError extends Error {
  constructor(label: string) {
    super(`Operação "${label}" não respondeu a tempo`)
    this.name = 'OperationTimeoutError'
  }
}

/**
 * Envolve uma promessa com um limite de tempo — usada pelas operações
 * assíncronas baseadas em promessa (escrita em IndexedDB, Tarefa 16) que a
 * decisão 6 pede. As baseadas em worker (pré-processamento, inferência) não
 * usam isto: têm o seu próprio ciclo de vida (`postMessage`/`onmessage`) e
 * implementam o limite diretamente em `usePreprocessAudio`/`useTranscriber`,
 * onde também precisam de terminar o worker, não só rejeitar uma promessa.
 */
export function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new OperationTimeoutError(label)), ms)
    promise.then(
      (value) => {
        clearTimeout(timer)
        resolve(value)
      },
      (error: unknown) => {
        clearTimeout(timer)
        reject(error)
      },
    )
  })
}
