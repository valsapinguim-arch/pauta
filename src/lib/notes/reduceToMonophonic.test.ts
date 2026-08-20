import { describe, expect, it } from 'vitest'
import type { NoteEvent } from '@/lib/types'
import { NOTE_CLEANUP } from './constants'
import { reduceToMonophonic } from './reduceToMonophonic'

function note(pitchMidi: number, startSec: number, durationSec = 0.3): NoteEvent {
  return { pitchMidi, startSec, durationSec, amplitude: 0.5 }
}

describe('reduceToMonophonic', () => {
  it('reduz um acorde de três notas à mais aguda', () => {
    const chord = [note(60, 0), note(64, 0), note(67, 0)]
    expect(reduceToMonophonic(chord)).toEqual([note(67, 0)])
  })

  it('mantém notas que não se sobrepõem', () => {
    const melody = [note(60, 0, 0.2), note(62, 0.2, 0.2), note(64, 0.4, 0.2)]
    expect(reduceToMonophonic(melody)).toEqual(melody)
  })

  it('agrupa ataques dentro da janela de simultaneidade, mesmo não sendo exatos', () => {
    const almostTogether = NOTE_CLEANUP.SIMULTANEOUS_ONSET_MS / 1000 / 2
    const chord = [note(60, 0), note(67, almostTogether)]
    expect(reduceToMonophonic(chord)).toEqual([note(67, almostTogether)])
  })

  it('mantém notas sobrepostas que NÃO foram atacadas juntas (legato, ressonância)', () => {
    // Bug real (sessão de afinação com áudio real, Tarefa 21): a versão
    // original agrupava por sobreposição transitiva, e uma nota longa
    // sobreposta à frase toda encadeava tudo num só grupo — de 68 notas
    // detetadas sobreviviam 8, para 25 realmente tocadas.
    //
    // Aqui: uma nota grave e longa (0-2s) sobrepõe-se a três notas de
    // melodia atacadas bem depois dela. Só a primeira forma acorde com a
    // grave; as outras são eventos próprios e têm de sobreviver.
    const drone = note(48, 0, 2)
    const m1 = note(72, 0, 0.3)
    const m2 = note(74, 0.5, 0.3)
    const m3 = note(76, 1, 0.3)

    const result = reduceToMonophonic([drone, m1, m2, m3])

    expect(result).toEqual([m1, m2, m3])
  })

  it('uma sequência rápida não se encadeia num grupo só, por muito longa que seja', () => {
    // A âncora do grupo é o início da PRIMEIRA nota, não da última — sem
    // isso, notas separadas por menos do que a janela encadeavam-se sem
    // fim, repetindo o defeito original noutra dimensão.
    const step = NOTE_CLEANUP.SIMULTANEOUS_ONSET_MS / 1000 / 2
    const run = Array.from({ length: 10 }, (_, i) => note(60 + i, i * step, 0.5))

    const result = reduceToMonophonic(run)

    expect(result.length).toBeGreaterThan(1)
  })

  it('não precisa de entrada já ordenada', () => {
    const chord = [note(64, 0), note(67, 0), note(60, 0)]
    expect(reduceToMonophonic(chord)).toEqual([note(67, 0)])
  })

  it('devolve vazio para entrada vazia', () => {
    expect(reduceToMonophonic([])).toEqual([])
  })
})
