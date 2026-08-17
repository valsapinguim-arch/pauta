# Tarefa 11 — Tonalidade e Grafia de Notas

## Objetivo

Detetar a tonalidade da peça, escolher a armação de clave e decidir como escrever cada altura — se um dó sustenido se escreve como dó sustenido ou como ré bemol, e quando leva acidente à frente.

## Contexto

Depende da Tarefa 10 (`QuantizedNote[]`). Entrega `KeyAnalysis` para a Tarefa 12. Puramente `@/lib`.

## Decisões adotadas

**1. Deteção por correlação com perfis de tonalidade (Krumhansl-Schmuckler)**

- Constrói-se um histograma das doze classes de altura, ponderado pela duração de cada nota, e correlaciona-se com os 24 perfis (12 maiores + 12 menores). Ganha o de maior correlação.
- Justificação: é o método clássico, bem documentado, e opera exactamente sobre os dados que a app já tem (alturas e durações) — não precisa de áudio nem de harmonia. Alternativa considerada: contar acidentes necessários e escolher a armação que minimiza — mais simples, mas confunde sistematicamente relativas maior/menor e ignora a hierarquia tonal (numa peça em lá menor, o lá é estruturalmente importante mesmo que o dó apareça mais vezes).
- Ponderar por duração e não por contagem: uma nota longa define a tonalidade mais do que uma nota de passagem rápida.

**2. Maior e menor distinguidas, mas a armação é o que importa**

- Detetam-se as duas, e guarda-se o modo em `KeyAnalysis`; a armação de clave usada é a da tonalidade detetada (relativas partilham armação).
- Justificação: como dó maior e lá menor têm a mesma armação, distinguir mal não estraga a pauta — apenas o rótulo. É informação útil e de baixo risco, e serve para escolher a grafia (decisão 3) e para o rótulo de tonalidade no MusicXML.

**3. Sustenidos ou bemóis conforme a armação detetada, nunca por regra fixa**

- A escolha entre grafias enarmónicas segue a armação: em tonalidades com sustenidos escreve-se fá sustenido, em tonalidades com bemóis escreve-se si bemol.
- Justificação: escrever sempre sustenidos (o atalho comum) produz pautas ilegíveis em tonalidades de bemóis — um mi bemol escrito como ré sustenido faz qualquer músico parar a ler. Este é o detalhe que separa uma pauta que parece feita por um programa de uma que parece escrita por alguém.

**4. Notas da armação não levam acidente; as restantes levam, com anulação por compasso**

- Uma alteração escreve-se à frente da nota apenas se diferir da armação, e vale até ao fim do compasso — repetições da mesma nota no mesmo compasso não repetem o acidente. Bequadros escrevem-se quando é preciso cancelar.
- Justificação: é a regra da notação musical. Repetir acidentes em todas as notas produz uma pauta correta na leitura mas visualmente ruidosa e claramente automática.

**5. Confiança da tonalidade, com caminho alternativo para dó maior**

- Guarda-se a margem entre a melhor correlação e a segunda. Se for pequena, ou se houver muito poucas notas, assume-se dó maior (sem armação) e marca-se `source: 'assumed'`.
- Justificação: com cinco notas não há tonalidade para detetar, e uma armação errada obriga a escrever acidentes em quase todas as notas — pior do que não ter armação nenhuma. Dó maior é o caso neutro. Mesma lógica da Tarefa 9, decisão 5.

**6. Tonalidade corrigível pelo utilizador, com recálculo local**

- A `ResultView` permite escolher a tonalidade; alterá-la refaz a grafia e a notação, sem repetir inferência nem quantização.
- Justificação: mesma lógica do BPM (Tarefa 9, decisão 7) — quem tocou sabe, e a correção é barata. Mudar a tonalidade não altera nenhuma altura, só como se escreve, portanto o recálculo é ainda mais superficial do que o do tempo.

**7. Sem modulação: uma tonalidade para toda a peça**

- Justificação: detetar modulação exige análise por janelas e decidir onde muda — e uma modulação detetada no sítio errado introduz uma mudança de armação a meio da pauta, que é muito mais confuso do que alguns acidentes a mais. Para trechos de até 60 segundos é uma simplificação razoável.

**8. Sem transposição automática por instrumento**

- Escreve-se em alturas de concerto (o que soa é o que se escreve).
- Justificação: transpor exige saber que instrumento é, e a app não sabe (a deteção de instrumento está listada como melhoria futura). Escrever em alturas de concerto é a interpretação sem surpresas: um clarinetista sabe transpor se precisar, mas ninguém adivinha uma transposição que a app aplicou por si.

## Âmbito técnico

- Definir `KeyAnalysis` em `@/lib/types.ts`: `tonic`, `mode`, `sharpsOrFlats` (−7…+7), `confidence`, `source: 'detected' | 'assumed' | 'manual'`
- Implementar em `@/lib/key/` como funções puras:
  - `pitchClassHistogram(notes)` — ponderado por duração
  - `detectKey(histogram)` — correlação com os 24 perfis
  - `keySignatureFor(tonic, mode)` → número de sustenidos/bemóis
  - `spellPitch(pitchMidi, keyAnalysis)` → `{ step, alter, octave }`
  - `applyAccidentals(notes, keyAnalysis)` — decide acidentes visíveis com anulação por compasso (decisão 4)
- Incluir os perfis de Krumhansl-Schmuckler como dados, com a fonte citada em comentário
- Implementar o controlo de tonalidade na `ResultView` e a cadeia de recálculo (decisão 6)
- Mostrar aviso quando `source === 'assumed'`
- Testes:
  - melodia diatónica em sol maior deteta sol maior e uma armação de um sustenido
  - a mesma melodia com fá natural em vez de fá sustenido não deteta sol maior
  - em ré bemol maior, a nota correspondente escreve-se como bemol e não como sustenido
  - duas notas iguais alteradas no mesmo compasso só levam um acidente
  - uma nota alterada num compasso não afeta o compasso seguinte
  - três notas dão `source: 'assumed'` e dó maior

## Guardrails para IA (atualizar `AGENTS.md`)

- "A grafia enarmónica de uma nota segue sempre a armação detetada; proibido escrever sempre sustenidos ou aplicar uma regra fixa independente da tonalidade."
- "O histograma de classes de altura é ponderado por duração, nunca por contagem de notas."
- "Acidentes escrevem-se apenas quando diferem da armação e valem até ao fim do compasso; proibido repetir o acidente em cada nota alterada do mesmo compasso."
- "Quando a confiança da tonalidade é baixa assume-se dó maior com `source: 'assumed'` e avisa-se o utilizador; proibido apresentar uma tonalidade fraca como detetada."
- "A tonalidade é corrigível pelo utilizador e alterá-la refaz apenas a grafia e a notação — nunca a inferência nem a quantização."
- "Uma só tonalidade por peça; não implementar deteção de modulação sem atualizar `docs/architecture.md` e a Tarefa 12."
- "A notação é sempre em alturas de concerto; proibido aplicar transposição automática por instrumento."
- "Os perfis de tonalidade são dados com fonte citada; proibido afinar os valores dos perfis por tentativa e erro."

## Entregáveis

- `KeyAnalysis` produzido para qualquer entrada, incluindo casos degenerados
- Grafia correta em tonalidades de sustenidos e de bemóis, verificada à mão numa melodia conhecida
- Acidentes com anulação por compasso a funcionar
- Aviso visível quando a tonalidade é assumida
- Correção manual da tonalidade a atualizar a pauta imediatamente
- Todos os testes da decisão acima a passar
- `AGENTS.md` atualizado com as regras acima

## Notas / Dependências

- Depende da Tarefa 10. Entrega para a Tarefa 12.
- A decisão 3 é a que mais contribui para a pauta "parecer bem" — vale a pena testar com uma melodia em fá maior e outra em mi maior e olhar para o resultado como músico, não como programador.
- Atenção à convenção de oitavas: dó central é MIDI 60 e escreve-se C4 na convenção científica. Um erro de uma oitava aqui atravessa tudo até ao MusicXML (Tarefa 15) e só se nota ao abrir o ficheiro noutro programa.
- A anulação de acidentes por compasso (decisão 4) tem um caso limite fácil de esquecer: uma nota ligada sobre a barra de compasso (Tarefa 10, decisão 7) não repete o acidente na segunda parte.
