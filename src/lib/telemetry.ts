/**
 * Telemetria — Tarefa 21, decisões 7, 8 e 9.
 *
 * Opt-in, desligada por omissão, SEM destino configurado nesta fase: nada é
 * enviado para lado nenhum. Isto prepara só a fila de eventos e a
 * verificação da lista permitida, para o dia em que se decidir ligar um
 * serviço — ver AGENTS.md para o que isso vai exigir (escolher o serviço,
 * abrir a CSP, atualizar `docs/architecture.md`/`README.md`).
 *
 * Nenhum identificador de utilizador ou de instalação é gerado nem guardado
 * (decisão 9) — um evento não tem `userId` nem equivalente, mesmo anónimo.
 *
 * O consentimento em si (persistido em `localStorage`) vive em
 * `@/features/diagnostics/telemetryConsent`, não aqui: `@/lib` é puro, sem
 * acesso a armazenamento (guardrail em `AGENTS.md`) — `recordEvent` recebe o
 * consentimento já lido, em vez de o ler sozinho.
 */

/** Lista fechada de campos permitidos (decisão 8) — nunca áudio, notas,
 *  alturas, títulos, nomes de ficheiro ou identificadores. `recordEvent`
 *  rejeita qualquer evento com um campo fora daqui. */
export interface TelemetryEvent {
  /** Código do catálogo (`@/lib/errors`), quando o evento é sobre uma falha. */
  errorCode?: string
  /** Duração do áudio, já em intervalo (ex.: "10-30s"), nunca o valor exato
   *  nem o áudio em si. */
  audioDurationBucket?: string
  inputType?: 'microphone' | 'file'
  /** "low"/"high" — a mesma classificação grosseira da Tarefa 19, nunca o
   *  valor bruto de `hardwareConcurrency`/`deviceMemory`. */
  deviceTier?: 'low' | 'high'
  appVersion?: string
  /** Tempo de processamento, também em intervalo (ex.: "1-5s"). */
  processingTimeBucket?: string
}

const ALLOWED_FIELDS: ReadonlySet<string> = new Set<keyof TelemetryEvent>([
  'errorCode',
  'audioDurationBucket',
  'inputType',
  'deviceTier',
  'appVersion',
  'processingTimeBucket',
])

/** Erro nomeado — nunca falha silenciosamente: um campo fora da lista
 *  permitida é um erro de programação (uma feature a tentar enviar um dado
 *  proibido), não um caso a ignorar. */
export class TelemetryFieldNotAllowedError extends Error {
  constructor(field: string) {
    super(`Campo de telemetria não permitido: "${field}" (ver decisão 8, Tarefa 21)`)
    this.name = 'TelemetryFieldNotAllowedError'
  }
}

function assertAllowedFields(event: TelemetryEvent): void {
  for (const field of Object.keys(event)) {
    if (!ALLOWED_FIELDS.has(field)) {
      throw new TelemetryFieldNotAllowedError(field)
    }
  }
}

/** Fila em memória, nunca persistida nem enviada (decisão 7) — existe só
 *  para se poder inspecionar/testar que os eventos aceites são exatamente os
 *  esperados. Perdida ao recarregar a página, de propósito: não há destino
 *  que precise dela sobreviver a isso. */
const queue: TelemetryEvent[] = []

/**
 * Regista um evento. Sem consentimento (decisão 7), o evento é descartado
 * antes de entrar na fila — mas a validação da lista permitida corre sempre,
 * mesmo sem consentimento, porque um campo proibido é um bug a apanhar em
 * desenvolvimento independentemente do estado do consentimento do
 * utilizador a testar. `consent` vem de
 * `@/features/diagnostics/telemetryConsent` — este módulo não sabe ler
 * armazenamento nenhum.
 */
export function recordEvent(event: TelemetryEvent, consent: boolean): void {
  assertAllowedFields(event)
  if (!consent) return
  queue.push(event)
}

/** Só para diagnóstico/teste — nunca para enviar para lado nenhum (não há
 *  destino, decisão 7). */
export function getQueuedEvents(): readonly TelemetryEvent[] {
  return queue
}

/** Exportada só para teste. */
export function clearQueue(): void {
  queue.length = 0
}
