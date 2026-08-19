const XML_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&apos;',
}

/** Escapa os cinco caracteres especiais do XML (Tarefa 15, Guardrails) —
 *  todo o texto inserido no MusicXML (`toMusicXml.ts`) passa por aqui,
 *  nunca por interpolação direta na string. */
export function escapeXml(text: string): string {
  return text.replace(/[&<>"']/g, (char) => XML_ESCAPES[char] as string)
}
