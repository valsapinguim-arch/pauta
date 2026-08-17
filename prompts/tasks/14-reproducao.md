# Tarefa 14 — Reprodução

## Objetivo

Ouvir a pauta: sintetizar as notas do `ScoreDocument`, com play/pause/parar, cursor sincronizado com a nota em execução, controlo de velocidade e metrónomo opcional.

## Contexto

Depende da Tarefa 12 (`ScoreDocument`) e da Tarefa 13 (SVG com `data-*` para posicionar o cursor). É a forma mais rápida de o utilizador verificar se a transcrição está certa — ouvir a pauta e comparar com o que tocou é mais imediato do que ler notação.

## Decisões adotadas

**1. Sintetizar a pauta, não reproduzir o áudio original**

- O que se ouve são as notas transcritas.
- Justificação: é exatamente isto que dá valor à funcionalidade — ouvir a transcrição revela erros (uma nota trocada, um ritmo errado) que passariam despercebidos na leitura. Tocar o áudio original não diria nada sobre a qualidade da transcrição. Consequência: o PCM original não precisa de ser retido para esta tarefa, o que é coerente com a Tarefa 5, decisão 7.

**2. Osciladores do Web Audio, sem samples de instrumento**

- Onda triangular com envelope ADSR curto, um oscilador por nota.
- Justificação: samples de piano dariam um som muito melhor mas custam megabytes de download — num projeto onde o orçamento de bytes já está gasto no modelo e no VexFlow. Uma onda triangular com envelope soa a "instrumento eletrónico simples", que é suficiente para verificar alturas e ritmos. Onda triangular e não quadrada ou serra porque tem menos harmónicos agudos e é muito menos fatigante de ouvir repetidamente.

**3. Agendamento antecipado no relógio do `AudioContext`, não com temporizadores**

- Todas as notas de uma janela são agendadas com `oscillator.start(when)` a partir de `audioContext.currentTime`; a janela avança periodicamente.
- Justificação: `setTimeout`/`setInterval` têm um erro de dezenas de milissegundos e param quando o _tab_ fica em segundo plano — o resultado seria uma reprodução ritmicamente instável, que é indistinguível de uma transcrição rítmica má. O relógio do `AudioContext` é preciso ao nível da amostra. Este é o erro clássico de áudio na web e a razão por que a funcionalidade se faz assim.

**4. Cursor animado com `requestAnimationFrame`, lendo o relógio do áudio**

- A cada frame lê-se `audioContext.currentTime` e posiciona-se o cursor na nota correspondente.
- Justificação: separa a agenda do som (precisa, antecipada) da agenda visual (a 60 fps, sem precisão crítica). Se o cursor fosse movido pelos mesmos temporizadores que o som, dessincronizava; lendo sempre o relógio do áudio, o cursor pode saltar um frame mas nunca fica à frente ou atrás do que se ouve.

**5. Notas ligadas tocam como um único som**

- Partes com o mesmo `sourceIndex` (Tarefa 10, decisão 9) e unidas por ligadura tocam como uma nota de duração somada.
- Justificação: é o significado da ligadura de prolongação. Tocar as partes separadamente produziria uma repetição que não existe na música — e faria a reprodução soar errada precisamente onde a notação está certa.

**6. Velocidade altera o andamento da reprodução, não a altura**

- Multiplicador aplicado às durações agendadas; as frequências dos osciladores não mudam.
- Justificação: por se sintetizar (decisão 1) e não se manipular áudio gravado, isto é trivial e correto. Serve para estudar um trecho rápido devagar, que é a razão principal para existir controlo de velocidade numa app de partituras.

**7. Metrónomo desligado por omissão, com clique gerado**

- Clique curto nos tempos, mais acentuado no primeiro do compasso; gerado por oscilador, não por sample.
- Justificação: ajuda a verificar se a quantização (Tarefa 10) colocou as notas nos tempos certos — se as notas não caem com o clique, o BPM está errado. Desligado por omissão porque a maioria das vezes o utilizador só quer ouvir a melodia.

**8. Parar liberta todos os osciladores agendados**

- Todos os nós agendados são desligados e desconectados; nada fica pendente.
- Justificação: osciladores agendados no futuro continuam a tocar se não forem cancelados — carregar em parar e continuar a ouvir notas é uma falha imediatamente perceptível. Como cada nota cria nós próprios, é também a única forma de não acumular nós a cada reprodução.

**9. `AudioContext` de reprodução distinto do de captura, criado a pedido**

- Criado no primeiro gesto de play, mantido para reproduções seguintes.
- Justificação: o contexto de captura é fechado ao terminar a gravação (Tarefa 4, decisão 7) e não deve ser reaproveitado. Criar a pedido e dentro de um gesto do utilizador é também o que satisfaz as políticas de autoplay dos browsers — em iOS, um contexto criado fora de um gesto fica suspenso e não emite som, sem dar erro.

## Âmbito técnico

- Implementar `@/features/notation/usePlayback(scoreDocument)`: `play()`, `pause()`, `stop()`, `setSpeed()`, `toggleMetronome()`, expõe `isPlaying`, `currentPosition`
- Implementar o agendador da decisão 3, com janela de antecipação e avanço periódico
- Implementar em `@/lib/playback/` como funções puras:
  - `scoreToEvents(scoreDocument, speed)` → lista de `{ frequencyHz, startSec, durationSec, measureIndex, elementIndex }`
  - `mergeTiedNotes(events)` (decisão 5)
  - `midiToFrequency(pitchMidi)`
  - `metronomeEvents(tempoMap, durationSec)`
- Implementar o sintetizador (oscilador + envelope) em `@/features/notation/synth.ts`
- Implementar o cursor: elemento SVG posicionado a partir dos `data-*` da Tarefa 13, animado por `requestAnimationFrame` (decisão 4)
- Implementar auto-scroll para manter o cursor visível
- Implementar limpeza total em `stop()`, ao desmontar e ao trocar de documento (decisão 8)
- Pausar a reprodução quando o documento muda (edição, mudança de BPM ou tonalidade)
- Adicionar os controlos à `ResultView`
- Testes de `@/lib/playback`: MIDI 69 dá 440 Hz; notas ligadas fundem-se numa só com duração somada; velocidade 0.5 duplica as durações sem alterar frequências; eventos de metrónomo caem nos tempos certos

## Guardrails para IA (atualizar `AGENTS.md`)

- "A reprodução sintetiza o `ScoreDocument`; nunca reproduz o áudio original — o objetivo é verificar a transcrição, não ouvir a gravação."
- "O agendamento de notas usa exclusivamente o relógio do `AudioContext` (`currentTime` + `start(when)`); proibido `setTimeout`/`setInterval` para agendar som."
- "O cursor é animado com `requestAnimationFrame` lendo `audioContext.currentTime`; proibido mover o cursor a partir de temporizadores ou de contagem de notas tocadas."
- "Notas unidas por ligadura de prolongação tocam como um único som; proibido tocar cada parte separadamente."
- "`stop()` desliga e desconecta todos os osciladores agendados, incluindo os agendados para o futuro; nenhuma nota toca depois de parar."
- "O `AudioContext` de reprodução é distinto do de captura e é criado dentro de um gesto do utilizador."
- "O controlo de velocidade altera durações, nunca frequências."
- "Metrónomo desligado por omissão."
- "A reprodução para automaticamente quando o `ScoreDocument` muda."
- "Não adicionar samples de instrumento nem bibliotecas de síntese (Tone.js) — o orçamento de bundle está comprometido com o modelo e o VexFlow."

## Entregáveis

- Reprodução funcional, ritmicamente estável, nos três browsers alvo
- Cursor sincronizado com o som, visível e a acompanhar o scroll
- Notas ligadas a soar como um só som
- Velocidade e metrónomo a funcionar
- Parar a silenciar imediatamente, sem notas pendentes
- Cinco reproduções seguidas sem acumular nós de áudio nem memória
- Testes de `@/lib/playback` a passar
- `AGENTS.md` atualizado com as regras acima

## Notas / Dependências

- Depende das Tarefas 12 e 13.
- Em iOS, criar ou retomar o `AudioContext` dentro do _handler_ do clique de play — fora disso fica suspenso e não sai som, sem erro nenhum. Mesmo problema já anotado na Tarefa 4.
- O envelope precisa de um ataque e um decaimento curtos mas não nulos: um oscilador que começa e para de forma abrupta produz um estalido audível em cada nota.
- Ouvir a pauta é a melhor ferramenta de depuração de todo o pipeline. Vale a pena usá-la para revisitar os limiares das Tarefas 7 e 8, mesmo depois da afinação feita na Tarefa 13.
