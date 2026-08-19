# Tarefa 10 — Quantização Rítmica

## Objetivo

Converter tempos contínuos em figuras rítmicas notáveis: alinhar inícios à grelha, arredondar durações a figuras reais, inserir pausas e ligar notas que atravessam a barra de compasso.

## Contexto

Depende da Tarefa 8 (`NoteEvent[]`) e da Tarefa 9 (`TempoMap`, grelha). Entrega `QuantizedNote[]` para a Tarefa 11. Puramente `@/lib`.

## Decisões adotadas

**1. Grelha binária até à semicorchea (1/16), sem tercinas**

- Subdivisão mínima: 1/16. Figuras permitidas: semibreve, mínima, semínima, corchea, semicorchea, e as respetivas com ponto.
- Justificação: tercinas e quinálteras exigem detetar qual a subdivisão em uso em cada compasso — e uma tercina mal detetada estraga o compasso inteiro. Uma grelha binária falha de forma previsível (uma tercina aparece como corchea + semicorchea, ritmicamente errado mas legível) em vez de imprevisível. Já listado como melhoria futura no `base.md`.
- Nota: a mesma subdivisão de 1/16 num andamento mal estimado dá resultados absurdos — a qualidade desta tarefa está limitada pela Tarefa 9, e é por isso que o BPM tem de ser corrigível.

**2. Alinhar inícios ao ponto de grelha mais próximo, com deslocamento máximo**

- Cada início vai ao ponto de grelha mais próximo; se a distância exceder metade da subdivisão, aceita-se mesmo assim (não há alternativa melhor) mas conta-se como desvio para a métrica de confiança rítmica.
- Justificação: alinhar é o objetivo — é o que transforma tempo real em notação. Registar o desvio é o que permite dizer ao utilizador que a quantização está a forçar muito, o que quase sempre significa que o BPM está errado (decisão 6 da Tarefa 9).

**3. Duração quantizada independentemente do início, e só depois reconciliada**

- Primeiro alinha-se o início, depois escolhe-se a figura cuja duração mais se aproxima da real, depois verifica-se se não invade a nota seguinte.
- Justificação: quantizar o par (início, fim) em conjunto faz erros de arredondamento acumularem-se e sair da grelha ao longo do compasso. Alinhar o início de cada nota de forma absoluta impede a deriva; a duração é uma decisão local e corrigível.

**4. Sobreposições resolvidas por truncagem, nunca por deslocamento**

- Se uma nota quantizada invade o início da seguinte, encurta-se a primeira. Nunca se empurra a segunda.
- Justificação: deslocar a nota seguinte propagaria o erro em cascata pelo resto do compasso, e o início de cada nota é a informação rítmica mais audível — deve ser preservado. Encurtar afeta apenas a nota que já estava errada.

**5. Duração mínima de uma semicorchea; notas mais curtas tornam-se semicorcheas**

- Uma nota que quantize para menos do que a subdivisão mínima é promovida a semicorchea, não eliminada.
- Justificação: eliminar aqui seria descartar uma nota que já sobreviveu a todos os filtros da Tarefa 8 — se chegou até aqui, é uma nota. Promovê-la introduz um pequeno erro rítmico; eliminá-la introduz um erro melódico, que é muito mais visível.

**6. Pausas geradas a partir dos espaços, com decomposição canónica**

- Um espaço entre notas quantizadas gera pausas; um espaço que não corresponda a uma figura única é decomposto em figuras (ex.: 5/16 → corchea + semicorchea) segundo uma tabela fixa, alinhada aos limites de tempo.
- Justificação: notação legível exige que as pausas respeitem a divisão do compasso — uma pausa de mínima a começar no segundo tempo de 4/4 é tecnicamente igual em duração mas errada em leitura. Uma tabela canónica evita improvisar isto caso a caso e faz a decomposição ser testável.

**7. Notas que atravessam a barra de compasso são divididas e ligadas**

- A nota é cortada no limite do compasso e as partes unidas por ligadura de prolongação.
- Justificação: é a regra da notação musical, não uma escolha — uma nota não pode atravessar uma barra sem ligadura. A alternativa (truncar no fim do compasso) mudaria a duração real; a outra (deixar atravessar) produz notação inválida que o MusicXML e o VexFlow rejeitam ou desenham mal.

**8. Compassos preenchidos até ao fim, sempre**

- O último compasso é completado com pausas.
- Justificação: um compasso incompleto é notação inválida e faz o MuseScore e outros programas mostrar avisos ou reinterpretar a peça ao abrir o MusicXML exportado (Tarefa 15).

**9. Notas ligadas mantêm ligação ao evento original**

- Cada `QuantizedNote` guarda o índice da `NoteEvent` de origem; uma nota dividida gera vários `QuantizedNote` com o mesmo índice de origem.
- Justificação: a reprodução (Tarefa 14) tem de tocar uma nota ligada como um som só, e a edição manual (Tarefa 17) tem de alterar todas as partes de uma nota ligada em conjunto. Sem esta ligação, ambas as tarefas ficariam a inferir o que pertence a quê por proximidade — frágil e errado nos casos limite.

## Âmbito técnico

- Definir `QuantizedNote` em `@/lib/types.ts`: `pitchMidi`, `startTick`, `durationTicks`, `noteType`, `dots`, `isRest`, `tiedToNext`, `tiedFromPrevious`, `sourceIndex`, `measureIndex`
- Adotar _ticks_ como unidade interna (ex.: 480 por semínima) em vez de segundos
  - Justificação: aritmética inteira elimina os erros de vírgula flutuante que fazem um compasso somar 3.9999 tempos e falhar a validação; é também a unidade nativa do MIDI (Tarefa 15)
- Implementar em `@/lib/quantize/` como funções puras:
  - `secondsToTicks(seconds, tempoMap)` / `ticksToSeconds`
  - `snapOnset(tick, gridTicks)`
  - `chooseNoteType(durationTicks)` → figura + pontos
  - `resolveOverlaps(notes)` (decisão 4)
  - `fillRests(notes, measureTicks)` (decisão 6)
  - `splitAcrossBarlines(notes, measureTicks)` (decisão 7)
  - `padFinalMeasure(notes, measureTicks)`
  - `quantize(notes, tempoMap)` — encadeia tudo e devolve também `rhythmConfidence`
- Definir a tabela canónica de decomposição de pausas como constante
- Validar no fim: todo o compasso soma exatamente `measureTicks` — falhar explicitamente se não
- Testes:
  - quatro semínimas a 120 BPM dão quatro semínimas exatas
  - uma nota de 1.5 tempos dá semínima com ponto
  - nota a começar no tempo 4 com duração de 2 tempos divide-se e liga-se sobre a barra
  - espaço de 5/16 decompõe-se conforme a tabela
  - último compasso incompleto é preenchido
  - todo o compasso de qualquer resultado soma `measureTicks`
  - nota de 10 ms é promovida a semicorchea, não eliminada

## Guardrails para IA (atualizar `AGENTS.md`)

- "Durações internas de notação são sempre inteiros em _ticks_ (480 por semínima); proibido representar durações de notação em segundos ou em `float` — a validação de compassos depende de aritmética exata."
- "A grelha de quantização é binária até 1/16; não introduzir tercinas ou quinálteras sem atualizar `docs/architecture.md`, a Tarefa 12 e os exportadores da Tarefa 15."
- "Sobreposições resolvem-se encurtando a nota anterior; proibido deslocar o início de uma nota para resolver uma sobreposição — os inícios são a informação rítmica a preservar."
- "Uma nota nunca é eliminada na quantização; se for demasiado curta, é promovida à subdivisão mínima."
- "Notas que atravessam a barra de compasso são sempre divididas e ligadas com ligadura de prolongação; proibido truncar ou deixar atravessar."
- "Todo o compasso soma exatamente `measureTicks`, incluindo o último (preenchido com pausas). Existe uma validação explícita a garantir isto e não se desativa."
- "Pausas são decompostas segundo a tabela canónica alinhada aos tempos do compasso; proibido gerar uma pausa única que ignore a divisão do compasso."
- "Cada `QuantizedNote` mantém `sourceIndex` para a `NoteEvent` de origem; partes de uma nota ligada partilham o mesmo `sourceIndex` e são sempre tratadas em conjunto pela reprodução e pela edição."

## Entregáveis

- `quantize` a produzir compassos válidos e completos para qualquer entrada
- Ligaduras sobre barras de compasso corretas
- `rhythmConfidence` calculado e disponível
- Validação de soma de compasso ativa e a falhar quando devia
- Todos os testes da decisão acima a passar
- `AGENTS.md` atualizado com as regras acima

## Notas / Dependências

- Depende das Tarefas 8 e 9. Entrega para a Tarefa 11.
- Esta é a tarefa onde os erros são mais silenciosos: o resultado é sempre _alguma_ notação válida. A validação da soma de compassos é a única rede de segurança automática — não a tratar como opcional.
- Quando o resultado parecer ritmicamente absurdo, verificar o BPM antes de mexer nesta lógica. Nove em dez vezes o problema é a Tarefa 9.
- A tabela de decomposição de pausas (decisão 6) é o sítio onde é tentador improvisar. Escrevê-la como dados, com um teste por entrada, e não como uma cadeia de `if`.
