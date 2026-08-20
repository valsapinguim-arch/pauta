import type { NoteEvent } from '@/lib/types'
import { NOTE_CLEANUP } from './constants'
import { sortByOnset } from './sortByOnset'

function pickHighest(cluster: NoteEvent[]): NoteEvent {
  return cluster.reduce((best, note) => (note.pitchMidi > best.pitchMidi ? note : best))
}

/**
 * Reduz notas SIMULTÂNEAS a uma única voz — Tarefa 8, decisões 1 e 2. Notas
 * atacadas a menos de `SIMULTANEOUS_ONSET_MS` umas das outras formam um
 * grupo (um acorde); de cada grupo mantém-se só a nota de `pitchMidi` mais
 * alto — as restantes são DESCARTADAS por inteiro, nunca cortadas ou
 * ajustadas (decisão 9: nada de "corrigir" a melodia).
 *
 * O agrupamento é por INÍCIO, não por sobreposição. A versão original
 * agrupava por sobreposição transitiva (A-B e B-C sobrepostas juntavam A, B
 * e C no mesmo grupo, mesmo que A e C não se tocassem) — o que funcionava
 * com notas escritas à mão, mas com áudio real colapsava passagens inteiras
 * numa única nota: basta uma nota longa e grave (uma suboitava espúria do
 * modelo, por exemplo) sobrepor-se a toda a frase para encadear tudo num só
 * grupo. Medido com uma gravação real de 25 notas: o modelo detetou 68, e
 * sobreviviam 8 — um grupo sozinho colapsava 23 notas.
 *
 * Notas que se sobrepõem mas NÃO são atacadas juntas (legato, ressonância,
 * cauda de uma nota a entrar no ataque da seguinte) passam as duas — o
 * encurtamento de quem invade a seguinte é da quantização, que já o faz
 * (`resolveOverlaps`, Tarefa 10, decisão 4). Esta função decide QUE notas
 * existem; nunca as suas durações.
 *
 * Corre sempre DEPOIS de `removeHarmonics` (decisão 8) — ver a nota nesse
 * ficheiro.
 */
export function reduceToMonophonic(notes: NoteEvent[]): NoteEvent[] {
  if (notes.length === 0) return []

  const simultaneousOnsetSec = NOTE_CLEANUP.SIMULTANEOUS_ONSET_MS / 1000
  const sorted = sortByOnset(notes)
  const result: NoteEvent[] = []

  const [first, ...rest] = sorted as [NoteEvent, ...NoteEvent[]]
  let cluster: NoteEvent[] = [first]
  /* Âncora = início da PRIMEIRA nota do grupo, não da última acrescentada:
     senão uma sequência de notas separadas por menos do que a janela
     encadeava-se indefinidamente — exatamente o defeito que esta versão
     corrige, só que na dimensão do início em vez da do fim. */
  let clusterOnset = first.startSec

  for (const note of rest) {
    if (note.startSec - clusterOnset <= simultaneousOnsetSec) {
      cluster.push(note)
    } else {
      result.push(pickHighest(cluster))
      cluster = [note]
      clusterOnset = note.startSec
    }
  }
  result.push(pickHighest(cluster))

  return result
}
