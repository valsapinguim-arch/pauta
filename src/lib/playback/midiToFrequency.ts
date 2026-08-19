/** Nota MIDI → frequência em Hz, afinação de referência A4 = 440 Hz (MIDI 69).
 *  Pura aritmética de temperamento igual — não depende de `TempoMap` nem de
 *  velocidade (decisão 6 da Tarefa 14: a velocidade nunca altera altura). */
export function midiToFrequency(pitchMidi: number): number {
  return 440 * 2 ** ((pitchMidi - 69) / 12)
}
