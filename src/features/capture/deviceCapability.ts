import type { DeviceCapability } from '@/lib/performance/durationLimit'

/** `navigator.deviceMemory` não está no `lib.dom.d.ts` (API não normalizada,
 *  só Chromium) — declarada localmente porque só é lida aqui. */
interface NavigatorWithDeviceMemory extends Navigator {
  deviceMemory?: number
}

/**
 * Lê a deteção grosseira de capacidade do `navigator` (Tarefa 19, decisão
 * 4) — a única função desta app que lê `hardwareConcurrency`/
 * `deviceMemory`; a decisão do que fazer com os números é
 * `chooseDurationLimitMs` (`@/lib/performance/durationLimit`), pura e sem
 * DOM.
 */
export function detectDeviceCapability(): DeviceCapability {
  const nav = navigator as NavigatorWithDeviceMemory
  return {
    hardwareConcurrency:
      typeof nav.hardwareConcurrency === 'number' ? nav.hardwareConcurrency : null,
    deviceMemoryGb: typeof nav.deviceMemory === 'number' ? nav.deviceMemory : null,
  }
}
