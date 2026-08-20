// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { getTelemetryConsent, setTelemetryConsent } from './telemetryConsent'

describe('telemetryConsent', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('está desligada por omissão (Tarefa 21, decisão 7)', () => {
    expect(getTelemetryConsent()).toBe(false)
  })

  it('persiste o consentimento entre leituras', () => {
    setTelemetryConsent(true)
    expect(getTelemetryConsent()).toBe(true)
    setTelemetryConsent(false)
    expect(getTelemetryConsent()).toBe(false)
  })
})
