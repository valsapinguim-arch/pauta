# Tarefa 9 — Deteção de Tempo

## Objetivo

Descobrir o andamento (BPM), onde cai o primeiro tempo forte e construir a grelha de tempos e compassos sobre a qual a quantização vai trabalhar.

## Contexto

Depende da Tarefa 8 (`NoteEvent[]` limpo). Entrega `TempoMap` para a Tarefa 10. Puramente `@/lib`.

## Decisões adotadas

**1. Tempo inferido dos *onsets* das notas, não do sinal de áudio**
- A entrada é a lista de inícios de nota, não o PCM.
- Justificação: a app já tem os *onsets* detetados por um modelo treinado para isso (Tarefa 7) — são melhores do que os que uma deteção de energia sobre o sinal daria, e usar o áudio outra vez obrigaria a atravessar a fronteira do worker com dezenas de MB e a manter o PCM em memória mais tempo. Contrapartida: em música sem ataques claros (notas ligadas, cordas em legato) há poucos *onsets* e a estimativa degrada-se — tratado pela decisão 5.

**2. Estimativa por histograma de *inter-onset intervals* com ponderação, não por autocorrelação do sinal**
- Calculam-se todos os intervalos entre pares de *onsets* próximos, acumulam-se num histograma, e procura-se o período que melhor explica o conjunto.
- Justificação: com dezenas de *onsets* (não milhões de amostras), um histograma é suficiente, rápido e — o que mais importa — inspecionável: quando o BPM sai errado, dá-se para ver no histograma porquê. Uma autocorrelação sobre o sinal seria uma caixa negra sobre dados que a app já reduziu.

**3. Ambiguidade de oitava métrica resolvida por preferência pela zona central**
- Se o candidato for < 60 BPM duplica-se; se for > 200 BPM divide-se, até cair em [60, 200].
- Justificação: qualquer método de deteção de tempo confunde-se entre um andamento e o seu dobro ou metade — 60 e 120 BPM explicam os mesmos intervalos igualmente bem, porque é a mesma música contada de outra maneira. Não há solução correta, só uma convenção; e a maioria da música está entre 60 e 200 BPM, portanto essa gama é a aposta com melhor valor esperado. É uma normalização honesta, não uma deteção — daí a decisão 6.

**4. Compasso assumido 4/4, sem tentar detetar**
- `timeSignature: { numerator: 4, denominator: 4 }`, constante.
- Justificação: deteção fiável de compasso exige análise de acentuação e de estrutura métrica muito além do âmbito, e um compasso errado estraga a pauta toda (barras nos sítios errados, tempos fortes deslocados). 4/4 é o compasso da grande maioria da música popular; quando está errado, a pauta ainda é legível, apenas mal barrada. Já listado como melhoria futura no `base.md`.

**5. Confiança do tempo, com caminho alternativo explícito**
- Calcula-se a confiança da estimativa (quantos *onsets* a grelha explica, quão concentrado é o histograma). Abaixo de um limiar: mantém-se um BPM por omissão de 120 e sinaliza-se `tempoConfidence: 'low'`.
- Justificação: menos de ~8 *onsets*, ou *onsets* muito irregulares (rubato, uma nota longa só), não permitem estimar nada — e insistir produz um BPM inventado que desalinha tudo a jusante. Assumir 120 e dizer que se assumiu é mais honesto, e é acionável pelo utilizador via decisão 7.

**6. O BPM é sempre apresentado como estimativa editável, nunca como facto**
- A `ResultView` mostra o BPM com indicação de que é uma estimativa, e uma forma de o corrigir.
- Justificação: a decisão 3 é uma convenção, não uma verdade; e quem tocou sabe o andamento melhor do que o algoritmo. Como o BPM condiciona toda a quantização (Tarefa 10), deixá-lo corrigir é a intervenção com maior retorno por unidade de esforço em toda a app.

**7. Correção manual do BPM recalcula do `TempoMap` para a frente, sem nova inferência**
- Alterar o BPM refaz grelha → quantização → notação, reutilizando as notas limpas da Tarefa 8.
- Justificação: a inferência do modelo é o passo caro (segundos) e não depende do tempo. Recalcular só a partir daqui torna a correção instantânea, o que é o que a transforma numa ferramenta usável em vez de num formulário que obriga a esperar. É também a razão pela qual `NoteEvent[]` limpo se mantém no estado da sessão depois de consumido.

**8. Primeiro tempo forte: o primeiro *onset* significativo, sem anacruse**
- O tempo 1 do compasso 1 alinha com o primeiro *onset* que sobreviveu à limpeza.
- Justificação: detetar anacruses (notas antes do primeiro tempo forte) exige perceber a estrutura de frase, o que está fora de âmbito. Assumir que a música começa no tempo forte é correto na maioria dos casos e, quando não é, o erro é uma pauta deslocada meio compasso — legível e corrigível, ao contrário de uma tentativa de adivinhar que falhe.

**9. Andamento constante: um só BPM para toda a peça**
- `TempoMap` guarda um BPM único, não uma curva.
- Justificação: variação de andamento (rallentando, rubato) exigiria alinhamento por *beat tracking* dinâmico, muito além do âmbito. Para trechos de até 60 segundos, tocados com intenção rítmica, um andamento constante é razoável. A estrutura de `TempoMap` fica preparada para uma lista de secções, para que a evolução futura não obrigue a mudar as assinaturas a jusante.

## Âmbito técnico

* Definir `TempoMap` em `@/lib/types.ts`: `bpm`, `timeSignature`, `firstBeatTime`, `confidence`, `source: 'detected' | 'assumed' | 'manual'`
* Implementar em `@/lib/tempo/` como funções puras:
  * `interOnsetIntervals(notes)`
  * `estimateBpm(intervals)` → candidato + concentração do histograma
  * `normalizeToRange(bpm, min, max)` (decisão 3)
  * `computeTempoConfidence(notes, bpm)`
  * `buildTempoMap(notes)` — encadeia, aplica o caminho alternativo da decisão 5
  * `buildBeatGrid(tempoMap, durationSec)` → tempos e limites de compasso
* Guardar `NoteEvent[]` limpo no estado da sessão para o recálculo da decisão 7
* Implementar o controlo de BPM na `ResultView` e a cadeia de recálculo (decisão 7)
* Mostrar aviso quando `source === 'assumed'`
* Testes:
  * *onsets* gerados a 120 BPM em semínimas dão 120
  * a mesma sequência interpretada a 60 BPM normaliza para dentro da gama
  * *onsets* irregulares dão `source: 'assumed'` e BPM 120
  * lista com uma só nota não lança e devolve `assumed`
  * `buildBeatGrid` produz limites de compasso a intervalos exatos de 4 tempos

## Guardrails para IA (atualizar `AGENTS.md`)

* "A deteção de tempo trabalha exclusivamente sobre `NoteEvent[]`; proibido reprocessar o PCM em `@/lib/tempo` — o áudio não atravessa esta fronteira."
* "O compasso é sempre 4/4 nesta fase; não implementar deteção de compasso sem atualizar `docs/architecture.md` e a Tarefa 10 (que assume compassos de 4 tempos)."
* "Quando a confiança do tempo é baixa, assume-se 120 BPM com `source: 'assumed'` e avisa-se o utilizador; proibido apresentar um BPM inventado como detetado."
* "O BPM é sempre editável pelo utilizador e alterá-lo recalcula apenas de `TempoMap` para a frente — proibido repetir a inferência do modelo quando só o tempo muda."
* "`NoteEvent[]` limpo permanece no estado da sessão depois de consumido, precisamente para permitir esse recálculo; não descartar."
* "`TempoMap` tem sempre `source` preenchido (`detected` | `assumed` | `manual`) — a proveniência do andamento é informação que o utilizador vê."
* "O andamento é constante por peça; se algum dia houver variação, estende-se `TempoMap` com secções em vez de mudar as assinaturas a jusante."

## Entregáveis

* `TempoMap` produzido para qualquer entrada, incluindo casos degenerados
* BPM correto (±2) num trecho tocado com metrónomo, verificado à mão
* Aviso visível quando o andamento é assumido
* Correção manual do BPM a atualizar a pauta sem repetir a inferência
* Todos os testes da decisão acima a passar
* `AGENTS.md` atualizado com as regras acima

## Notas / Dependências

* Depende da Tarefa 8. Entrega para a Tarefa 10.
* A ambiguidade da decisão 3 vai gerar reclamações legítimas ("isto é 90, não 180"). A resposta não é melhorar o algoritmo — é a decisão 6. Garantir que o controlo de BPM é fácil de encontrar.
* Verificar o caminho da decisão 7 com atenção: é fácil deixar a cadeia de recálculo a saltar uma etapa e a pauta a ficar dessincronizada do BPM mostrado.
* Testar com um trecho em 3/4 para ver o que acontece — a pauta sairá mal barrada, e é bom saber exatamente quão mal antes de um utilizador o descobrir.
