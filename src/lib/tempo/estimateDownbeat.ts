import { median } from '@/lib/notes/statistics'
import type { NoteEvent } from '@/lib/types'
import { TEMPO } from './constants'

export interface DownbeatEstimate {
  /** Quantos tempos a PRIMEIRA nota vem antes do primeiro tempo forte.
   *  `0` = a música começa no tempo forte (o que a app assumiu sempre até
   *  aqui). `1` numa marcha de 4/4 = uma semínima de preparação. */
  pickupBeats: number
  /** Margem relativa entre a melhor hipótese de fase e a segunda melhor, em
   *  [0, 1]. Quem chama compara com `TEMPO.DOWNBEAT_MIN_CONFIDENCE` — nunca
   *  aceitar uma anacruse sem folga clara. */
  confidence: number
}

const NO_PICKUP: DownbeatEstimate = { pickupBeats: 0, confidence: 0 }

/**
 * Estima onde cai mesmo o primeiro tempo forte — a anacruse que a Tarefa 9,
 * decisão 8, deixou deliberadamente por detetar.
 *
 * A ideia: o andamento (`estimateBpm`) diz o PERÍODO do tempo, mas não diz a
 * FASE do compasso — se a primeira nota é o tempo 1, o 2, o 3 ou o 4. Como
 * o compasso é sempre 4/4 nesta fase (decisão 4), só há quatro hipóteses, e
 * pontuam-se todas: música tocada por gente põe as notas mais longas e mais
 * fortes nos tempos fortes, por isso a fase certa é a que faz esses acentos
 * cair onde a métrica os espera.
 *
 * O que NÃO faz (e é o que a decisão 8 receava): não tenta perceber
 * estrutura de frase, não deteta compasso, e não devolve nada quando a
 * evidência é fraca — devolve `pickupBeats: 0`, que é exatamente o
 * comportamento anterior. Falhar para o lado do que já se fazia é o único
 * modo de falha aceitável aqui.
 *
 * `notes` tem de vir limpo (Tarefa 8) e ordenado por início.
 */
export function estimateDownbeat(
  notes: NoteEvent[],
  bpm: number,
  beatsPerMeasure: number,
): DownbeatEstimate {
  if (bpm <= 0 || beatsPerMeasure <= 0) return NO_PICKUP
  if (notes.length < TEMPO.MIN_ONSETS_FOR_ESTIMATE) return NO_PICKUP

  const beatPeriodSec = 60 / bpm
  const firstOnsetSec = (notes[0] as NoteEvent).startSec

  /* Acentos medidos em relação à MEDIANA da própria peça, nunca contra um
     valor absoluto — mesma razão da decisão 5 da Tarefa 8
     (`filterByAmplitude`): um limiar absoluto trata mal uma gravação fraca e
     uma forte. Aqui é ainda mais necessário porque o que interessa é o
     CONTRASTE entre notas, não o seu valor. */
  const medianDurationSec = median(notes.map((note) => note.durationSec))
  const medianAmplitude = median(notes.map((note) => note.amplitude))
  if (medianDurationSec <= 0 || medianAmplitude <= 0) return NO_PICKUP

  /* Só as notas que caem perto de um tempo dão evidência de fase; as outras
     não distinguem hipótese nenhuma. Repare-se que este conjunto é o MESMO
     para as quatro hipóteses — deslocar a fase por um número inteiro de
     tempos não muda a distância de uma nota ao tempo mais próximo. É isso
     que torna a comparação justa: entre candidatos só muda o PESO que cada
     nota recebe, nunca quais entram na conta. */
  const aligned: { beatIndexFromFirst: number; accent: number }[] = []
  for (const note of notes) {
    const positionInBeats = (note.startSec - firstOnsetSec) / beatPeriodSec
    const nearestBeat = Math.round(positionInBeats)
    if (Math.abs(positionInBeats - nearestBeat) > TEMPO.GRID_ALIGNMENT_TOLERANCE) continue

    /* Acento agógico (nota longa) AO QUADRADO, escalado pelo acento dinâmico
       (nota forte). A duração domina de propósito: medido com áudio real
       passado pelo modelo, as amplitudes que o `basic-pitch` devolve saem
       quase todas iguais (~0,53 a 0,67 numa peça onde a síntese variava
       entre 0,35 e 0,95), enquanto as durações mantêm o contraste (~0,42 s
       nos tempos fortes contra ~0,21 s nos fracos). Multiplicar as duas em
       pé de igualdade diluía o único sinal que sobrevive à deteção.
       Elevar ao quadrado agudiza esse contraste sem inventar informação —
       em notas todas iguais os acentos continuam iguais entre si e a margem
       final é exatamente 0, que é o caso em que não se deve arriscar. */
    const durationAccent = note.durationSec / medianDurationSec
    const accent = durationAccent * durationAccent * (note.amplitude / medianAmplitude)
    aligned.push({ beatIndexFromFirst: nearestBeat, accent })
  }

  if (aligned.length < TEMPO.MIN_ONSETS_FOR_ESTIMATE) return NO_PICKUP

  const weights = TEMPO.METRICAL_WEIGHTS_4_4
  const scores: number[] = []
  for (let pickupBeats = 0; pickupBeats < beatsPerMeasure; pickupBeats += 1) {
    /* Anacruse de `k` tempos = a primeira nota está `k` tempos ANTES do
       primeiro tempo forte, logo cai na posição `beatsPerMeasure - k` do
       compasso (k=0 → posição 0, o próprio tempo forte; k=1 → última
       posição do compasso; e assim por diante). Esta conta TEM de casar com
       a de `buildTempoMap`, que recua a origem exatamente
       `beatsPerMeasure - k` tempos — as duas juntas é que colocam a nota
       onde a pontuação disse que ela estava. */
    const firstNotePosition = (beatsPerMeasure - pickupBeats) % beatsPerMeasure
    let score = 0
    for (const { beatIndexFromFirst, accent } of aligned) {
      const positionInMeasure =
        (((beatIndexFromFirst + firstNotePosition) % beatsPerMeasure) + beatsPerMeasure) %
        beatsPerMeasure
      score += accent * (weights[positionInMeasure] ?? 0)
    }
    scores.push(score)
  }

  const best = Math.max(...scores)
  if (best <= 0) return NO_PICKUP

  const bestPickup = scores.indexOf(best)
  const secondBest = Math.max(...scores.filter((_, index) => index !== bestPickup))
  const confidence = (best - secondBest) / best

  // Sem folga clara não se arrisca — ver `DOWNBEAT_MIN_CONFIDENCE`.
  if (confidence < TEMPO.DOWNBEAT_MIN_CONFIDENCE) return NO_PICKUP

  return { pickupBeats: bestPickup, confidence }
}
