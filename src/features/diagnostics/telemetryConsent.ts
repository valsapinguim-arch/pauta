/**
 * Consentimento de telemetria — Tarefa 21, decisão 7. Persistido em
 * `localStorage`, por isso vive numa feature, não em `@/lib/telemetry`
 * (`@/lib` é puro, sem acesso a armazenamento — guardrail em `AGENTS.md`).
 */

const CONSENT_STORAGE_KEY = 'pauta.telemetry.consent'

/** Desligada por omissão — qualquer valor que não seja exatamente `'true'`
 *  conta como recusa, incluindo `localStorage` indisponível (modo privado,
 *  quota esgotada). */
export function getTelemetryConsent(): boolean {
  try {
    return localStorage.getItem(CONSENT_STORAGE_KEY) === 'true'
  } catch {
    return false
  }
}

export function setTelemetryConsent(consent: boolean): void {
  try {
    localStorage.setItem(CONSENT_STORAGE_KEY, consent ? 'true' : 'false')
  } catch {
    // Sem consequência — falha a favor de "desligado" na próxima leitura.
  }
}
