import { describe, expect, it } from 'vitest'
import { mapGetUserMediaError } from './useMicrophone'

describe('mapGetUserMediaError', () => {
  it.each([
    ['NotAllowedError', 'permission-denied'],
    ['SecurityError', 'permission-denied'],
    ['NotFoundError', 'no-microphone'],
    ['DevicesNotFoundError', 'no-microphone'],
    ['NotReadableError', 'microphone-busy'],
    ['TrackStartError', 'microphone-busy'],
    ['AbortError', 'microphone-busy'],
    ['SomeUnknownFutureError', 'not-supported'],
  ] as const)('DOMException(%s) → %s', (name, expected) => {
    expect(mapGetUserMediaError(new DOMException('mensagem', name))).toBe(expected)
  })

  it('erro que não é DOMException cai em not-supported', () => {
    expect(mapGetUserMediaError(new Error('qualquer coisa'))).toBe('not-supported')
    expect(mapGetUserMediaError('string qualquer')).toBe('not-supported')
    expect(mapGetUserMediaError(null)).toBe('not-supported')
  })
})
