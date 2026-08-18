# AGENTS.md

Este ficheiro é dirigido a agentes de IA (Claude Code, Copilot, etc.) que trabalhem neste
repositório. Não é documentação para humanos — para isso, ver [`README.md`](README.md) e
[`docs/architecture.md`](docs/architecture.md).

Contém regras explícitas e verificáveis. É cumulativo: cada tarefa em
[`prompts/tasks/`](prompts/tasks/) deve atualizá-lo com novas regras específicas à medida que
forem tomadas decisões técnicas, em vez de criar documentação paralela.

## Regras de produto e privacidade

- O áudio do utilizador NUNCA sai do dispositivo. Proibido qualquer `fetch`, `XMLHttpRequest`,
  WebSocket ou upload que transporte áudio, PCM, ou uma transcrição para fora do browser. Não há
  backend neste projeto e nenhuma tarefa deve introduzir um sem que essa decisão seja explicitamente
  revista em [`docs/architecture.md`](docs/architecture.md).
- A app transcreve **uma linha melódica monofónica**. Qualquer funcionalidade que sugira ao
  utilizador que transcreve bandas, acordes ou gravações comerciais com fidelidade está a mentir —
  as limitações são comunicadas antes da gravação, não depois do resultado.
- Nenhuma funcionalidade exige registo, conta ou ligação à rede para funcionar.
- Telemetria é sempre opt-in e desligada por omissão; nunca inclui áudio, nem notas transcritas, nem
  nomes de ficheiro.

## Estrutura do repositório

- Aplicação única (não é mono-repo):
  ```
  /src/features/session/views/ → as 5 views do ecrã principal (Tarefa 3)
  /src/features/   → uma pasta por etapa/ecrã (capture, transcribe, notation, export, library, pwa)
  /src/components/ → inventário fechado de 7 (Button, IconButton, Sheet, Progress, Alert, Spinner,
                     Toast) + icons/ e cx.ts (suporte, fora do inventário)
  /src/workers/    → Web Workers e AudioWorklets (*.worklet.ts)
  /src/lib/        → lógica pura (sem DOM, sem I/O); /src/lib/audio/ → matemática de áudio
                     partilhada entre workers/worklets e o resto da app (ex.: calculateRms);
                     /src/lib/notes/ → limpeza da saída do modelo (Tarefa 8, ex.: cleanNotes) —
                     nenhuma pasta de @/lib tem `index.ts`; importa-se sempre o ficheiro concreto
                     (ex.: `@/lib/notes/cleanNotes`), nunca um barrel
  /src/styles/     → tokens
  /src/strings/    → textos pt-PT
  /src/test/setup.ts → configuração global do Vitest (limpeza do DOM, polyfills de jsdom)
  /src/sw.ts       → service worker (injectManifest — Tarefa 2)
  /public/models/basic-pitch/ → modelo Basic Pitch empacotado (Tarefa 7)
  /public/models/tfjs-wasm/   → binários WASM do TensorFlow.js (Tarefa 7)
  /public/*.png, /public/favicon.ico, /public/*.svg → ícones PWA (gerados, Tarefa 2)
  /scripts/        → utilitários de linha de comandos, corridos à mão (ex.: copy-model-assets.js,
                     Tarefa 7) — nunca parte do build nem do bundle da app
  /docs/           → arquitetura
  /prompts/        → plano de desenvolvimento
  ```
- Não criar pastas fora desta estrutura sem atualizar este ficheiro.
- Uma só `package.json` na raiz — este projeto NÃO é mono-repo. Não criar workspaces nem
  sub-pacotes (Tarefa 0, decisão 1).
- Imports usam sempre o alias `@/...`; a regra `no-restricted-imports` do ESLint bloqueia imports
  relativos ascendentes (`../`) e não se desativa por ficheiro nem com `eslint-disable`.

## Tooling (Tarefa 0)

- Formatação é decidida exclusivamente pelo Prettier. Nunca adicionar regras de formatação ao
  ESLint, nem discutir estilo em revisão de código — corre-se `pnpm format:write` e segue-se.
- Proibido `any`, `@ts-ignore` e `@ts-expect-error` sem um comentário que justifique e refira a
  tarefa onde a exceção foi aceite.
- Nenhum ficheiro fora da `NETWORK_ALLOWLIST` de `eslint.config.js` pode usar `fetch`,
  `XMLHttpRequest`, `WebSocket`, `EventSource` ou `navigator.sendBeacon` — incluindo as formas
  qualificadas (`window.fetch`, `globalThis.fetch`, `self.fetch`). A lista começou vazia e cresce
  uma entrada por vez, com justificação na tarefa que a acrescenta.
- Commits seguem Conventional Commits; o hook `commit-msg` valida isto e não se contorna com
  `--no-verify`. O hook `pre-commit` corre `lint-staged` e também não se contorna.
- **TypeScript está fixado na linha 6.x de propósito**: o `typescript-eslint` 8.x não suporta a API
  do TypeScript 7 e `pnpm lint` falha por completo se o TS subir. Só atualizar para TS 7 quando o
  `typescript-eslint` o suportar (ver
  [typescript-eslint#10940](https://github.com/typescript-eslint/typescript-eslint/issues/10940)) —
  e verificar `pnpm lint` na mesma alteração.
- `tsconfig.json` não usa `baseUrl` (removido no TS 7); os `paths` resolvem-se relativamente ao
  próprio ficheiro. Não reintroduzir `baseUrl`.
- Qualquer pacote importado diretamente em código (`import x from 'pacote'`) tem de estar listado
  como dependência própria no `package.json` — nunca confiar em hoisting transitivo. O pnpm é
  estrito de propósito e só liga ao `node_modules` de topo os pacotes listados; um import direto de
  algo que só existe como transitivo de outra dependência (ex.: `workbox-core`, transitivo de
  `workbox-precaching` até a Tarefa 2 o listar à parte) resolve-se hoje por acaso da árvore de
  dependências e pode partir numa atualização não relacionada.

## Estado e navegação (Tarefa 1)

- Não introduzir router, nem biblioteca de estado global (Redux, Zustand, TanStack Query), sem
  justificação escrita na tarefa que o faz — a app não tem servidor para sincronizar nem URLs
  partilháveis. Estado de sessão vive no `sessionReducer`; a biblioteca persistida (Tarefa 16) é
  acedida pelo seu próprio módulo.
- Cada feature em `@/features` expõe a sua API pública por `index.ts`; outras features (e `App.tsx`)
  importam do `index.ts`, nunca de um ficheiro interno de outra feature.
- Os tipos do pipeline (`NoteEvent`, `TempoMap`, `QuantizedNote`, `KeyAnalysis`, `ScoreDocument` e os
  restantes em `@/lib/types.ts`) vivem só ali; proibido redefinir uma versão local numa feature.

## Pipeline de transcrição

- O pipeline é uma cadeia de funções puras em `/src/lib`:
  `NoteEvent[] → TempoMap → QuantizedNote[] → KeyAnalysis → ScoreDocument → MusicXML | MIDI | VexFlow`.
  Nenhuma função em `/src/lib` acede ao DOM, ao Web Audio, ao IndexedDB, a `fetch` ou a
  `window`/`navigator` — se precisa disso, não pertence a `/src/lib`. **Isto é imposto pelo ESLint**
  (bloco `files: ['src/lib/**/*.ts']` em `eslint.config.js`), não só documentado: importar React,
  `window`, `document`, `navigator`, `fetch`, `AudioContext` ou uma feature a partir de `@/lib` falha
  o lint com uma mensagem que explica porquê.
- Áudio entregue ao worker de transcrição é SEMPRE mono a 22050 Hz. O worker valida isto e falha
  explicitamente se não for o caso; proibido assumir que o chamador converteu.
- `ScoreDocument` é a única representação da partitura na aplicação. Renderizador, reprodutor,
  exportadores e editor consomem todos o mesmo documento — proibido criar um modelo paralelo para
  desenhar ou para exportar.
- Trabalho de descodificação ou inferência NUNCA corre na thread principal. Se bloqueia a UI, vai
  para um worker.

## Captura de microfone (Tarefa 4)

- Captura de áudio usa Web Audio + `AudioWorkletNode` (`src/workers/recorder.worklet.ts`); proibido
  `MediaRecorder` (formato comprimido dependente do browser) e proibido `ScriptProcessorNode`
  (descontinuado, corre na thread principal).
- `echoCancellation`, `noiseSuppression` e `autoGainControl` são sempre `false` nas constraints de
  `getUserMedia` (`AUDIO_CONSTRAINTS` em `useMicrophone.ts`) — degradam a transcrição musical
  (cortam harmónicos e notas sustentadas, alteram dinâmicas). Não ativar sem medição documentada que
  demonstre o contrário; é contraintuitivo para quem vem de captura de voz, e é fácil "corrigir" isto
  de boa-fé sem essa medição.
- Nunca forçar `sampleRate` no `AudioContext` de captura; a reamostragem para 22050 Hz é
  responsabilidade exclusiva do worker de áudio (Tarefa 6).
- `getUserMedia` nunca é chamado no arranque nem sem explicação prévia — só depois de uma ação
  explícita de gravar, e só depois de mostrar a explicação uma vez por dispositivo
  (`needsPermissionExplainer` em `useRecordingFlow`, persistida em `localStorage`).
- Toda a saída da gravação (normal, cancelada, com erro, ou o próprio componente a desmontar) para
  as tracks do stream e fecha o `AudioContext` — `useMicrophone`'s `cleanup()` é o único sítio que o
  faz, chamado a partir de `stop`, `cancel`, e de um efeito de desmontagem. Não duplicar esta lógica
  noutro sítio.
- Erros de captura são estados nomeados (`permission-denied`, `no-microphone`, `microphone-busy`,
  `not-supported`, `too-quiet`, `MicrophoneErrorCode` em `useMicrophone.ts`), cada um com mensagem e
  ação próprias em `@/strings/errors.ts` (`microphoneErrors`); proibido colapsar num erro genérico ou
  mostrar `state.code` cru ao utilizador.
- A gravação tem limite máximo de duração com corte automático (`MAX_RECORDING_MS`,
  `WARNING_THRESHOLD_MS`, exportados de `@/features/capture`); proibido gravação sem limite.
- **AudioWorklet é um TERCEIRO tipo de ambiente global** (nem DOM, nem WebWorker) — ficheiros
  `src/workers/*.worklet.ts` usam `tsconfig.worklet.json` (`types: ["audioworklet"]`, `lib:
["ES2022"]` só) e ficam excluídos de `tsconfig.json` e de `tsconfig.worker.json`. `pnpm typecheck`
  corre os três tsconfigs.
- **Bundling de um AudioWorklet no Vite exige o sufixo `?worker&url`**
  (`import url from '@/workers/x.worklet.ts?worker&url'`), nunca `new URL('./x.worklet.ts',
import.meta.url)` — este último não passa o ficheiro pelo pipeline de build (TypeScript não é
  transpilado, imports não são resolvidos) e falha só em runtime, silenciosamente, quando
  `audioWorklet.addModule()` tenta carregar `.ts` cru como JavaScript. Ao adicionar um novo worklet,
  confirmar sempre com `pnpm build` que aparece como chunk próprio em `dist/assets/`.
- Funções pequenas e puras partilhadas entre o worklet e o resto da app (ex.: `calculateRms`) vivem
  em `@/lib/audio/` — corre em Node (testável) e no `AudioWorkletGlobalScope` (sem `lib.dom`) sem
  alterações, porque só usa `Float32Array` e matemática, nada específico de nenhum dos dois ambientes.
- Nunca mutar `ref.current` diretamente no corpo de um componente/hook durante o render (só dentro de
  efeitos, handlers ou funções assíncronas) — a versão instalada do `eslint-plugin-react-hooks`
  bloqueia isto com erro (`react-hooks/refs`), mesmo para o padrão comum de "manter uma ref sempre
  atualizada com as props mais recentes".

## Importação de ficheiro (Tarefa 5)

- A descodificação de áudio usa exclusivamente `AudioContext.decodeAudioData`; proibido introduzir
  `ffmpeg.wasm` ou qualquer descodificador em JavaScript — o custo de bundle não é justificável
  neste projeto.
- Formatos são validados por tentativa de descodificação, nunca por extensão ou MIME type; a
  extensão só serve para o filtro do seletor de ficheiros (`accept="audio/*"`).
- Ficheiros de vídeo não são aceites como entrada, mesmo que o browser os descodifique — não são
  oferecidos no seletor (`accept="audio/*"` já os exclui); não acrescentar deteção extra por
  extensão ou MIME para os bloquear no _drop_, isso contradiria a validação por tentativa acima.
- As Tarefas 4 e 5 convergem no mesmo formato de saída (`Float32Array` + `sampleRate`); proibido
  que o resto do pipeline saiba se o áudio veio do microfone ou de um ficheiro. Um `AudioBuffer`
  multicanal é reduzido a um só canal com `downmixToMono` (`@/lib/audio/downmixToMono.ts`) antes de
  sair de `useFilePicker` — é o que garante a mesma forma de saída de um ficheiro estéreo.
- O `File` e o `ArrayBuffer` originais são libertados imediatamente após a descodificação (a
  variável sai de âmbito assim que `processFile` termina); apenas o PCM e o nome do ficheiro
  sobrevivem, guardados em `AudioSource` (`session.startProcessing({ kind: 'file', name })`).
- Áudio que exceda a duração máxima (`MAX_RECORDING_MS`, partilhado com a Tarefa 4) é truncado com
  confirmação do utilizador (`pendingTruncation` em `useFilePicker`, mostrado como _sheet_ em
  `IdleView`), nunca rejeitado silenciosamente nem processado por inteiro.
- Erros de importação (`FileErrorCode` em `useFilePicker.ts`) partilham o catálogo da Tarefa 4
  (`getErrorMessage` em `@/strings/errors.ts`); `too-quiet` é literalmente o mesmo código nos dois
  caminhos de entrada — não redefinir a sua mensagem em `fileErrors`.
- A zona de _drop_ em `IdleView` só aparece com `@media (pointer: fine)` — deteção por CSS, nunca
  por JavaScript (`navigator.maxTouchPoints` ou equivalente); o botão "Usar um ficheiro de áudio" é
  o único caminho garantido em todos os dispositivos.

## Pré-processamento de áudio (Tarefa 6)

- O pré-processamento corre sempre em `src/workers/audio.worker.ts`; proibido reamostrar ou
  filtrar na thread principal.
- A ordem das etapas é fixa: `mono → passa-baixo → reamostrar → cortar silêncio → normalizar`
  (`toMono` → `lowPassFilter` → `resample` → `trimSilence` → `normalizePeak`, todas em
  `@/lib/audio/`). Trocar a ordem altera o resultado e não é uma otimização — não reordenar.
- Reduzir a taxa de amostragem sem aplicar antes um filtro passa-baixo abaixo da nova frequência
  de Nyquist é proibido: produz notas fantasma na pauta. O cutoff (`LOW_PASS_CUTOFF_HZ`, ~10.5 kHz)
  é fixo, independente da taxa de entrada.
- Proibido reamostrar por interpolação linear ou via `OfflineAudioContext`; a reamostragem é a
  implementação de Lanczos (sinc janelado) em `@/lib/audio/resample.ts`, porque o resultado tem de
  ser determinístico e testável em Node, sem áudio real.
- Conversão para mono (`@/lib/audio/toMono.ts`) é sempre por média dos canais; proibido usar apenas
  o primeiro canal. Partilhada com a Tarefa 5 (importação de ficheiro), que já precisa dela para um
  ficheiro estéreo caber no `Float32Array` único que o resto do pipeline espera.
- A normalização (`@/lib/audio/normalizePeak.ts`) é um ganho de pico único e uniforme; proibido
  compressão, limitação ou _noise gating_ — alteram as relações de amplitude entre notas, que o
  pipeline usa a jusante.
- Silêncio só é cortado nas pontas (`@/lib/audio/trimSilence.ts`), nunca no interior do sinal —
  silêncio interior são pausas musicais. O deslocamento cortado no início é sempre devolvido como
  `trimOffsetSamples` e tem de ser propagado até à reprodução (Tarefa 14) e ao alinhamento rítmico
  (Tarefa 9).
- `assertModelInput` (`@/lib/audio/assertModelInput.ts`) corre sempre antes de o worker devolver o
  resultado; proibido desativá-la por performance. `MODEL_SAMPLE_RATE` (22050 Hz) só é definido
  nesse ficheiro — quem precisar da taxa do modelo importa-a de lá, não redefine o número.
- Buffers são transferidos (`postMessage(msg, [buffer])`) e não clonados, nos dois sentidos; depois
  de enviar um buffer, o emissor nunca volta a lê-lo (`useFilePicker`/`usePreprocessAudio` não leem
  `audio.pcm` depois de o passar ao worker).
- O protocolo de mensagens do worker vive em `src/workers/audio.worker.types.ts`, um ficheiro só de
  tipos — nunca em `audio.worker.ts`. Motivo: `audio.worker.ts` usa `self.postMessage`/`onmessage`
  (lib `WebWorker`, `tsconfig.worker.json`) e é excluído do `tsconfig.json` principal; se o hook em
  `@/features/transcribe` (compilado sob o `tsconfig.json` principal, lib `DOM`) importasse tipos
  diretamente de `audio.worker.ts`, o TypeScript seguiria o import e tentaria verificar esse
  ficheiro sob a configuração errada. Um ficheiro de tipos puro, sem globals de nenhum dos dois
  ambientes, evita o conflito — qualquer tipo novo do protocolo entra aí, nunca em `audio.worker.ts`.
- O worker de áudio é descartável — criado por transcrição, terminado no fim, no erro ou ao
  cancelar (`usePreprocessAudio`); nunca reutilizado entre transcrições. É diferente do worker de
  transcrição (Tarefa 7), que carrega um modelo caro e é mantido vivo — não confundir os dois
  ciclos de vida.
- Cancelar durante `processing` chama `worker.terminate()` (nunca uma _flag_ verificada a meio: a
  convolução em curso não é interrompível de dentro). `usePreprocessAudio.cancel()` só termina o
  worker de áudio — não mexe na sessão (ver Tarefa 7: há dois workers no pipeline agora, e
  `session.cancel()` só pode ser chamado uma vez; `App.tsx` é que termina os dois e só depois cancela
  a sessão).
- O PCM capturado (Tarefas 4/5) NUNCA vive no estado da sessão (`SessionState`) — é entregue
  diretamente de `useRecordingFlow`/`useFilePicker` a `usePreprocessAudio.run()` por chamada direta,
  não por um campo em `session.state`. Motivo: o mecanismo `?state=processing` (Tarefa 3) força esse
  estado sem nunca passar por uma captura real, e um worker a arrancar sozinho a partir de um estado
  de desenvolvimento forjado (com PCM vazio) seria um efeito secundário invisível e errado desse
  mecanismo. Não reintroduzir `audio`/`pcm` em `SessionState`/`SessionAction` para "simplificar" a
  passagem de dados — é uma armadilha já considerada e rejeitada.

## Motor de transcrição (Tarefa 7)

- TensorFlow.js e `@spotify/basic-pitch` só podem ser importados por `src/workers/transcribe.worker.ts`;
  proibido importá-los na thread principal ou em qualquer outro módulo (incluindo o barrel
  `@/features/transcribe/index.ts` — nunca reexportar de lá algo que force esse import, nem sequer um
  valor como `MODEL_THRESHOLDS`; ver a nota abaixo sobre porque o protocolo de mensagens vive num
  ficheiro à parte). Mantê-los confinados é o que permite testar o resto do pipeline sem modelo.
- **`@spotify/basic-pitch` traz a sua própria versão de `@tensorflow/tfjs` (`^3.2.0`, 2021).** Sem um
  override a forçar a árvore inteira a partilhar a nossa versão (`pnpm-workspace.yaml`, campo
  `overrides`), ficam DUAS instâncias de tfjs no mesmo worker — uma delas nunca vê o backend
  registado pela outra (`tf.setBackend('wasm')` numa instância, `model.execute()` a correr contra o
  registo da outra) e a inferência falha com "backend not found", só em runtime, nunca no build nem
  no typecheck. Confirmar com `pnpm why @tensorflow/tfjs` que só aparece UMA versão sempre que esta
  dependência ou o override mudarem.
- A saída do modelo é convertida para `NoteEvent[]` (`@/lib/types.ts`) dentro do worker; nenhuma
  estrutura do TensorFlow.js (tensores, `GraphModel`) nem do `@spotify/basic-pitch`
  (`NoteEventTime`, `pitchBends`) atravessa a fronteira do worker.
- O modelo (`public/models/basic-pitch/`) e os binários WASM (`public/models/tfjs-wasm/`) são
  servidos de `/models/` na própria origem — nunca de CDN. São copiados de `node_modules` para
  `public/` por `pnpm copy-model-assets` (`scripts/copy-model-assets.js`), corrido à mão e
  versionado — não regenerado a cada build (mesmo padrão de `pnpm generate-pwa-assets`, Tarefa 2).
  Depois de atualizar `@spotify/basic-pitch` ou `@tensorflow/tfjs-backend-wasm`, correr o script de
  novo e rever o diff dos binários.
- `public/models/**` fica sempre FORA do precache manifest da shell (`injectManifest.globIgnores` em
  `vite.config.ts`) — tem cache própria e dedicada em `src/sw.ts` desde a Tarefa 2
  (`pauta-model-v1`, `StaleWhileRevalidate`, rota `/models/**`). Uma atualização da app nunca deve
  obrigar a descarregar o modelo outra vez.
- O worker de transcrição é reutilizado entre transcrições e o modelo carrega uma vez por sessão
  (`basicPitch`, estado de módulo em `transcribe.worker.ts`) — proibido recriar o worker por
  transcrição. É o oposto do worker de áudio (Tarefa 6), descartável; não confundir os dois ciclos
  de vida.
- Cancelar uma transcrição faz `worker.terminate()` (`useTranscriber.cancel`, que não mexe na
  sessão — ver a nota da Tarefa 6 acima); a próxima `transcribe()` recria o worker e recarrega o
  modelo. Proibido cancelamento por _flag_ verificada entre janelas — a inferência de uma janela em
  curso não é interrompível de dentro.
- **`BasicPitch.evaluateModel` (dentro do pacote `@spotify/basic-pitch`) não liberta os tensores que
  cria a cada janela de 2 s.** Não é algo que se possa corrigir editando `node_modules`. Contornado
  envolvendo cada chamada com `tf.engine().startScope()`/`endScope()` — os primitivos por baixo de
  `tf.tidy()`, que funcionam através de `await`s (`tidy()` exige uma função síncrona, incompatível
  com `evaluateModel`). Sem isto, memória cresce a cada transcrição dentro do mesmo worker
  reutilizado. Qualquer chamada nova a `evaluateModel` (ou a outro método do `BasicPitch` que corra
  o modelo) tem de ficar dentro do mesmo par `startScope`/`endScope`.
- Limiares do modelo (`MODEL_THRESHOLDS` em `transcribe.worker.ts`: `ONSET_THRESHOLD`,
  `FRAME_THRESHOLD`, `MIN_NOTE_LENGTH_MS`) vivem só ali, marcados como provisórios até afinação com
  áudio real (Tarefa 13); proibido passar valores literais nas chamadas a `outputToNotesPoly`.
- Backend de execução: tenta `wasm` (SIMD/threads negociados automaticamente por `setWasmPaths`, sem
  deteção manual), cai para `webgl` só se o WASM falhar a inicializar. Nunca WebGPU nesta fase — só
  reavaliar com medições documentadas (Tarefa 19). Cross-origin isolation (necessária para threads no
  WASM) não está configurada — sem os cabeçalhos COOP/COEP no _hosting_, o backend usa
  automaticamente a variante só-SIMD; isto é aceitável e não é um bug a corrigir aqui.
- O protocolo de mensagens do worker vive em `src/workers/transcribe.worker.types.ts`, um ficheiro só
  de tipos — mesmo padrão e mesma razão da Tarefa 6 (`audio.worker.types.ts`): evita que
  `@/features/transcribe/useTranscriber` (lib `DOM`) arraste o corpo do worker (lib `WebWorker`,
  TensorFlow.js incluído) para o programa errado.
- A primeira transcrição de uma sessão mostra sempre a etapa `preparing-model` (distinta de
  `transcribing`) — o utilizador tem de perceber que a espera de descarregar o modelo é só desta vez.
  O progresso mostrado é real nas duas etapas (`preparing-model`: bytes do modelo descarregados via
  `tf.loadGraphModel`'s `onProgress`; `transcribing`: fração de janelas de 2 s inferidas) — não há
  barra indeterminada em `ProcessingView` desde esta tarefa.

## Pós-processamento de notas (Tarefa 8)

- A remoção de harmónicos (`removeHarmonics`) corre sempre ANTES da redução a monofonia
  (`reduceToMonophonic`) — pela ordem inversa a pauta sai uma oitava acima em passagens inteiras. A
  ordem de `cleanNotes` é fixa: `sortByOnset → mergeFragmented → removeHarmonics →
reduceToMonophonic → filterByDuration → filterByAmplitude → computeConfidence`. Não reordenar.
- Em notas simultâneas mantém-se sempre a mais aguda (`reduceToMonophonic`); proibido mudar o
  critério para amplitude ou duração sem justificação medida contra áudio real. As notas descartadas
  são-no por inteiro — nunca cortadas, aparadas ou ajustadas.
- Filtros de amplitude (`filterByAmplitude`) são sempre relativos à amplitude MEDIANA das notas
  detetadas; proibido limiar absoluto — trata mal os dois extremos (elimina tudo numa gravação
  fraca, nada numa forte).
- Proibido inventar, interpolar ou "corrigir" notas em qualquer função de `@/lib/notes`: não se
  preenchem lacunas, não se ajustam alturas a uma escala, não se suavizam saltos. O que o modelo não
  detetou não existe — isto é diferente da grafia segundo a tonalidade (Tarefa 11), que decide COMO
  escrever uma altura já detetada, nunca inventa altura nenhuma.
- `computeConfidence` é só informativa — nunca bloqueia o pipeline nem impede o utilizador de ver o
  resultado, seja qual for o valor. `0` só acontece com entrada vazia ou quando a limpeza descarta
  tudo; não confundir com um erro.
- Constantes de limpeza vivem exclusivamente em `NOTE_CLEANUP` (`@/lib/notes/constants.ts`),
  marcadas como provisórias até afinação com áudio real (Tarefa 13) — proibido valor literal dentro
  das funções de `@/lib/notes`. Interagem com `MODEL_THRESHOLDS` (Tarefa 7): apertar um permite
  aliviar o outro; afinar os dois em conjunto.
- Funções de `@/lib/notes` são puras e testadas com notas escritas à mão — nunca precisam de áudio
  nem do modelo para serem exercitadas. Cada ficheiro de função tem o seu próprio teste (mesma
  convenção de `@/lib/audio`); sem exceções.
- `cleanNotes` corre na thread principal (dentro de `useTranscriber`), não no worker de transcrição:
  é lógica pura e barata, e o worker existe só para o que precisa mesmo de lá estar — o modelo
  (Tarefa 7, decisão 9).

## PWA e service worker (Tarefa 2)

- `src/sw.ts` é escrito à mão (`strategies: 'injectManifest'` em `vite.config.ts`); proibido mudar
  para `generateSW` — a política de cache do modelo e o fluxo de atualização dependem de controlo
  explícito que `generateSW` não expõe.
- O modelo de ML (Tarefa 7) tem cache própria (`pauta-model-v1`, `stale-while-revalidate`), sempre
  FORA do precache manifest da shell; uma atualização da app nunca deve obrigar a descarregar o
  modelo outra vez.
- Proibido `self.skipWaiting()` automático em `install`. O service worker só sai de `waiting` ao
  receber `{ type: 'SKIP_WAITING' }` da app — e a app só envia essa mensagem depois de o utilizador
  clicar em "Atualizar" (nunca sozinha, nunca em resposta a um temporizador).
- O aviso de atualização (`useAppUpdate`) e o convite de instalação (`useInstallPrompt`) nunca
  aparecem com a sessão em `recording` ou `processing`, nem o convite de instalação na primeira
  visita. Ambos os hooks recebem `SessionStatus` e derivam a visibilidade a partir dele — não
  reimplementar esta condição noutro sítio.
- Não adicionar regras de cache de runtime (`registerRoute`) para domínios externos, nem carregar
  fontes, scripts ou imagens de CDN no service worker — todos os assets são locais.
- Não registar `notificationclick`, `push` ou background sync no service worker; a app não tem
  servidor e não usa estas capacidades.
- `src/sw.ts` e `src/workers/**/*.ts` (exceto `*.worklet.ts`, que tem o seu próprio
  `tsconfig.worklet.json` — ver Tarefa 4) usam `tsconfig.worker.json` (lib `WebWorker`, não `DOM`) e
  ficam excluídos do `tsconfig.json` principal — `pnpm typecheck` corre os três tsconfigs (principal,
  worker, worklet). Não remover nenhum deles de `exclude`/`include` nem apagar os ficheiros.
- Os ícones em `public/` (`pwa-*.png`, `maskable-icon-*.png`, `apple-touch-icon-*.png`,
  `favicon.ico`) são gerados por `pnpm generate-pwa-assets` a partir de `public/pwa-icon.svg`
  (`pwa-assets.config.ts`) — nunca editados à mão nem gerados por outra ferramenta. Alterar o ícone
  é sempre: editar o SVG → correr o script → commitar os PNGs resultantes.
- Testar sempre com `pnpm preview` (nunca `pnpm dev`) para qualquer coisa relacionada com o service
  worker ou instalação — em `vite dev` o service worker está desativado de propósito
  (`devOptions.enabled: false`).

## Interface (Tarefa 3)

- O interface é deliberadamente mínimo. Antes de adicionar um componente, um ecrã, um menu ou uma
  opção de configuração, verificar se o fluxo principal (gravar → ver pauta → exportar) fica
  mesmo melhor com ele. A resposta por omissão é não.
- Inventário de componentes fechado: `Button`, `IconButton`, `Sheet`, `Progress`, `Alert`,
  `Spinner`, `Toast` (`src/components/`, cada um com `index.ts` + `.types.ts` + `.module.css` +
  `.test.tsx`). Acrescentar um oitavo exige justificação escrita na tarefa que o introduz — a
  Tarefa 16 provavelmente precisa de uma `List`, a Tarefa 17 de um controlo de seleção, e é lá que
  se decide, não antes. `icons/` e `cx.ts` não contam para este inventário: são suporte (glifos e um
  utilitário de classes), não primitivas de interação com opinião de design própria.
- Não introduzir bibliotecas de componentes (MUI, Chakra, shadcn) nem frameworks de CSS (Tailwind,
  styled-components) — CSS Modules + tokens é a única abordagem de estilo. Radix (pacote unificado
  `radix-ui`) só entra onde há acessibilidade não trivial a resolver (hoje: só `Toast`); um `<button>`
  ou um `<div>` sem gestão de foco/anúncio próprio não precisa de primitiva nenhuma por cima.
- Existe um ecrã principal com estados mutuamente exclusivos
  (`idle`, `recording`, `processing`, `result`, `error`) geridos por uma máquina de estados
  explícita; proibido representar este fluxo com múltiplos booleanos independentes. Cada estado tem
  exatamente uma view em `src/features/session/views/` (`IdleView`, `RecordingView`,
  `ProcessingView`, `ResultView`, `ErrorView`), escolhida por `switch` exaustivo em `App.tsx`
  (`assertNever` no `default` — TypeScript falha a compilar se um estado novo ficar por tratar).
  Proibido renderizar duas views ao mesmo tempo ou condicionar parte de uma view a dados de outro
  estado.
- Cor, espaçamento, tipografia, radius e sombra vêm sempre dos tokens em `/src/styles/tokens.css`
  via `var(--token)`; proibido valor literal (ex.: `#ffffff`, `16px`) dentro de um componente ou
  view. Nenhuma página ou feature estiliza elementos HTML base (`<button>`, `<input>`) diretamente —
  usa sempre o componente correspondente, importado de `@/components`.
- Todo o texto visível ao utilizador é pt-PT e vive em `@/strings`, nunca inline no JSX.
- O aviso sobre a limitação a instrumento único (`idle.limitationNotice`) é mostrado em `IdleView`,
  antes de gravar. Proibido removê-lo, escondê-lo atrás de um ecrã de ajuda, ou mostrá-lo só depois
  do resultado.
- O botão de gravar (`IdleView`, `Button` com `shape="circle" size="lg"`) é o único elemento
  visualmente primário do ecrã principal; qualquer ação nova entra como secundária
  (`variant="secondary"` ou `IconButton`).
- Não adicionar alternador de tema — o modo escuro segue `prefers-color-scheme`, sem exceção.
- Sem animações de transição entre estados/views (Tarefa 3, decisão 9) — só _feedback_ imediato
  (`Spinner`, `Progress`, nível de áudio). A Tarefa 18 revê isto por inteiro, incluindo
  `prefers-reduced-motion`; não antecipar.
- `?state=idle|recording|processing|result|error` (mais `&stage=` em `processing` e
  `&recoverable=false` em `error`) força o estado inicial da sessão — só em
  `import.meta.env.DEV` (`getDevStateOverride`, `src/features/session/devStateOverride.ts`), nunca
  entra no bundle de produção. É o mecanismo para rever qualquer view sem pipeline nenhum a
  funcionar; não construir um segundo.
- Props de componentes com `exactOptionalPropertyTypes: true`: quando o valor passado pode ser
  `condição ? x : undefined` (em vez de a prop ser simplesmente omitida), o tipo da prop precisa do
  `| undefined` explícito (ex.: `value?: number | undefined`) — sem isto o `tsc` rejeita. Já
  acontece em `ProgressProps` e `ToastProps`; ao criar uma prop opcional nova que pode receber
  `undefined` de propósito (não só por omissão), aplicar o mesmo padrão desde o início.

## Testes de componentes (Tarefa 3)

- `@testing-library/react` + `jsdom`, ambiente por ficheiro via `// @vitest-environment jsdom` no
  topo (nunca `environment: 'jsdom'` global no `vitest.config.ts` — isso puxaria jsdom para os
  testes de `@/lib`, que devem continuar a correr em `node`).
- `src/test/setup.ts` (via `test.setupFiles`) trata de duas lacunas que, sem ele, produzem falhas
  confusas e não relacionadas com o componente em teste: (1) limpeza automática do DOM entre testes
  — este projeto não usa `test.globals: true`, por isso o Testing Library não deteta `afterEach`
  sozinho; (2) polyfill de `hasPointerCapture`/`setPointerCapture`/`releasePointerCapture`/
  `scrollIntoView`, que o jsdom não implementa e de que o Radix Toast depende para o gesto de
  arrastar. Não remover nenhuma das duas partes.
- Todo componente do inventário fechado tem `ComponentName.test.tsx`: renderiza, responde a
  interação (`@testing-library/user-event`), e cobre o estado desativado quando aplicável.

## Qualidade

- Toda a função nova em `/src/lib` tem teste unitário — sem exceções. É a parte do sistema onde os
  bugs são silenciosos (uma pauta errada não estoura, só está errada).
- Proibido `any` em código novo; a saída do modelo e o `ScoreDocument` têm tipos explícitos.
- Erros mostrados ao utilizador explicam o que fazer a seguir; proibido expor mensagens técnicas
  cruas (`TypeError`, stack traces) na interface.
