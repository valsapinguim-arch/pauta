# Tarefa 19 — Desempenho e Limites

## Objetivo

Medir o desempenho real em dispositivos reais, fixar os limites da app com base nessas medições, e garantir que a interface se mantém fluida durante a inferência.

## Contexto

Depende da Tarefa 7 (motor de transcrição) e da Tarefa 13 (renderização). Vários limites foram fixados por estimativa nas tarefas anteriores — duração máxima de 60 s (Tarefas 4 e 5), backend WASM (Tarefa 7), redesenho completo da pauta (Tarefa 13). Esta tarefa substitui essas estimativas por números.

## Decisões adotadas

**1. Medir antes de otimizar, e registar as medições no repositório**

- Cria-se `docs/performance.md` com uma tabela de medições por dispositivo: duração do áudio, tempo de pré-processamento, tempo de inferência, tempo de renderização, memória de pico.
- Justificação: as decisões de limite desta tarefa têm de ser revisíveis por quem vier depois, e "60 segundos" sem o número que o justifica é indistinguível de um palpite. Também permite detetar regressões — sem a linha de base, uma atualização que duplique o tempo de inferência passa despercebida.

**2. Três níveis de dispositivo, medidos: telefone modesto, telefone recente, portátil**

- Justificação: um só número medido no computador de quem desenvolve não representa nada. O telefone modesto é o que define os limites, porque é onde a app falha primeiro.

**3. O limite de duração é validado ou corrigido, não mantido por inércia**

- Se num telefone modesto 60 segundos levarem mais de ~45 s a transcrever, baixa-se o limite. Se houver folga, pode subir.
- Justificação: o limite existe para evitar esperas inaceitáveis e falhas de memória (Tarefa 4, decisão 3), não por virtude do número 60. A regra prática adotada: a transcrição não deve levar mais tempo do que a duração do áudio no pior dispositivo alvo — assim a espera é sempre comparável ao que o utilizador acabou de gravar.

**4. Limite por dispositivo, não limite único**

- Deteta-se uma indicação grosseira de capacidade (`navigator.hardwareConcurrency`, `deviceMemory` quando disponível) e ajusta-se o limite de duração; o valor efetivo é sempre mostrado ao utilizador.
- Justificação: um limite único ou penaliza os dispositivos capazes ou deixa os fracos falhar. A deteção é grosseira e pode errar, portanto nunca se usa para bloquear — só para escolher um valor por omissão, e o utilizador vê qual é.

**5. Processamento por blocos com libertação incremental, em vez de um só buffer**

- O áudio é entregue ao modelo em janelas, libertando a memória de cada uma; os resultados são acumulados e unidos no fim.
- Justificação: o pico de memória, e não o tempo, é o que mata a app em iOS. Processar por blocos mantém o pico proporcional ao tamanho da janela em vez da duração total, o que é a única forma de o limite de duração poder subir.
- **Cuidado:** notas que atravessam a fronteira de duas janelas têm de ser unidas, ou aparecem cortadas em duas. Reutilizar `mergeFragmented` (Tarefa 8, decisão 6) nas fronteiras, com uma pequena sobreposição entre janelas.

**6. Progresso e resposta ao toque verificados durante a inferência, não assumidos**

- Verifica-se explicitamente que a interface responde e o progresso avança de forma monótona durante toda a transcrição no telefone mais fraco.
- Justificação: a arquitetura de workers (Tarefas 6 e 7) foi desenhada precisamente para isto, mas há caminhos que a violam sem ser óbvio — uma mensagem `postMessage` a clonar um buffer grande em vez de o transferir bloqueia a thread principal apesar de todo o trabalho estar num worker.

**7. Reavaliação do backend de execução com números**

- Comparar WASM+SIMD, WASM simples e `webgl` nos três dispositivos; WebGPU só se estiver disponível.
- Justificação: a Tarefa 7 (decisão 2) escolheu WASM por previsibilidade, explicitamente sujeito a reavaliação aqui. Se o `webgl` for consistentemente muito mais rápido **e** der os mesmos resultados nos três dispositivos, a decisão pode mudar — mas com a igualdade de resultados verificada, não só a velocidade.

**8. Orçamento de bundle inicial fixado e verificado**

- O JavaScript do arranque (sem VexFlow e sem modelo, ambos dinâmicos) fica abaixo de um limite explícito, verificado na build.
- Justificação: o modelo e o VexFlow são grandes por necessidade e já estão fora do caminho crítico (Tarefas 7 e 13). O que resta tem de se manter pequeno, ou o arranque degrada-se aos poucos sem ninguém decidir isso. Um limite verificado na build transforma a intenção em regra.

**9. Sem otimizações não medidas**

- Nenhuma alteração de desempenho entra sem um antes/depois em `docs/performance.md`.
- Justificação: a maior parte das otimizações intuitivas em código de áudio e ML não faz diferença mensurável, e algumas pioram a legibilidade em troca de nada. A tabela de medições é o critério de aceitação.

## Âmbito técnico

- Criar `docs/performance.md` com a metodologia e a tabela de medições (decisão 1)
- Medir nos três níveis de dispositivo (decisão 2): áudio de 10 s, 30 s e 60 s, registando as quatro métricas
- Validar ou corrigir o limite de duração (decisão 3) e atualizar as Tarefas 4 e 5 se mudar
- Implementar a deteção grosseira de capacidade e o limite por dispositivo (decisão 4), com o valor visível ao utilizador
- Implementar o processamento por blocos com sobreposição e união nas fronteiras (decisão 5)
- Verificar a fluidez da interface durante a inferência no dispositivo mais fraco (decisão 6); confirmar que todos os `postMessage` de buffers usam `transfer`
- Comparar backends e registar os resultados (decisão 7)
- Configurar a verificação de orçamento de bundle na build (decisão 8)
- Medir o tempo de renderização da pauta com 8, 16 e 32 compassos; se a Tarefa 13 (decisão 4) se revelar lenta, reavaliar aqui — com números
- Verificar memória ao longo de cinco transcrições consecutivas em cada dispositivo
- Testes: união de notas nas fronteiras de janelas produz o mesmo resultado que o processamento num só bloco

## Guardrails para IA (atualizar `AGENTS.md`)

- "Nenhuma alteração motivada por desempenho entra sem medição antes/depois registada em `docs/performance.md`."
- "Os limites de duração de áudio derivam das medições em `docs/performance.md`; alterá-los exige atualizar essas medições, não apenas a constante."
- "O limite efetivo de duração é sempre visível ao utilizador; a deteção de capacidade do dispositivo escolhe um valor por omissão e nunca bloqueia uma ação."
- "Áudio é processado por janelas com libertação incremental de memória; notas nas fronteiras de janelas são sempre unidas — proibido processar toda a duração num único buffer entregue ao modelo."
- "Todo o `postMessage` de um buffer de áudio usa `transfer`; clonar um buffer grande bloqueia a thread principal mesmo com o trabalho num worker."
- "O bundle inicial não inclui o modelo nem o VexFlow e respeita o orçamento verificado na build; exceder o orçamento falha a build."
- "Mudar o backend de execução do modelo exige demonstrar, nos três níveis de dispositivo, que é mais rápido E que produz os mesmos resultados."
- "A app tem de continuar a responder ao toque e a mostrar progresso monótono durante toda a inferência, no dispositivo mais fraco suportado."

## Entregáveis

- `docs/performance.md` com medições reais nos três níveis de dispositivo
- Limite de duração validado ou corrigido, com justificação numérica
- Limite por dispositivo implementado e visível
- Processamento por blocos a funcionar, com resultado idêntico ao de bloco único
- Interface fluida durante a inferência, confirmada no dispositivo mais fraco
- Comparação de backends registada, com decisão fundamentada
- Orçamento de bundle a ser verificado na build
- Sem crescimento de memória em cinco transcrições consecutivas
- `AGENTS.md` atualizado com as regras acima

## Notas / Dependências

- Depende das Tarefas 7 e 13.
- iOS é o caso limitante em memória, não em velocidade. Se algum dispositivo falhar, será um iPhone a esgotar memória — daí a decisão 5 ser a mais importante da tarefa.
- A união de notas nas fronteiras (decisão 5) é o sítio onde é fácil introduzir uma regressão invisível: notas duplicadas ou cortadas nas junções. O teste comparativo com processamento em bloco único é a defesa.
- Se as medições mostrarem que o telefone modesto não consegue mesmo cumprir a regra da decisão 3 nem com limites baixos, isso é informação de produto: convém dizer no `README.md` que dispositivos são suportados, em vez de deixar a app falhar em silêncio.
