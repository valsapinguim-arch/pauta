import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { NoteEvent, ScoreDocument } from '@/lib/types'
import { initialSessionState, sessionReducer } from './session.reducer'
import type { AudioSource, SessionAction, SessionState } from './session.types'

/** Documento mínimo válido. A Tarefa 20 consolida fixtures a sério; aqui só
 *  precisamos de algo com a forma certa para atravessar as transições. */
const doc: ScoreDocument = {
  metadata: {
    schemaVersion: 1,
    title: 'Teste',
    createdAt: '2026-01-01T00:00:00.000Z',
    sourceName: null,
    durationSec: 4,
    confidence: { overall: 1, notes: 1, tempo: 1, key: 1 },
  },
  tempo: {
    bpm: 120,
    timeSignature: { numerator: 4, denominator: 4 },
    firstBeatSec: 0,
    confidence: 1,
    source: 'detected',
  },
  key: { tonic: 0, mode: 'major', sharpsOrFlats: 0, confidence: 1, source: 'detected' },
  clef: 'treble',
  measures: [],
}

const mic: AudioSource = { kind: 'microphone' }
const file: AudioSource = { kind: 'file', name: 'trecho.mp3' }
const notes: NoteEvent[] = [{ pitchMidi: 60, startSec: 0, durationSec: 0.3, amplitude: 0.5 }]

const states = {
  idle: { status: 'idle' },
  recording: { status: 'recording', source: mic, level: 0.4, elapsedMs: 1200 },
  processing: { status: 'processing', source: mic, stage: 'transcribing', progress: 0.5 },
  result: { status: 'result', document: doc, notes },
  error: { status: 'error', code: 'permission-denied', recoverable: true },
} satisfies Record<string, SessionState>

const actions = {
  'recording/start': { type: 'recording/start', source: mic },
  'recording/level': { type: 'recording/level', level: 0.8, elapsedMs: 2000 },
  'recording/stop': { type: 'recording/stop' },
  'processing/start': { type: 'processing/start', source: file },
  'processing/advance': { type: 'processing/advance', stage: 'analysing', progress: 0.9 },
  'processing/done': { type: 'processing/done', document: doc, notes },
  'result/replace': { type: 'result/replace', document: doc },
  'library/open': { type: 'library/open', document: doc },
  cancel: { type: 'cancel' },
} satisfies Record<string, SessionAction>

/** A tabela de verdade das transições. `null` = inválida, o estado mantém-se.
 *  `fail` e `reset` estão fora daqui: valem em qualquer estado e são testadas
 *  à parte. */
const expected: Record<
  keyof typeof states,
  Record<keyof typeof actions, SessionState['status'] | null>
> = {
  idle: {
    'recording/start': 'recording',
    'recording/level': null,
    'recording/stop': null,
    'processing/start': 'processing',
    'processing/advance': null,
    'processing/done': null,
    'result/replace': null,
    'library/open': 'result',
    cancel: null,
  },
  recording: {
    'recording/start': null,
    'recording/level': 'recording',
    'recording/stop': 'processing',
    'processing/start': null,
    'processing/advance': null,
    'processing/done': null,
    'result/replace': null,
    'library/open': null,
    cancel: 'idle',
  },
  processing: {
    'recording/start': null,
    'recording/level': null,
    'recording/stop': null,
    'processing/start': null,
    'processing/advance': 'processing',
    'processing/done': 'result',
    'result/replace': null,
    'library/open': null,
    cancel: 'idle',
  },
  result: {
    'recording/start': 'recording',
    'recording/level': null,
    'recording/stop': null,
    'processing/start': 'processing',
    'processing/advance': null,
    'processing/done': null,
    'result/replace': 'result',
    'library/open': 'result',
    cancel: null,
  },
  error: {
    'recording/start': 'recording',
    'recording/level': null,
    'recording/stop': null,
    'processing/start': 'processing',
    'processing/advance': null,
    'processing/done': null,
    'result/replace': null,
    'library/open': 'result',
    cancel: null,
  },
}

describe('sessionReducer', () => {
  beforeEach(() => {
    /* O reducer avisa em DEV nas transições inválidas; o teste exercita-as de
       propósito e não queremos o ruído. */
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('arranca em idle', () => {
    expect(initialSessionState).toEqual({ status: 'idle' })
  })

  describe('tabela de transições', () => {
    for (const stateName of Object.keys(states) as (keyof typeof states)[]) {
      for (const actionName of Object.keys(actions) as (keyof typeof actions)[]) {
        const target = expected[stateName][actionName]
        const label =
          target === null
            ? `${stateName} + ${actionName} → ignorado`
            : `${stateName} + ${actionName} → ${target}`

        it(label, () => {
          const before = states[stateName]
          const after = sessionReducer(before, actions[actionName])

          if (target === null) {
            /* Identidade, não igualdade: uma transição inválida devolve o
               MESMO objeto. Assim uma cópia acidental (que faria o React
               re-renderizar sem motivo) falha o teste. */
            expect(after).toBe(before)
          } else {
            expect(after.status).toBe(target)
          }
        })
      }
    }
  })

  it('avisa em transição inválida em vez de falhar em silêncio', () => {
    sessionReducer(states.idle, actions['recording/stop'])
    expect(console.warn).toHaveBeenCalledOnce()
  })

  describe('fail e reset valem em qualquer estado', () => {
    for (const stateName of Object.keys(states) as (keyof typeof states)[]) {
      it(`fail a partir de ${stateName}`, () => {
        const after = sessionReducer(states[stateName], {
          type: 'fail',
          code: 'decode-failed',
          recoverable: false,
        })
        expect(after).toEqual({ status: 'error', code: 'decode-failed', recoverable: false })
      })

      it(`reset a partir de ${stateName}`, () => {
        expect(sessionReducer(states[stateName], { type: 'reset' })).toEqual({ status: 'idle' })
      })
    }
  })

  describe('preservação de dados nas transições', () => {
    it('parar a gravação leva a fonte para o processamento', () => {
      const recording: SessionState = {
        status: 'recording',
        source: file,
        level: 0.2,
        elapsedMs: 500,
      }
      const after = sessionReducer(recording, { type: 'recording/stop' })
      expect(after).toEqual({
        status: 'processing',
        source: file,
        stage: 'preprocessing',
        progress: 0,
      })
    })

    it('avançar o processamento preserva a fonte', () => {
      const after = sessionReducer(states.processing, actions['processing/advance'])
      expect(after).toMatchObject({ source: mic, stage: 'analysing', progress: 0.9 })
    })

    it('gravar de novo a partir do resultado descarta o documento anterior', () => {
      const after = sessionReducer(states.result, actions['recording/start'])
      expect(after).toEqual({ status: 'recording', source: mic, level: 0, elapsedMs: 0 })
    })

    it('substituir o documento (correção de BPM) preserva as notas limpas guardadas', () => {
      const otherDoc: ScoreDocument = { ...doc, tempo: { ...doc.tempo, bpm: 140 } }
      const after = sessionReducer(states.result, { type: 'result/replace', document: otherDoc })
      expect(after).toEqual({ status: 'result', document: otherDoc, notes })
    })

    it('abrir da biblioteca entra em resultado sem notas de origem (Tarefa 16, decisão 4)', () => {
      const after = sessionReducer(states.idle, { type: 'library/open', document: doc })
      expect(after).toEqual({ status: 'result', document: doc, notes: [] })
    })
  })

  describe('valores fora de gama são normalizados', () => {
    it.each([
      [1.5, 1],
      [-0.5, 0],
      [Number.NaN, 0],
    ])('nível %s → %s', (input, want) => {
      const after = sessionReducer(states.recording, {
        type: 'recording/level',
        level: input,
        elapsedMs: 0,
      })
      expect(after).toMatchObject({ level: want })
    })

    it.each([
      [2, 1],
      [-1, 0],
      [Number.NaN, 0],
    ])('progresso %s → %s', (input, want) => {
      const after = sessionReducer(states.processing, {
        type: 'processing/advance',
        stage: 'transcribing',
        progress: input,
      })
      expect(after).toMatchObject({ progress: want })
    })

    it('tempo decorrido negativo é normalizado a zero', () => {
      const after = sessionReducer(states.recording, {
        type: 'recording/level',
        level: 0.5,
        elapsedMs: -100,
      })
      expect(after).toMatchObject({ elapsedMs: 0 })
    })
  })

  it('não muta o estado recebido', () => {
    const before: SessionState = { status: 'recording', source: mic, level: 0.1, elapsedMs: 10 }
    const snapshot = structuredClone(before)
    sessionReducer(before, actions['recording/level'])
    expect(before).toEqual(snapshot)
  })
})
