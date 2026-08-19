# Desempenho

Ver Tarefa 19. Este documento é a linha de base de medições exigida pela decisão 1: nenhuma
alteração motivada por desempenho entra sem um antes/depois aqui (decisão 9), e os limites de
duração (`MAX_RECORDING_MS`, `@/features/capture`) derivam do que estiver registado nesta tabela,
não de uma constante escolhida à parte.

## Estado desta linha de base: incompleta, por falta de dispositivos reais

**Não foi possível medir em nenhum dos três níveis de dispositivo pedidos pela decisão 2** (telefone
modesto, telefone recente, portátil) — este ambiente de execução é um contentor de desenvolvimento
sem acesso a hardware físico nem a um serviço de dispositivos remotos. Não existe forma honesta de
produzir esses números aqui; inventá-los seria pior do que não os ter.

O que este documento contém em vez disso:

- A metodologia exata a seguir quando alguém tiver acesso aos três dispositivos (para que a medição
  real, quando acontecer, preencha a tabela abaixo sem ambiguidade sobre o quê e como medir).
- Uma verificação funcional feita neste ambiente — não é medição de desempenho, é confirmação de
  que o pipeline por blocos (decisão 5) corre do princípio ao fim sem falhar e produz um resultado
  plausível. Não substitui a medição real e não deve ser lida como tal.
- Os factos que **são** verificáveis sem hardware nenhum: o orçamento de bundle (decisão 8, medido a
  sério, na build) e a confirmação por leitura de código de que todo `postMessage` de buffer usa
  `transfer` (decisão 6/guardrail).

**Antes de confiar nos limites abaixo em produção**: correr a metodologia desta secção nos três
dispositivos, preencher a tabela, e corrigir `MAX_DURATION_MS`/`MIN_DURATION_MS`
(`@/lib/performance/durationLimit.ts`) e `TRANSCRIBE_WINDOW` (`@/lib/transcribe/constants.ts`) se os
números o pedirem — são todos provisórios, escolhidos por raciocínio (ver os comentários nesses
ficheiros), não por medição.

## Metodologia (decisão 1)

Para cada dispositivo, com áudio de 10 s, 30 s e 60 s (voz ou instrumento único, não sintético):

1. Abrir a app em produção (`pnpm build && pnpm preview`, nunca `pnpm dev` — o service worker e o
   bundle de produção mudam o comportamento real).
2. Gravar (ou importar) o áudio de teste.
3. Medir, com a aba de Performance do DevTools ou `performance.now()` colado à volta de cada etapa:
   - Tempo de pré-processamento (`audio.worker.ts`, do `postMessage` de entrada ao de saída).
   - Tempo de inferência (`transcribe.worker.ts`, do `postMessage` de entrada à mensagem `result`) —
     separar a primeira transcrição da sessão (inclui carregar o modelo, Tarefa 7 decisão 4) das
     seguintes.
   - Tempo de renderização da pauta (`drawScore`, Tarefa 13) — medir à parte com 8, 16 e 32
     compassos (ver Âmbito técnico da tarefa), não só com o resultado do áudio de teste.
   - Memória de pico — `performance.memory` (só Chromium) ou o profiler de memória do Safari Web
     Inspector para iOS, que é o caso que importa (ver "iOS é o caso limitante", Notas/Dependências
     da tarefa).
4. Repetir a transcrição cinco vezes seguidas no mesmo separador, sem recarregar, e confirmar que a
   memória de pico não cresce entre repetições (o worker de transcrição é reutilizado entre
   transcrições — Tarefa 7, decisão 4 — por isso é o sítio mais provável para uma fuga).
5. Registar os seis números (três durações × pré-processamento/inferência/render) mais a memória de
   pico, na tabela abaixo, por dispositivo.

### Tabela de medições (por preencher)

| Dispositivo      | Áudio | Pré-proc. | Inferência (1ª) | Inferência (seguintes) | Render pauta | Memória de pico |
| ---------------- | ----- | --------- | --------------- | ---------------------- | ------------ | --------------- |
| Telefone modesto | 10 s  |           |                 |                        |              |                 |
| Telefone modesto | 30 s  |           |                 |                        |              |                 |
| Telefone modesto | 60 s  |           |                 |                        |              |                 |
| Telefone recente | 10 s  |           |                 |                        |              |                 |
| Telefone recente | 30 s  |           |                 |                        |              |                 |
| Telefone recente | 60 s  |           |                 |                        |              |                 |
| Portátil         | 10 s  |           |                 |                        |              |                 |
| Portátil         | 30 s  |           |                 |                        |              |                 |
| Portátil         | 60 s  |           |                 |                        |              |                 |

Regra da decisão 3, para aplicar depois de preencher: se o telefone modesto levar mais de ~45 s a
transcrever 60 s de áudio, baixar `MAX_DURATION_MS`; se houver folga, pode subir. A regra geral: a
transcrição não deve demorar mais do que a duração do áudio no pior dispositivo alvo.

## Verificação funcional feita nesta sessão (não é medição de desempenho)

Sem dispositivo real disponível, verificou-se ao vivo no browser deste ambiente (não representativo
de nenhum dos três níveis-alvo) que o pipeline por blocos (decisão 5) funciona de ponta a ponta:

- Áudio sintético de 15 s (tons puros dó4/mi4/sol4, para atravessar pelo menos uma fronteira de
  janela — `TRANSCRIBE_WINDOW.WINDOW_SEC = 10`) importado por ficheiro.
- Transcrição completa sem erros, progresso monótono até 100%, pauta desenhada com notas plausíveis
  (padrão repetido dó/mi/sol reconhecível na lista textual — Tarefa 18, `describeNotes`).
- Nenhum sintoma de nota duplicada ou cortada visível na fronteira dos 10 s.
- `Duração máxima: 60 s` visível no ecrã inicial (decisão 4) — confirma que o valor efetivo chega à
  interface, não só ao código.

A correção da fusão nas fronteiras de janela (decisão 5, o teste pedido pela tarefa) está coberta
como teste automatizado determinístico, não por esta verificação manual — ver
`src/lib/transcribe/mergeWindowedNotes.test.ts`: compara o resultado de transcrever por janelas
(com uma nota sintética a atravessar deliberadamente uma fronteira) contra o resultado de a
transcrever num só bloco, e confirma que são iguais.

## Orçamento de bundle (decisão 8) — medido a sério, não provisório

Ao contrário do resto deste documento, isto **é** uma medição real, feita na build de produção
deste repositório, verificada automaticamente por `scripts/check-bundle-budget.js` a cada
`pnpm build` (falha a build se ultrapassar):

- JavaScript de arranque (sem VexFlow, sem o modelo — os dois só entram por `import()` dinâmico):
  **~98,5 KB gzip**, contra um orçamento de **200 KB gzip**.
- VexFlow (Tarefa 13) e o modelo Basic Pitch + WASM do TensorFlow.js (Tarefa 7) ficam de fora por
  construção — nunca aparecem num `<script>` do `index.html`, só em `import()` dinâmico — por isso
  nunca entram nesta soma.

Reavaliar o orçamento (`BUDGET_KB` em `scripts/check-bundle-budget.js`) só com justificação escrita
na alteração que o exigir — não subir só porque uma build começou a falhar.

## Comparação de backends (decisão 7) — não feita

A tarefa pede comparar WASM+SIMD, WASM simples e `webgl` nos três dispositivos, com igualdade de
resultados verificada, não só velocidade. Sem dispositivos reais, esta comparação não pode ser feita
com integridade — dizer "WASM continua mais rápido" sem medir seria inventar um resultado. A escolha
de WASM da Tarefa 7 (decisão 2) mantém-se inalterada até haver essa medição.

## `postMessage` com `transfer` (guardrail) — confirmado por leitura de código

Todos os `postMessage` que transportam um buffer de áudio nesta app já usam a segunda forma
(`postMessage(msg, [buffer])`, transferência, não cópia) — confirmado por inspeção de
`src/features/transcribe/usePreprocessAudio.ts`, `src/features/transcribe/useTranscriber.ts`,
`src/workers/audio.worker.ts` e `src/workers/recorder.worklet.ts`. Não foi preciso nenhuma
alteração aqui — já estava correto desde as Tarefas 4, 6 e 7.
