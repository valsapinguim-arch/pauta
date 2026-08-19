import { PLAYBACK } from '@/lib/playback/constants'

/**
 * Sintetizador da reprodução (Tarefa 14, decisão 2) — osciladores do Web
 * Audio, sem samples de instrumento. Único ficheiro de `@/features/notation`
 * autorizado a tocar em `AudioContext`/`OscillatorNode`/`GainNode`; a lógica
 * de QUANDO agendar (o `usePlayback`) e a de O QUE agendar (`@/lib/playback`)
 * ficam de fora, para que só isto dependa mesmo do Web Audio.
 */
export interface ScheduledNode {
  oscillator: OscillatorNode
  gain: GainNode
}

/**
 * Agenda uma nota a partir de `when` (relógio do `AudioContext`, decisão 3),
 * com envelope de ataque/decaimento curto (Notas da Tarefa 14: um oscilador
 * que começa ou para de forma abrupta estala).
 */
export function scheduleNoteEvent(
  audioContext: AudioContext,
  destination: AudioNode,
  when: number,
  durationSec: number,
  frequencyHz: number,
): ScheduledNode {
  const oscillator = audioContext.createOscillator()
  oscillator.type = 'triangle'
  oscillator.frequency.setValueAtTime(frequencyHz, when)

  const gain = audioContext.createGain()
  const attackEnd = when + PLAYBACK.ATTACK_SEC
  const releaseStart = when + Math.max(durationSec - PLAYBACK.RELEASE_SEC, PLAYBACK.ATTACK_SEC)
  const stopAt = when + durationSec

  gain.gain.setValueAtTime(0, when)
  gain.gain.linearRampToValueAtTime(PLAYBACK.PEAK_GAIN, attackEnd)
  gain.gain.setValueAtTime(PLAYBACK.PEAK_GAIN, releaseStart)
  gain.gain.linearRampToValueAtTime(0, stopAt)

  oscillator.connect(gain)
  gain.connect(destination)
  oscillator.start(when)
  oscillator.stop(stopAt)

  return { oscillator, gain }
}

/** Clique do metrónomo (decisão 7) — curto, sem ataque perceptível: não é
 *  uma nota, é um marcador de tempo. */
export function scheduleMetronomeClick(
  audioContext: AudioContext,
  destination: AudioNode,
  when: number,
  accent: boolean,
): ScheduledNode {
  const oscillator = audioContext.createOscillator()
  oscillator.type = 'square'
  oscillator.frequency.setValueAtTime(
    accent ? PLAYBACK.METRONOME_ACCENT_FREQUENCY_HZ : PLAYBACK.METRONOME_FREQUENCY_HZ,
    when,
  )

  const gain = audioContext.createGain()
  const stopAt = when + PLAYBACK.METRONOME_CLICK_SEC

  gain.gain.setValueAtTime(PLAYBACK.METRONOME_GAIN, when)
  gain.gain.exponentialRampToValueAtTime(0.0001, stopAt)

  oscillator.connect(gain)
  gain.connect(destination)
  oscillator.start(when)
  oscillator.stop(stopAt)

  return { oscillator, gain }
}

/** Desliga e desconecta um nó agendado, mesmo que o seu início ainda esteja
 *  no futuro (decisão 8) — chamado a partir de `stop()`, `pause()`, ao mudar
 *  a velocidade a meio e ao desmontar `usePlayback`. */
export function disconnectScheduledNode(node: ScheduledNode): void {
  try {
    node.oscillator.stop()
  } catch {
    /* já tinha parado — nada a fazer */
  }
  node.oscillator.disconnect()
  node.gain.disconnect()
}
