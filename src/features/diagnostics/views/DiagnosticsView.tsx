import { useState } from 'react'
import { Alert, Button, IconButton } from '@/components'
import { ChevronLeftIcon } from '@/components/icons'
import { useDiagnostics } from '@/features/diagnostics/useDiagnostics'
import { shareOrDownload } from '@/features/export/shareOrDownload'
import { diagnostics } from '@/strings'
import styles from './DiagnosticsView.module.css'

export interface DiagnosticsViewProps {
  onClose: () => void
}

/**
 * Ecrã de diagnóstico — Tarefa 21, Âmbito técnico. Acesso discreto (fora do
 * fluxo principal, ver `App.tsx`), sem router (mesma convenção da Tarefa 16
 * para `LibraryView`): `App.tsx` decide quando esta view existe por cima do
 * ecrã principal.
 */
export function DiagnosticsView({ onClose }: DiagnosticsViewProps) {
  const {
    entries,
    loading,
    device,
    telemetryConsent,
    setTelemetryConsentValue,
    clear,
    exportAsText,
  } = useDiagnostics()
  const [confirmingClear, setConfirmingClear] = useState(false)
  const [copied, setCopied] = useState(false)

  async function handleCopy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(exportAsText())
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Sem `navigator.clipboard` (contexto não seguro, browser antigo) —
      // o botão de exportar como ficheiro continua a funcionar.
    }
  }

  async function handleExport(): Promise<void> {
    const blob = new Blob([exportAsText()], { type: 'text/plain' })
    await shareOrDownload(blob, 'pauta-diagnostico.txt', blob.type)
  }

  async function handleClear(): Promise<void> {
    await clear()
    setConfirmingClear(false)
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <IconButton
          icon={<ChevronLeftIcon />}
          label={diagnostics.closeButton}
          variant="ghost"
          onClick={onClose}
        />
        <h2 className={styles.title}>{diagnostics.title}</h2>
      </div>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>{diagnostics.deviceInfoTitle}</h3>
        <div className={styles.deviceInfo}>
          <span className={styles.deviceInfoLabel}>{diagnostics.appVersionLabel}</span>
          <span className={styles.deviceInfoValue}>{device.appVersion}</span>
          <span className={styles.deviceInfoLabel}>{diagnostics.deviceTierLabel}</span>
          <span className={styles.deviceInfoValue}>
            {device.deviceTier === 'high' ? diagnostics.deviceTierHigh : diagnostics.deviceTierLow}
          </span>
          <span className={styles.deviceInfoLabel}>{diagnostics.userAgentLabel}</span>
          <span className={styles.deviceInfoValue}>{device.userAgent}</span>
        </div>
      </div>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>{diagnostics.errorLogTitle}</h3>
        <Alert tone="info">{diagnostics.errorLogNotice}</Alert>

        {!loading && entries.length === 0 && (
          <p className={styles.empty}>{diagnostics.errorLogEmpty}</p>
        )}

        {entries.length > 0 && <pre className={styles.log}>{exportAsText()}</pre>}

        <div className={styles.actions}>
          <Button
            variant="secondary"
            onClick={() => void handleCopy()}
            disabled={entries.length === 0}
          >
            {copied ? diagnostics.copiedNotice : diagnostics.copyButton}
          </Button>
          <Button
            variant="secondary"
            onClick={() => void handleExport()}
            disabled={entries.length === 0}
          >
            {diagnostics.exportButton}
          </Button>

          {!confirmingClear ? (
            <Button
              variant="danger"
              onClick={() => setConfirmingClear(true)}
              disabled={entries.length === 0}
            >
              {diagnostics.clearButton}
            </Button>
          ) : (
            <>
              <span>{diagnostics.clearConfirmBody}</span>
              <Button variant="secondary" onClick={() => setConfirmingClear(false)}>
                {diagnostics.clearConfirmCancel}
              </Button>
              <Button variant="danger" onClick={() => void handleClear()}>
                {diagnostics.clearConfirmAction}
              </Button>
            </>
          )}
        </div>
      </div>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>{diagnostics.telemetryTitle}</h3>
        <Alert tone="info">{diagnostics.telemetryBody}</Alert>
        <label className={styles.consentRow}>
          <input
            type="checkbox"
            checked={telemetryConsent}
            onChange={(event) => setTelemetryConsentValue(event.target.checked)}
          />
          {diagnostics.telemetryConsentLabel}
        </label>
      </div>
    </div>
  )
}
