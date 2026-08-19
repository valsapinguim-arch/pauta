/** Extensão de ficheiro final (`.mp3`, `.wav`, ...) — só a última, para não
 *  cortar um nome com pontos a meio (ex.: "Ensaio v2.3.mp3"). */
const EXTENSION_PATTERN = /\.[^./\\]+$/

/** Métodos UTC, não locais: `defaultTitle` tem de dar o mesmo resultado
 *  para o mesmo `createdAtIso` seja qual for o fuso horário da máquina —
 *  senão o teste de determinismo de `buildScoreDocument` (Tarefa 12, Notas)
 *  ficaria a depender de onde corre. */
function formatDateTime(isoString: string): string {
  const date = new Date(isoString)
  const day = String(date.getUTCDate()).padStart(2, '0')
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const hours = String(date.getUTCHours()).padStart(2, '0')
  const minutes = String(date.getUTCMinutes()).padStart(2, '0')
  return `${day}/${month}/${date.getUTCFullYear()}, ${hours}:${minutes}`
}

/**
 * Título por omissão — Tarefa 12, decisão 4: nome do ficheiro (sem
 * extensão) ou "Gravação" com data para o microfone. Nunca vazio.
 *
 * `sourceName` é `ScoreMetadata.sourceName` diretamente (`string | null`,
 * `null` = microfone) — não `AudioSource` de `@/features/session`: `@/lib`
 * não pode importar de uma feature (regra imposta pelo ESLint desde a
 * Tarefa 7), e esta forma já é exatamente o que `metadata` precisa.
 * `createdAtIso` vem de quem chama (nunca `new Date()` aqui dentro) para
 * `buildScoreDocument` continuar determinístico (Tarefa 12, Notas).
 */
export function defaultTitle(sourceName: string | null, createdAtIso: string): string {
  if (sourceName !== null) {
    const withoutExtension = sourceName.replace(EXTENSION_PATTERN, '')
    return withoutExtension || sourceName
  }

  return `Gravação ${formatDateTime(createdAtIso)}`
}
