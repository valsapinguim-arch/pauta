/// <reference types="audioworklet" />

import { calculateRms } from '@/lib/audio/rms'

/**
 * Processador de gravação — ver Tarefa 4, decisões 1, 2 e 8.
 *
 * Corre na thread de áudio (`AudioWorkletGlobalScope`), não na principal —
 * é o que evita falhas audíveis e a UI a tremer durante a gravação.
 *
 * Os blocos de PCM acumulam aqui dentro, num array; só atravessam a fronteira
 * para a thread principal UMA VEZ, quando `stop` chega (decisão 2 — "gravação
 * em memória... concatenado só no fim"). O que atravessa continuamente é só o
 * nível RMS, no máximo a 30 Hz (decisão 8) — um valor por mensagem, não áudio.
 */

const LEVEL_INTERVAL_SEC = 1 / 30

interface StopMessage {
  type: 'stop'
}

interface LevelMessage {
  type: 'level'
  rms: number
}

interface BufferMessage {
  type: 'buffer'
  samples: Float32Array
}

class RecorderProcessor extends AudioWorkletProcessor {
  private chunks: Float32Array[] = []
  private lastLevelPostTime = 0
  private stopped = false

  constructor() {
    super()
    this.port.onmessage = (event: MessageEvent<StopMessage>) => {
      if (event.data.type === 'stop') {
        this.flush()
      }
    }
  }

  private flush(): void {
    const totalLength = this.chunks.reduce((sum, chunk) => sum + chunk.length, 0)
    const merged = new Float32Array(totalLength)
    let offset = 0
    for (const chunk of this.chunks) {
      merged.set(chunk, offset)
      offset += chunk.length
    }

    this.chunks = []
    this.stopped = true

    const message: BufferMessage = { type: 'buffer', samples: merged }
    this.port.postMessage(message, [merged.buffer])
  }

  process(inputs: Float32Array[][]): boolean {
    if (this.stopped) return false

    const channel = inputs[0]?.[0]
    if (!channel || channel.length === 0) return true

    /* `channel` é reciclado pelo motor de áudio a cada bloco — sem a cópia,
       o array acumulado ficaria com o mesmo conteúdo repetido no fim. */
    this.chunks.push(channel.slice())

    if (currentTime - this.lastLevelPostTime >= LEVEL_INTERVAL_SEC) {
      this.lastLevelPostTime = currentTime
      const message: LevelMessage = { type: 'level', rms: calculateRms(channel) }
      this.port.postMessage(message)
    }

    return true
  }
}

registerProcessor('recorder-processor', RecorderProcessor)
