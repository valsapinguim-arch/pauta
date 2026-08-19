/** Tempo suficiente para o browser iniciar o download a partir do URL do
 *  objeto antes de o revogar — revogar de imediato pode cortar o download
 *  em alguns browsers. */
const REVOKE_DELAY_MS = 1000

/**
 * Partilha `blob` pelo sistema quando o dispositivo consegue (`decisão 6,
 * Tarefa 15) — telefone, sobretudo: enviar diretamente para uma conversa ou
 * email é o que se quer, a pasta de transferências é um beco sem saída.
 * Descarrega em alternativa (desktop, ou quando a partilha falha). Decidido
 * por deteção de capacidade (`navigator.canShare`), nunca por _user agent_
 * (guardrail em `AGENTS.md`).
 */
export async function shareOrDownload(
  blob: Blob,
  filename: string,
  mimeType: string,
): Promise<void> {
  const file = new File([blob], filename, { type: mimeType })

  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file] })
      return
    } catch (error) {
      // Utilizador cancelou o postal de partilha — não é uma falha,
      // e não deve cair para download por baixo (seria surpreendente
      // descarregar um ficheiro depois de se ter cancelado a partilha
      // dele).
      if (error instanceof Error && error.name === 'AbortError') return
      // Qualquer outro motivo de falha (ex.: sem alvo disponível): cai
      // para download, tratado abaixo.
    }
  }

  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), REVOKE_DELAY_MS)
}
