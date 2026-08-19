/**
 * Limite de duração por capacidade do dispositivo — Tarefa 19, decisão 4.
 * Pura: recebe os números já lidos do `navigator` (a leitura em si vive em
 * `@/features/capture/deviceCapability`, que não é `@/lib`), nunca lê o
 * `navigator` diretamente.
 */
export interface DeviceCapability {
  /** `navigator.hardwareConcurrency` — `null` quando indisponível. */
  hardwareConcurrency: number | null
  /** `navigator.deviceMemory` em GB — API não normalizada, indisponível em
   *  Firefox e Safari; `null` nesse caso. */
  deviceMemoryGb: number | null
}

/** Teto absoluto (Tarefa 4, decisão 3) — nunca se sobe acima disto, só se
 *  desce por dispositivo. **Provisório**: a decisão 3 desta tarefa pede
 *  este número validado ou corrigido com medições reais em três níveis de
 *  dispositivo; não foi possível medir em dispositivos reais nesta sessão
 *  (ver `docs/performance.md`) — mantido tal como veio das Tarefas 4/5 até
 *  haver medição que o corrija. */
export const MAX_DURATION_MS = 60_000

/** Nunca desce abaixo disto, mesmo no dispositivo mais fraco detetável — um
 *  limite mais curto deixaria de ser útil para gravar uma frase musical
 *  inteira. Igualmente provisório. */
export const MIN_DURATION_MS = 30_000

/** Abaixo disto (GB ou núcleos), considera-se o dispositivo "fraco" para
 *  efeitos do limite — grosseiro de propósito (decisão 4: "a deteção é
 *  grosseira e pode errar, portanto nunca se usa para bloquear"). */
const LOW_MEMORY_GB = 2
const LOW_CONCURRENCY = 2

/**
 * Escolhe o limite de duração a partir de uma deteção grosseira de
 * capacidade — nunca bloqueia nada, só escolhe um valor por omissão
 * (decisão 4); o valor devolvido é sempre mostrado ao utilizador
 * (`idle.maxDurationNotice`). Sem nenhum dos dois sinais disponíveis
 * (Safari/Firefox sem `deviceMemory`, ou um `navigator` de teste), assume-se
 * a gama alta — falhar a favor de permitir, nunca de restringir sem certeza.
 */
export function chooseDurationLimitMs(capability: DeviceCapability): number {
  const isLowMemory =
    capability.deviceMemoryGb !== null && capability.deviceMemoryGb <= LOW_MEMORY_GB
  const isLowConcurrency =
    capability.hardwareConcurrency !== null && capability.hardwareConcurrency <= LOW_CONCURRENCY

  return isLowMemory || isLowConcurrency ? MIN_DURATION_MS : MAX_DURATION_MS
}
