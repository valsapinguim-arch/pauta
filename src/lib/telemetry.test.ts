import { beforeEach, describe, expect, it } from 'vitest'
import {
  clearQueue,
  getQueuedEvents,
  recordEvent,
  TelemetryFieldNotAllowedError,
} from './telemetry'

describe('telemetry', () => {
  beforeEach(() => {
    clearQueue()
  })

  it('rejeita um campo fora da lista permitida (decisão 8), com ou sem consentimento', () => {
    expect(() =>
      recordEvent({ errorCode: 'too-quiet', fileName: 'audio.wav' } as never, true),
    ).toThrow(TelemetryFieldNotAllowedError)
  })

  it('nunca deixa entrar dados de áudio, notas ou identificadores mesmo com nome de campo plausível', () => {
    expect(() => recordEvent({ userId: 'abc' } as never, true)).toThrow(
      TelemetryFieldNotAllowedError,
    )
  })

  it('sem consentimento, um evento válido é descartado em vez de guardado na fila', () => {
    recordEvent({ errorCode: 'too-quiet' }, false)
    expect(getQueuedEvents()).toHaveLength(0)
  })

  it('com consentimento, um evento válido entra na fila', () => {
    recordEvent({ errorCode: 'too-quiet', inputType: 'microphone' }, true)
    expect(getQueuedEvents()).toEqual([{ errorCode: 'too-quiet', inputType: 'microphone' }])
  })

  it('a fila nunca é enviada para lado nenhum — não há função de envio exportada', async () => {
    const telemetryModule = await import('./telemetry')
    expect(Object.keys(telemetryModule)).not.toContain('send')
    expect(Object.keys(telemetryModule)).not.toContain('flush')
  })
})
