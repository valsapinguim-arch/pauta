// Gera os fixtures de áudio sintético dos testes de regressão — Tarefa 20,
// decisão 2. Corre-se à mão (`node tests/fixtures/audio/generate.js`),
// tal como scripts/copy-model-assets.js e scripts/generate-pwa-assets.js: os
// ficheiros gerados ficam versionados (`*.min.wav`, ver .gitignore), não
// recriados a cada build — regenerar só quando a forma de um fixture mudar
// de propósito, revendo o diff.
//
// WAV sintético, não gravações reais (decisão 2, guardrail em AGENTS.md):
// pequenos, determinísticos, sem questões de direitos. Tons puros com
// envelope simples de ataque/decaimento (não senos crus, que o modelo tende
// a ler como uma única nota sustida sem articulação nenhuma entre notas
// consecutivas da mesma altura).
//
// Node puro, sem dependência nova — mesma razão de copy-model-assets.js.

import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const outDir = dirname(fileURLToPath(import.meta.url))
mkdirSync(outDir, { recursive: true })

const SAMPLE_RATE = 44_100

/** Nomes de nota → MIDI, só para este gerador (não é o domínio da app). */
const MIDI = { C4: 60, D4: 62, E4: 64, F4: 65, G4: 67, A4: 69, C5: 72 }

function midiToFreqHz(midi) {
  return 440 * 2 ** ((midi - 69) / 12)
}

/** Uma nota com envelope de ataque/decaimento simples — sem isto, notas
 *  consecutivas da mesma altura soam como uma só nota sustida sem onset
 *  detetável entre elas. */
function renderNote(samples, startSample, durationSec, freqHz, amplitude = 0.6) {
  const durationSamples = Math.round(durationSec * SAMPLE_RATE)
  const attackSamples = Math.round(0.01 * SAMPLE_RATE)
  const releaseSamples = Math.round(0.05 * SAMPLE_RATE)

  for (let i = 0; i < durationSamples; i += 1) {
    const sampleIndex = startSample + i
    if (sampleIndex >= samples.length) break

    let envelope = 1
    if (i < attackSamples) envelope = i / attackSamples
    else if (i > durationSamples - releaseSamples) {
      envelope = Math.max(0, (durationSamples - i) / releaseSamples)
    }

    const t = i / SAMPLE_RATE
    samples[sampleIndex] += amplitude * envelope * Math.sin(2 * Math.PI * freqHz * t)
  }
}

/** Sequência de `{ midi, durationSec }` (`midi: null` = pausa), tocada uma a
 *  seguir à outra sem sobreposição. */
function renderSequence(notes, sampleRate = SAMPLE_RATE) {
  const totalSec = notes.reduce((sum, note) => sum + note.durationSec, 0)
  const samples = new Float32Array(Math.ceil(totalSec * sampleRate) + sampleRate)

  let cursorSec = 0
  for (const note of notes) {
    if (note.midi !== null) {
      renderNote(
        samples,
        Math.round(cursorSec * sampleRate),
        note.durationSec,
        midiToFreqHz(note.midi),
      )
    }
    cursorSec += note.durationSec
  }

  return samples
}

function encodeWav(samples, sampleRate) {
  const buffer = new ArrayBuffer(44 + samples.length * 2)
  const view = new DataView(buffer)

  function writeString(offset, str) {
    for (let i = 0; i < str.length; i += 1) view.setUint8(offset + i, str.charCodeAt(i))
  }

  writeString(0, 'RIFF')
  view.setUint32(4, 36 + samples.length * 2, true)
  writeString(8, 'WAVE')
  writeString(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, 1, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * 2, true)
  view.setUint16(32, 2, true)
  view.setUint16(34, 16, true)
  writeString(36, 'data')
  view.setUint32(40, samples.length * 2, true)

  for (let i = 0; i < samples.length; i += 1) {
    const clamped = Math.max(-1, Math.min(1, samples[i]))
    view.setInt16(44 + i * 2, clamped * 32767, true)
  }

  return Buffer.from(buffer)
}

/** Ruído branco puro — caso limite: sem nenhuma altura estável, a
 *  transcrição esperada é "sem notas" ou muito esparsa (ver
 *  tests/fixtures/expected/README.md). Semente fixa (`mulberry32`), não
 *  `Math.random()` — os fixtures têm de ser determinísticos (decisão 2):
 *  ruído diferente a cada `generate.js` invalidaria o esperado do teste de
 *  regressão a cada regeneração, mesmo sem ninguém ter mudado nada. */
function mulberry32(seed) {
  let state = seed
  return function random() {
    state |= 0
    state = (state + 0x6d2b79f5) | 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function renderNoise(durationSec, sampleRate = SAMPLE_RATE) {
  const random = mulberry32(20)
  const samples = new Float32Array(Math.round(durationSec * sampleRate))
  for (let i = 0; i < samples.length; i += 1) samples[i] = (random() * 2 - 1) * 0.3
  return samples
}

const FIXTURES = {
  'scale.min.wav': renderSequence([
    { midi: MIDI.C4, durationSec: 0.4 },
    { midi: MIDI.D4, durationSec: 0.4 },
    { midi: MIDI.E4, durationSec: 0.4 },
    { midi: MIDI.F4, durationSec: 0.4 },
    { midi: MIDI.G4, durationSec: 0.4 },
  ]),
  'arpeggio.min.wav': renderSequence([
    { midi: MIDI.C4, durationSec: 0.4 },
    { midi: MIDI.E4, durationSec: 0.4 },
    { midi: MIDI.G4, durationSec: 0.4 },
    { midi: MIDI.C5, durationSec: 0.4 },
  ]),
  /* Repete a mesma altura de propósito (ver nota abaixo) — tentativas de
     alternar sol/lá para dar variedade rítmica visível desencadearam um
     bug real de quantização («[quantize] compasso N soma X ticks, esperado
     1920», @/lib/quantize/quantize.ts) descoberto ao preparar este
     fixture: com certas combinações de duração o compasso deixa de somar
     `QUANTIZE.MEASURE_TICKS` e a exceção escapava sem apanhar, prendendo a
     sessão em "processing" para sempre (corrigido nesta tarefa só do lado
     da robustez — `useTranscriber` agora falha de forma visível em vez de
     ficar preso; a causa raiz em `quantize.ts` fica por resolver, sinalizada
     à parte). Com a mesma altura repetida, o modelo funde tudo numa única
     nota sustida — é um resultado estável, só não testa variedade rítmica a
     sério; ver AGENTS.md. */
  'rhythm.min.wav': renderSequence([
    { midi: MIDI.G4, durationSec: 0.8 },
    { midi: MIDI.G4, durationSec: 0.4 },
    { midi: MIDI.G4, durationSec: 0.2 },
    { midi: MIDI.G4, durationSec: 0.2 },
    { midi: MIDI.G4, durationSec: 0.4 },
  ]),
  'silence.min.wav': new Float32Array(Math.round(2 * SAMPLE_RATE)),
  'noise.min.wav': renderNoise(2),
}

for (const [fileName, samples] of Object.entries(FIXTURES)) {
  const wav = encodeWav(samples, SAMPLE_RATE)
  writeFileSync(join(outDir, fileName), wav)
  console.log(`${fileName}: ${(wav.length / 1024).toFixed(1)} KB`)
}
