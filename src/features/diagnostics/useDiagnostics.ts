import { useCallback, useEffect, useState } from 'react'
import { detectDeviceCapability } from '@/features/capture/deviceCapability'
import { chooseDurationLimitMs, MIN_DURATION_MS } from '@/lib/performance/durationLimit'
import {
  clearErrorLog,
  formatErrorLogAsText,
  listErrorLog,
  type ErrorLogEntry,
} from '@/features/diagnostics/errorLog'
import { getTelemetryConsent, setTelemetryConsent } from '@/features/diagnostics/telemetryConsent'

export interface DeviceInfo {
  appVersion: string
  /** "low"/"high" — mesma classificação grosseira da Tarefa 19, decisão 4;
   *  nunca os números brutos (`hardwareConcurrency`/`deviceMemory`) na
   *  interface, só o suficiente para explicar por que razão o limite de
   *  duração é o que é. */
  deviceTier: 'low' | 'high'
  userAgent: string
}

export interface DiagnosticsApi {
  entries: ErrorLogEntry[]
  loading: boolean
  device: DeviceInfo
  telemetryConsent: boolean
  setTelemetryConsentValue: (consent: boolean) => void
  refresh: () => void
  clear: () => Promise<void>
  exportAsText: () => string
}

function readDeviceInfo(): DeviceInfo {
  const capability = detectDeviceCapability()
  const deviceTier = chooseDurationLimitMs(capability) <= MIN_DURATION_MS ? 'low' : 'high'
  return {
    appVersion: __APP_VERSION__,
    deviceTier,
    userAgent: navigator.userAgent,
  }
}

/**
 * Ponte entre o registo local de erros (`@/features/diagnostics/errorLog`),
 * o consentimento de telemetria (`@/features/diagnostics/telemetryConsent`)
 * e `DiagnosticsView` — Tarefa 21, Âmbito técnico.
 */
export function useDiagnostics(): DiagnosticsApi {
  const [entries, setEntries] = useState<ErrorLogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [telemetryConsent, setTelemetryConsentState] = useState(getTelemetryConsent)
  const [device] = useState(readDeviceInfo)

  useEffect(() => {
    let cancelled = false
    listErrorLog()
      .then((loaded) => {
        if (!cancelled) setEntries(loaded)
      })
      .catch(() => {
        if (!cancelled) setEntries([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const refresh = useCallback(() => {
    setLoading(true)
    listErrorLog()
      .then(setEntries)
      .catch(() => setEntries([]))
      .finally(() => setLoading(false))
  }, [])

  const clear = useCallback(async () => {
    await clearErrorLog()
    setEntries([])
  }, [])

  const setTelemetryConsentValue = useCallback((consent: boolean) => {
    setTelemetryConsent(consent)
    setTelemetryConsentState(consent)
  }, [])

  const exportAsText = useCallback(() => formatErrorLogAsText(entries), [entries])

  return {
    entries,
    loading,
    device,
    telemetryConsent,
    setTelemetryConsentValue,
    refresh,
    clear,
    exportAsText,
  }
}
