/**
 * Reduz um áudio multicanal a um só `Float32Array`, pela média das amostras
 * de cada canal — ver Tarefa 5, Âmbito técnico.
 *
 * A importação de ficheiro (Tarefa 5) usa `AudioContext.decodeAudioData`, que
 * devolve um `AudioBuffer` com N canais (tipicamente 2, num ficheiro
 * estéreo). O resto do pipeline só aceita um `Float32Array` — é o formato de
 * saída que converge com a captura por microfone (Tarefa 4), cujo worklet já
 * só lê um canal. Esta função é o que faz um ficheiro estéreo caber nesse
 * mesmo formato.
 */
export function downmixToMono(channels: Float32Array[]): Float32Array {
  if (channels.length === 0) return new Float32Array(0)
  if (channels.length === 1) return channels[0] as Float32Array

  const length = (channels[0] as Float32Array).length
  const mixed = new Float32Array(length)
  for (let i = 0; i < length; i += 1) {
    let sum = 0
    for (const channel of channels) {
      sum += channel[i] as number
    }
    mixed[i] = sum / channels.length
  }
  return mixed
}
