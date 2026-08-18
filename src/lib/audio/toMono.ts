/**
 * Reduz um áudio multicanal a um só `Float32Array`, pela média das amostras
 * de cada canal — nunca por seleção do primeiro canal (Tarefa 6, decisão 5):
 * em gravações estéreo é frequente um instrumento estar predominantemente
 * num só canal, e usar só o esquerdo pode perder ou atenuar muito a fonte
 * que interessa. A média preserva tudo, ao custo de um possível cancelamento
 * de fase — raro e menor comparado com perder metade do sinal.
 *
 * Partilhada por dois pontos do pipeline: a importação de ficheiro (Tarefa
 * 5) usa-a diretamente sobre os canais de `AudioBuffer.getChannelData`,
 * porque um ficheiro estéreo tem de caber no `Float32Array` único que o
 * resto do pipeline espera. O worker de pré-processamento (Tarefa 6) usa-a
 * de novo como primeiro passo da cadeia `mono → passa-baixo → reamostrar →
 * cortar silêncio → normalizar` — nesse ponto o áudio já chega quase sempre
 * com um só canal (o worklet da Tarefa 4 só lê um canal do microfone), por
 * isso a chamada aí é normalmente um caso trivial (`channels.length === 1`).
 */
export function toMono(channels: Float32Array[]): Float32Array {
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
