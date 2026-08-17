# Tarefa 4 — Captura de Microfone

## Objetivo

Implementar a captura de áudio pelo microfone: pedido de permissão, gravação, indicador de nível em tempo real, tempo decorrido, parar e cancelar. No fim desta tarefa o botão principal grava mesmo e produz um buffer de áudio — que ainda não é transcrito.

## Contexto

Depende da Tarefa 1 (máquina de estados) e da Tarefa 3 (_slots_ `onStartRecording` e indicador de nível em `RecordingView`). Entrega o buffer que a Tarefa 6 pré-processa.

## Decisões adotadas

**1. Web Audio API com `AudioWorkletNode`, não `MediaRecorder`**

- `getUserMedia` → `MediaStreamAudioSourceNode` → `AudioWorkletNode` que acumula PCM e reporta nível.
- Justificação: `MediaRecorder` devolve um ficheiro comprimido (WebM/Opus, dependente do browser) que teria de ser descodificado outra vez, com perda e com formatos diferentes por plataforma. Como o destino é PCM `Float32Array` (Tarefa 6), capturar PCM diretamente evita uma volta de codificação/descodificação e a divergência entre browsers.
- `AudioWorklet` e não `ScriptProcessorNode`: este último está descontinuado e corre na thread principal, o que provoca falhas audíveis e uma UI a tremer durante a gravação.

**2. Gravação em memória, sem escrita intermédia**

- O PCM acumula num array de blocos, concatenado só no fim.
- Justificação: com o limite de duração da decisão 3, o pior caso são poucas dezenas de MB de `Float32Array` — cabe em memória em qualquer dispositivo alvo. Escrever para IndexedDB durante a gravação acrescentaria complexidade e latência para resolver um problema que não existe nesta escala.

**3. Duração máxima de 60 segundos, com corte automático**

- Contador visível; aos 50 s começa a avisar; aos 60 s para sozinho e passa a `processing`.
- Justificação: o produto é para trechos, não para peças inteiras — o texto do `base.md` diz "qualquer música ou trecho" e a transcrição de um trecho é onde o resultado é utilizável. Além disso o tempo de inferência cresce com a duração (Tarefa 19) e uma gravação de 10 minutos num telefone daria uma espera inaceitável e provavelmente falta de memória. Um limite explícito e visível é melhor do que uma falha por esgotamento de recursos.
- **Quando reconsiderar:** a Tarefa 19 mede o desempenho real; se houver folga, o limite pode subir. O corte automático deve manter-se em qualquer caso.

**4. Sem processamento do sinal do browser: `echoCancellation`, `noiseSuppression` e `autoGainControl` desligados**

- Passados explicitamente como `false` nas constraints de `getUserMedia`.
- Justificação: estas três funcionalidades são desenhadas para voz falada em chamadas. Aplicadas a música, o cancelamento de eco e a supressão de ruído destroem harmónicos e cortam notas sustentadas ou baixas por as considerarem ruído de fundo, e o controlo automático de ganho altera dinâmicas entre notas. Cada uma delas degrada diretamente a qualidade da transcrição. Isto é uma das decisões com maior impacto no resultado final e não deve ser mexida sem medição.

**5. Taxa de amostragem: a nativa do dispositivo, com reamostragem adiada**

- O `AudioContext` é criado sem forçar `sampleRate`; a conversão para 22050 Hz acontece na Tarefa 6.
- Justificação: forçar uma taxa no `AudioContext` faz o browser reamostrar com um algoritmo que não controlamos, e em alguns dispositivos falha ou produz artefactos. Capturar na taxa nativa e reamostrar explicitamente no worker mantém o processo determinístico e testável.

**6. Permissão pedida com explicação prévia, nunca no arranque**

- Ao carregar em "gravar" pela primeira vez, mostra-se uma explicação curta do que a app vai fazer com o microfone (incluindo que o áudio não sai do dispositivo) e só depois se chama `getUserMedia`.
- Justificação: um pedido de permissão sem contexto é negado com frequência, e no browser uma negação é difícil de reverter — o utilizador tem de ir às configurações do site. Vale mais gastar um ecrã a explicar do que perder o utilizador num diálogo do sistema.

**7. Stream sempre parado explicitamente ao terminar**

- `track.stop()` em todas as tracks, `AudioContext.close()`, worklet desligado — em fim normal, em cancelamento e em erro.
- Justificação: se o stream não é parado, o indicador de microfone ativo fica aceso no browser e no sistema operativo. Numa app que promete privacidade, um ícone de microfone que fica ligado depois de a gravação acabar é uma contradição visível ao utilizador.

**8. Nível de áudio: RMS por bloco, enviado no máximo a 30 Hz**

- O worklet calcula RMS e envia por `port.postMessage`, com limitação de frequência.
- Justificação: enviar valores a cada bloco de 128 amostras inundaria a thread principal com centenas de mensagens por segundo para animar um indicador que o olho não distingue acima de ~30 atualizações. RMS (e não pico) porque corresponde melhor à intensidade percebida.

**9. Erros de captura tratados como estados nomeados, não como exceções genéricas**

- `permission-denied`, `no-microphone`, `microphone-busy`, `not-supported`, `too-quiet`.
- `too-quiet`: se o RMS máximo da gravação ficar abaixo de um limiar, avisa-se que não se ouviu nada em vez de enviar silêncio para o modelo e devolver uma pauta vazia.
- Justificação: cada um destes casos tem uma ação diferente para o utilizador (autorizar nas configurações, ligar um microfone, fechar outra app, aproximar-se da fonte). Uma mensagem única de "erro ao gravar" deixa-o sem saber o que fazer.

## Âmbito técnico

- Criar `src/workers/recorder.worklet.ts`: acumula PCM, calcula RMS, envia nível com limitação de frequência (decisão 8)
- Implementar `@/features/capture/useMicrophone()`: `start()`, `stop()`, `cancel()`, expõe `level`, `elapsedMs`, `error`
- Aplicar as constraints da decisão 4 e a política de taxa de amostragem da decisão 5
- Implementar o ecrã de explicação prévia de permissão (decisão 6)
- Implementar o limite de duração com aviso e corte automático (decisão 3)
- Garantir limpeza total de recursos em todos os caminhos de saída (decisão 7)
- Preencher os _slots_ `onStartRecording` e o indicador de nível da `RecordingView` (Tarefa 3)
- Mapear os erros da decisão 9 para mensagens em `@/strings/errors.ts`
- Ao parar, transitar para `processing` entregando o `Float32Array` e a `sampleRate` de captura
- Testar em Chrome Android, Safari iOS e desktop; testar com permissão negada e a recuperar depois de autorizada

## Guardrails para IA (atualizar `AGENTS.md`)

- "A captura de áudio usa Web Audio + `AudioWorkletNode`; proibido `MediaRecorder` e proibido `ScriptProcessorNode` (descontinuado e corre na thread principal)."
- "`echoCancellation`, `noiseSuppression` e `autoGainControl` são sempre `false` nas constraints de `getUserMedia` — degradam a transcrição musical. Não ativar sem medição documentada que demonstre o contrário."
- "Não forçar `sampleRate` no `AudioContext` de captura; a reamostragem para 22050 Hz é responsabilidade exclusiva do worker de áudio (Tarefa 6)."
- "`getUserMedia` nunca é chamado no arranque da app nem sem explicação prévia ao utilizador — só depois de uma ação explícita de gravar."
- "Toda a saída da gravação (normal, cancelada ou com erro) para as tracks do stream e fecha o `AudioContext`; o indicador de microfone ativo nunca fica aceso depois de a gravação terminar."
- "Erros de captura são estados nomeados (`permission-denied`, `no-microphone`, `microphone-busy`, `not-supported`, `too-quiet`), cada um com a sua mensagem e ação sugerida; proibido colapsar tudo num erro genérico."
- "A gravação tem limite máximo de duração com corte automático; proibido gravação sem limite."

## Entregáveis

- Gravação funcional nos três browsers alvo, produzindo `Float32Array` + `sampleRate`
- Indicador de nível a responder ao som real, fluido durante a gravação
- Tempo decorrido, aviso de fim próximo e corte automático a funcionar
- Permissão negada mostra instruções úteis e recupera depois de autorizada
- Gravação em silêncio dá `too-quiet` em vez de pauta vazia
- Indicador de microfone do browser apaga-se sempre ao terminar
- `AGENTS.md` atualizado com as regras acima

## Notas / Dependências

- Depende das Tarefas 1 e 3. Entrega para a Tarefa 6.
- iOS exige que o `AudioContext` seja criado ou retomado dentro de um gesto do utilizador — criar no _handler_ do clique, nunca no carregamento do módulo, ou fica suspenso e grava silêncio sem dar erro.
- Ainda nesta tarefa não há transcrição: ao parar, a app entra em `processing` e fica lá (ou mostra um resultado falso). A ligação real fecha-se na Tarefa 7.
- A decisão 4 é contraintuitiva para quem está habituado a captura de voz — deixar o comentário no código a explicar porquê, ou alguém vai "corrigir" isto mais tarde de boa-fé.
