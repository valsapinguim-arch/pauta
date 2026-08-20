# Tarefa 8 — Pós-processamento de Notas

## Objetivo

Limpar a saída do modelo: remover artefactos, filtrar notas espúrias, reduzir a uma única linha melódica e calcular uma métrica de confiança. É aqui que se decide o que conta como nota.

## Contexto

Depende da Tarefa 7 (`NoteEvent[]`). Entrega para a Tarefa 9. Puramente `@/lib` — sem áudio, sem DOM, testável com notas escritas à mão.

## Decisões adotadas

**1. Reduzir a uma única voz, sempre**

- De notas simultâneas, mantém-se uma; as restantes são descartadas.
- Justificação: já decidido em `docs/architecture.md` (decisão 6). Notar polifonia corretamente exige separação de vozes, atribuição de hastes e decisões de acordes que a app não faz; e uma pauta polifónica mal notada é menos útil do que uma melodia limpa. O modelo é polifónico, portanto esta redução é uma decisão de produto explícita, não uma limitação técnica herdada.

**2. Critério de escolha entre notas simultâneas: a mais aguda**

- Em sobreposição, fica a nota de `pitchMidi` mais alto.
- Justificação: em música tonal, a melodia está esmagadoramente na voz superior — é a convenção que o ouvido usa e é o que o utilizador espera ver quando cantou ou tocou uma linha sobre um acompanhamento. Alternativas consideradas: a mais forte (a amplitude do modelo é pouco fiável e favorece notas baixas, que têm mais energia) e a mais longa (favorece notas de acompanhamento sustentadas em detrimento da melodia). "A mais aguda" é simples, previsível e explicável ao utilizador.

**3. Remoção de harmónicos antes de resolver sobreposições**

- Uma nota é candidata a harmónico se começar aproximadamente ao mesmo tempo que outra mais grave, estiver a um intervalo de oitava ou de duodécima (12 ou 19 semitons) acima, e tiver amplitude sensivelmente menor.
- Justificação: o modelo deteta com frequência a oitava acima da nota real como nota independente. Se isto não for removido **antes** da decisão 2, a regra "a mais aguda" escolhe sistematicamente o harmónico em vez da nota fundamental — e a pauta sai uma oitava acima em passagens inteiras. A ordem entre estas duas etapas é o detalhe mais importante desta tarefa.

**4. Filtro de duração mínima: 60 ms**

- Notas mais curtas são descartadas.
- Justificação: 60 ms é mais curto do que qualquer nota musicalmente intencional em andamentos plausíveis (uma semicorchea a 200 BPM tem 75 ms), mas mais longo do que os _cliques_ e transientes que o modelo interpreta como notas. É intencionalmente um pouco mais permissivo do que o `MIN_NOTE_LENGTH_MS` do modelo (Tarefa 7), para que o corte definitivo aconteça aqui, num sítio testável, e não dentro do modelo.

**5. Filtro de amplitude relativo, não absoluto**

- Descarta-se abaixo de uma fração da amplitude mediana das notas detetadas.
- Justificação: um limiar absoluto trata mal os dois extremos — numa gravação fraca elimina a música toda, numa forte não elimina nada. Relativo à mediana (e não à média, que uma nota muito forte distorce) adapta-se automaticamente ao material.

**6. Fusão de notas repetidas fragmentadas**

- Duas notas com a mesma altura separadas por um intervalo muito curto (< 50 ms) são fundidas numa só.
- Justificação: vibrato, tremolo e variações de ataque fazem o modelo cortar uma nota longa em duas ou três. Não fundir produz repetições rítmicas que não existem na gravação — o erro mais audível e mais visível na pauta. O limiar é conservador para não fundir repetições reais de notas rápidas.

**7. Confiança calculada mas nunca usada para bloquear**

- Métrica em [0, 1] a partir da proporção de notas descartadas, da estabilidade das durações e da amplitude mediana. Guardada em `ScoreDocument`.
- Justificação: serve para avisar o utilizador quando o resultado é provavelmente mau ("isto parece ter vários instrumentos") — o que apoia o requisito de honestidade do produto. Não bloqueia porque um limiar automático que se recuse a mostrar o resultado é frustrante e às vezes está errado; mostrar com aviso respeita o julgamento do utilizador.

**8. Ordem fixa do pipeline de limpeza**

- `ordenar por início → fundir fragmentos → remover harmónicos → resolver sobreposições → filtrar duração → filtrar amplitude → recalcular confiança`.
- Justificação: cada etapa assume a saída da anterior. Fundir antes de filtrar por duração evita descartar fragmentos que juntos formariam uma nota válida; remover harmónicos antes de resolver sobreposições é a decisão 3; filtrar amplitude no fim garante que a mediana é calculada sobre notas já limpas. Como na Tarefa 6, a ordem é parte do contrato.

**9. Nada de preenchimento de lacunas nem de "correção" melódica**

- Não se inventam notas para tapar buracos, não se ajustam alturas a uma escala, não se suavizam saltos.
- Justificação: seria adivinhar. Uma nota que o modelo não detetou é informação que não existe, e inventá-la produz uma pauta que soa plausível mas não corresponde ao que foi tocado — o utilizador não tem forma de distinguir o que é transcrição do que é invenção. A grafia de notas segundo a tonalidade (Tarefa 11) é diferente: aí decide-se **como escrever** uma altura detetada, não inventa-se altura nenhuma.

## Âmbito técnico

- Implementar em `@/lib/notes/` como funções puras:
  - `sortByOnset(notes)`
  - `mergeFragmented(notes, maxGapMs)`
  - `removeHarmonics(notes)`
  - `reduceToMonophonic(notes)`
  - `filterByDuration(notes, minMs)`
  - `filterByAmplitude(notes, relativeThreshold)`
  - `computeConfidence(original, cleaned)`
  - `cleanNotes(notes)` — encadeia pela ordem da decisão 8
- Definir as constantes num só sítio (`NOTE_CLEANUP`), marcadas como afináveis com áudio real
- Propagar `confidence` no estado da sessão para uso na Tarefa 13
- Registar em modo de desenvolvimento a contagem de notas removidas por etapa (ajuda a afinar)
- Testes com notas construídas à mão:
  - escala monofónica limpa passa intacta
  - nota com harmónico de oitava perde o harmónico e mantém a fundamental
  - acorde de três notas reduz-se à mais aguda
  - nota partida em três fragmentos volta a ser uma
  - transiente de 20 ms desaparece
  - entrada vazia devolve vazio e confiança 0, sem lançar

## Guardrails para IA (atualizar `AGENTS.md`)

- "A remoção de harmónicos corre sempre ANTES da redução a monofonia; pela ordem inversa a pauta sai uma oitava acima. Não reordenar `cleanNotes`."
- "A ordem de `cleanNotes` é fixa: ordenar → fundir → harmónicos → monofonia → duração → amplitude → confiança."
- "Em notas simultâneas mantém-se a mais aguda; proibido mudar o critério para amplitude ou duração sem justificação medida contra áudio real."
- "Filtros de amplitude são sempre relativos à mediana das notas detetadas; proibido limiar absoluto."
- "Proibido inventar, interpolar ou 'corrigir' notas: não se preenchem lacunas, não se ajustam alturas a uma escala, não se suavizam saltos. O que o modelo não detetou não existe."
- "A confiança é informativa: nunca impede o utilizador de ver o resultado nem interrompe o pipeline."
- "Constantes de limpeza vivem exclusivamente em `NOTE_CLEANUP`; proibido valores literais dentro das funções."
- "Funções em `@/lib/notes` são puras e testadas com notas escritas à mão — nunca precisam de áudio nem do modelo para serem exercitadas."

## Entregáveis

- `cleanNotes` implementado e a reduzir a saída do modelo a uma linha melódica coerente
- Todos os testes da decisão acima a passar
- `confidence` calculado e disponível no estado da sessão
- Contagens por etapa visíveis em desenvolvimento
- `AGENTS.md` atualizado com as regras acima

## Notas / Dependências

- Depende da Tarefa 7. Entrega para a Tarefa 9.
- O erro de oitava (decisão 3) é o mais comum e o mais desconcertante para o utilizador — vale a pena gravar uma escala cantada e verificar nota por nota antes de considerar a tarefa fechada.
- As constantes desta tarefa e o `MODEL_THRESHOLDS` da Tarefa 7 interagem: apertar um permite aliviar o outro. Afiná-los em conjunto, depois da Tarefa 13, quando o resultado for visível numa pauta.
- Se uma gravação legítima e limpa perder notas de forma sistemática, suspeitar primeiro dos limiares do modelo (Tarefa 7) e não destes filtros — este código só remove o que já lhe chegou.

### Registado durante a implementação

- **`computeConfidence` tinha um bug real na primeira versão: descartar TUDO dava confiança 0.33, não 0.** `durationStability` devolve `1` ("sem provas de instabilidade") para menos de duas notas — correto para uma nota isolada, errado para zero notas, onde não há melodia nenhuma para ter confiança. Um teste ("não lança quando tudo foi descartado") apanhou isto antes de chegar a algum lado — `computeConfidence(original, [])` tinha de dar exatamente `0`, tal como a entrada vazia. Corrigido com um segundo caso especial (`cleaned.length === 0 → 0`), distinto do de `original.length === 0`.
- **`@/lib` não usa barrels (`index.ts`)** — confirmado a olhar para `@/lib/audio/`, que não tem nenhum; cada consumidor importa o ficheiro concreto (`@/lib/audio/toMono`, etc.). Escrito um `index.ts` para `@/lib/notes/` por hábito vindo de `@/features` (que USA barrels) e apagado ao notar a inconsistência — `@/lib/notes/cleanNotes` importa-se diretamente, tal como `useTranscriber.ts` já faz.
- **`reduceToMonophonic` interpretou "de notas simultâneas, mantém-se uma" como grupos por sobreposição transitiva, não pares.** Três notas A-B-C onde A se sobrepõe a B, B a C, mas A não a C, formam um só grupo (a fronteira do grupo estende-se enquanto houver sobreposição) — não dois grupos sobrepostos entre si. Testado explicitamente (`reduceToMonophonic.test.ts`, "junta um grupo transitivo").
- **`cleanNotes` corre na thread principal, dentro de `useTranscriber`, não no `transcribe.worker.ts`.** É `@/lib` puro sobre arrays de notas (nunca tensores), por isso não há razão de desempenho para o meter no worker — e mantê-lo fora respeita a decisão 9 da Tarefa 7 ("todo o resto do pipeline trabalha sobre um tipo próprio", fora da fronteira do TensorFlow.js).
- **Verificação end-to-end real**: o mesmo tom sintético de 440 Hz, 2 s, da Tarefa 7 (uma nota só, `pitchMidi: 69`) passou por `cleanNotes` sem alterações (`1 de 1 originais`) com confiança `0.88`. Não verificado nesta sessão com áudio real que produza harmónicos de oitava ou acordes de verdade — os testes unitários com notas escritas à mão (`removeHarmonics.test.ts`, `reduceToMonophonic.test.ts`) são a cobertura real dessas decisões; a Nota desta tarefa já assinala gravar uma escala cantada como o próximo passo de verificação a sério, quando a pauta se desenhar (Tarefa 13) e um erro de oitava se tornar visível.
