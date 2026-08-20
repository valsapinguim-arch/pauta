import { describe, expect, it, vi } from 'vitest'
import { OperationTimeoutError, withTimeout } from './withTimeout'

describe('withTimeout', () => {
  it('resolve normalmente quando a promessa é mais rápida que o limite', async () => {
    await expect(withTimeout(Promise.resolve('ok'), 1000, 'teste')).resolves.toBe('ok')
  })

  it('propaga a rejeição original quando a promessa falha antes do limite', async () => {
    await expect(withTimeout(Promise.reject(new Error('falhou')), 1000, 'teste')).rejects.toThrow(
      'falhou',
    )
  })

  it('rejeita com OperationTimeoutError quando a promessa nunca resolve (decisão 6)', async () => {
    vi.useFakeTimers()
    const never = new Promise(() => {})
    const result = withTimeout(never, 1000, 'escrita em IndexedDB')
    const assertion = expect(result).rejects.toBeInstanceOf(OperationTimeoutError)
    await vi.advanceTimersByTimeAsync(1001)
    await assertion
    vi.useRealTimers()
  })
})
