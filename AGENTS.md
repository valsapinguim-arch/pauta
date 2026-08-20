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
  /src/features/   → uma pasta por etapa/ecrã (capture, transcribe, notation, export, library, pwa);
                     /src/features/export/fonts/ → Bravura/Academico em .ttf, vendorizados para o
                     PDF (Tarefa 15) — não são os ícones PWA nem assets de UI;
                     /src/features/library/ → biblioteca local em IndexedDB (Tarefa 16, ex.: db.ts,
                     repository.ts, useLibraryAutosave.ts) — `db.ts` e `repository.ts` são os únicos
                     ficheiros do repositório que importam `idb`;
                     /src/features/diagnostics/ → registo local de erros em anel e ecrã de
                     diagnóstico (Tarefa 21, ex.: errorLog.ts, telemetryConsent.ts, useDiagnostics.ts)
                     — base de dados IndexedDB própria (`pauta-diagnostics`), separada de
                     `pauta-library`
  /src/components/ → inventário fechado de 9 (Button, IconButton, Sheet, Progress, Alert, Spinner,
                     Toast, Input, List — Tarefas 12 e 16) + icons/ e cx.ts (suporte, fora do
                     inventário)
  /src/workers/    → Web Workers e AudioWorklets (*.worklet.ts)
  /src/lib/        → lógica pura (sem DOM, sem I/O); /src/lib/audio/ → matemática de áudio
                     partilhada entre workers/worklets e o resto da app (ex.: calculateRms);
                     /src/lib/notes/ → limpeza da saída do modelo (Tarefa 8, ex.: cleanNotes);
                     /src/lib/playback/ → eventos de reprodução (Tarefa 14, ex.: scoreToEvents);
                     /src/lib/export/ → MusicXML e MIDI (Tarefa 15, ex.: toMusicXml, toMidi);
                     /src/lib/migrations/ → migração de `ScoreDocument` persistido por
                     `schemaVersion` (Tarefa 16, ex.: migrateDocument);
                     /src/lib/transcribe/ → processamento por blocos (Tarefa 19, ex.: planWindows,
                     mergeWindowedNotes) — só a parte pura; o `evaluateModel` em si fica em
                     `transcribe.worker.ts`, que não é @/lib;
                     /src/lib/performance/ → decisão de limite de duração por capacidade do
                     dispositivo (Tarefa 19, ex.: chooseDurationLimitMs) — a leitura do `navigator`
                     em si fica em `@/features/capture/deviceCapability.ts`, que não é @/lib;
                     /src/lib/errors.ts → catálogo único de erros nomeados (Tarefa 21, decisão 1);
                     /src/lib/telemetry.ts → fila de eventos e verificação da lista permitida (Tarefa
                     21, decisão 8) — puro, sem `localStorage`; o consentimento em si fica em
                     `@/features/diagnostics/telemetryConsent.ts`;
                     /src/lib/withTimeout.ts → limite de tempo para operações baseadas em promessa
                     (Tarefa 21, decisão 6) —
                     nenhuma pasta de @/lib tem `index.ts`; importa-se sempre o ficheiro concreto
                     (ex.: `@/lib/notes/cleanNotes`), nunca um barrel
  /src/styles/     → tokens
  /src/strings/    → textos pt-PT
  /src/test/setup.ts → configuração global do Vitest (limpeza do DOM, polyfills de jsdom)
  /src/test/axe.ts → `expectNoA11yViolations` (Tarefa 18)
  /src/sw.ts       → service worker (injectManifest — Tarefa 2)
  /public/models/basic-pitch/ → modelo Basic Pitch empacotado (Tarefa 7)
  /public/models/tfjs-wasm/   → binários WASM do TensorFlow.js (Tarefa 7)
  /public/*.png, /public/favicon.ico, /public/*.svg → ícones PWA (gerados, Tarefa 2)
  /scripts/        → utilitários de linha de comandos (ex.: copy-model-assets.js, Tarefa 7, corrido
                     à mão) — nunca parte do bundle da app; check-bundle-budget.js (Tarefa 19) é
                     exceção: corre a cada `pnpm build`, não só à mão
  /docs/           → arquitetura (architecture.md), desempenho (performance.md, Tarefa 19)
  /prompts/        → plano de desenvolvimento
  /tests/fixtures/audio/ → WAV sintéticos de teste (Tarefa 20, generate.js,
                     `pnpm generate-audio-fixtures`) — só `*.min.wav` fica versionado
  /e2e/            → testes Playwright (Tarefa 20): percursos, regressão, PWA/offline
  /playwright.config.ts → configuração do Playwright (Tarefa 20)
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

## Deteção de tempo (Tarefa 9)

- A deteção de tempo trabalha exclusivamente sobre `NoteEvent[]`; proibido reprocessar o PCM em
  `@/lib/tempo` — o áudio não atravessa esta fronteira.
- O compasso é sempre 4/4 nesta fase; não implementar deteção de compasso sem atualizar
  `docs/architecture.md` e a Tarefa 10 (que assume compassos de 4 tempos).
- Quando a confiança do tempo é baixa (`TEMPO.MIN_CONFIDENCE` em `@/lib/tempo/constants.ts`),
  assume-se `TEMPO.DEFAULT_BPM` (120) com `source: 'assumed'` e avisa-se o utilizador
  (`ResultView`, quando `tempo.source === 'assumed'`); proibido apresentar um BPM inventado como
  detetado.
- O BPM é sempre editável pelo utilizador (`ResultView`, controlo +/- sobre `IconButton` — não um
  `Input`, ver nota abaixo) e alterá-lo recalcula apenas de `TempoMap` para a frente
  (`applyManualBpm`, `@/lib/tempo/applyManualBpm.ts`) — proibido repetir a inferência do modelo
  quando só o tempo muda.
- `NoteEvent[]` limpo permanece no estado da sessão (`SessionState`, caso `result`, campo `notes`)
  depois de consumido, precisamente para permitir esse recálculo; não descartar nem remover este
  campo ao tocar em `session.reducer.ts`.
- `TempoMap` tem sempre `source` preenchido (`detected` | `assumed` | `manual`) — a proveniência do
  andamento é informação que o utilizador vê.
- O andamento é constante por peça; se algum dia houver variação, estende-se `TempoMap` com
  secções em vez de mudar as assinaturas a jusante.
- **Anacruse (decisão 8 da Tarefa 9, revista)** — a decisão original era não a detetar de todo, com
  o argumento de que "uma tentativa de adivinhar que falhe" é pior do que assumir sempre que a
  música começa no tempo forte. Testar com gravações reais mostrou que começar com uma nota de
  preparação desloca TODAS as barras de compasso, e não havia recurso nenhum. Passa a detetar-se em
  `@/lib/tempo/estimateDownbeat.ts`, mas o receio original é o que governa o desenho:
  - Só o caminho `detected` procura fase; com BPM assumido a grelha não significa nada.
  - Só age com margem clara (`TEMPO.DOWNBEAT_MIN_CONFIDENCE`); em qualquer dúvida devolve
    `pickupBeats: 0`, que é exatamente o comportamento anterior. **Falhar para o lado do que já se
    fazia é o único modo de falha aceitável aqui.**
  - Não subir `DOWNBEAT_MIN_CONFIDENCE` à espera de mais certeza: ~0,5 é um teto estrutural em 4/4
    (a hipótese rival põe os tempos fortes no tempo 3, que vale metade), não um alvo. Os valores
    medidos estão documentados na constante.
- A anacruse é aplicada recuando `firstBeatSec` para o início do compasso que a contém, nunca
  pondo o tempo forte depois da primeira nota — isso daria ticks negativos, um `measureIndex` de
  `-1` e `validateMeasureSums` a rebentar (nada a jusante trata ticks negativos). Assim a anacruse
  fica escrita como um primeiro compasso completo com pausas à cabeça (`fillRests` gera-as
  sozinho), todo o compasso continua a somar `MEASURE_TICKS`, e os tempos de reprodução das notas
  não mudam — `scoreToEvents` faz `firstBeatSec + tick × segundosPorTick`, e recuar a origem em Δ
  faz o tick avançar exatamente Δ. Só o metrónomo se desloca, para os tempos fortes certos.
- **Não há controlo manual para corrigir a anacruse** (ao contrário do BPM e da tonalidade). É por
  isso que os limiares acima são conservadores. Se alguém acrescentar esse controlo, os campos vão
  ter de entrar em `TempoMap` — o que obriga a subir `SCHEMA_VERSION` e escrever a migração
  correspondente (`@/lib/migrations`).
- O controlo de BPM em `ResultView` usa um par de `IconButton` (+/-), não um `Input` — a Tarefa 3
  fechou o inventário de componentes em sete e este não introduz um oitavo; só reconsiderar com
  justificação escrita numa tarefa futura que precise mesmo de entrada de texto livre.
- `applyManualBpm` (`@/lib/tempo/applyManualBpm.ts`) só mexe em `tempo` e em
  `metadata.confidence.tempo` — ainda não existe quantização nem notação (Tarefas 10/12) para
  recalcular a partir daqui; quando existirem, é esta função que passa a reconstruir `measures`.

## Quantização rítmica (Tarefa 10)

- Durações internas de notação são sempre inteiros em ticks (480 por semínima, `TICKS_PER_QUARTER`
  em `@/lib/types.ts`); proibido representar durações de notação em segundos ou em `float` — a
  validação de compassos em `quantize` (`@/lib/quantize/quantize.ts`) depende de aritmética exata.
- A grelha de quantização é binária até 1/16 (`QUANTIZE.MIN_SUBDIVISION_TICKS`,
  `@/lib/quantize/constants.ts`); não introduzir tercinas ou quinálteras sem atualizar
  `docs/architecture.md`, a Tarefa 12 e os exportadores da Tarefa 15.
- Sobreposições resolvem-se encurtando a nota anterior (`resolveOverlaps.ts`); proibido deslocar o
  início de uma nota para resolver uma sobreposição — os inícios são a informação rítmica a
  preservar.
- Uma nota nunca é eliminada na quantização; se for demasiado curta, é promovida à subdivisão
  mínima (`nearestNoteDuration`/`largestNoteDurationAtMost`, `@/lib/quantize/noteDurations.ts`,
  que nunca devolvem nada mais curto do que uma semicorchea).
- Notas que atravessam a barra de compasso são sempre divididas e ligadas com ligadura de
  prolongação (`splitAcrossBarlines.ts`); proibido truncar ou deixar atravessar.
- Todo o compasso soma exatamente `QUANTIZE.MEASURE_TICKS`, incluindo o último (preenchido com
  pausas por `padFinalMeasure.ts`). `quantize()` valida isto explicitamente e lança um erro se
  falhar — não desativar nem capturar essa exceção para "continuar mesmo assim".
- Pausas são decompostas segundo a tabela canónica de figuras (`NOTE_DURATIONS`,
  `noteDurations.ts`) alinhada aos limites de tempo E de compasso (`decomposeRestTicks.ts`);
  proibido gerar uma pausa única que ignore essa divisão.
- Cada `QuantizedNote` mantém `sourceIndex` para a `NoteEvent` de origem; partes de uma nota ligada
  partilham o mesmo `sourceIndex` e são sempre tratadas em conjunto pela reprodução (Tarefa 14) e
  pela edição manual (Tarefa 17).
- O compasso é sempre 4/4 (`QUANTIZE.BEAT_TICKS`/`MEASURE_TICKS` são constantes fixas, não
  derivadas de um `TimeSignature` recebido) — mesma limitação da Tarefa 9, revista em conjunto se
  algum dia mudar.
- Quando o resultado parecer ritmicamente absurdo, suspeitar primeiro do BPM (Tarefa 9), não desta
  lógica — a quantização está limitada pela qualidade do `TempoMap` que recebe.

## Tonalidade e grafia (Tarefa 11)

- A grafia enarmónica de uma nota segue sempre a armação detetada (`spellPitch`,
  `@/lib/key/spellPitch.ts`); proibido escrever sempre sustenidos ou aplicar uma regra fixa
  independente da tonalidade.
- O histograma de classes de altura (`pitchClassHistogram.ts`) é ponderado por duração, nunca por
  contagem de notas.
- Acidentes (`applyAccidentals.ts`) escrevem-se apenas quando diferem da armação (ou do último
  acidente já em vigor nessa posição, nesse compasso) e valem até ao fim do compasso; proibido
  repetir o acidente em cada nota alterada do mesmo compasso.
- Quando a confiança da tonalidade é baixa (`KEY.MIN_CONFIDENCE`) ou há poucas notas
  (`KEY.MIN_NOTES_FOR_ESTIMATE`, `@/lib/key/constants.ts`) assume-se dó maior com `source:
'assumed'` e avisa-se o utilizador (`ResultView`, quando `key.source === 'assumed'`); proibido
  apresentar uma tonalidade fraca como detetada.
- A tonalidade é corrigível pelo utilizador (`ResultView`, controlo de tónica/modo) e alterá-la
  refaz apenas a grafia e a notação (`applyManualKey`, `@/lib/key/applyManualKey.ts`) — nunca a
  inferência nem a quantização.
- Uma só tonalidade por peça; não implementar deteção de modulação sem atualizar
  `docs/architecture.md` e a Tarefa 12.
- A notação é sempre em alturas de concerto; proibido aplicar transposição automática por
  instrumento.
- Os perfis de tonalidade (`MAJOR_KEY_PROFILE`/`MINOR_KEY_PROFILE`, `@/lib/key/keyProfiles.ts`) são
  dados de Krumhansl-Schmuckler (1982), com a fonte citada no ficheiro; proibido afinar os valores
  por tentativa e erro.
- Convenção de oitavas: dó central é MIDI 60 e escreve-se C4. `spellPitch` nunca escreve Si# nem
  Dób precisamente para não ter de ajustar a oitava numa fronteira — manter essa restrição ao
  mexer nas tabelas de grafia (`pitchSpelling.ts`).

## Modelo de notação (Tarefa 12)

- `ScoreDocument` (`@/lib/notation/buildScoreDocument.ts`) é a única representação da partitura na
  app. Renderizador, reprodutor, exportadores e editor consomem este documento — proibido criar uma
  estrutura paralela "para desenhar" ou "para exportar", e proibido a jusante desta tarefa voltar a
  ler `NoteEvent[]` ou `QuantizedNote[]`. `useTranscriber` é o último sítio que ainda os vê.
- `ScoreDocument` é imutável: `buildScoreDocument` devolve um documento congelado
  (`Object.freeze` recursivo); funções de edição (`applyManualBpm`, `applyManualKey`,
  `applyTitle`) recebem e devolvem um documento novo, nunca mutam o recebido.
- `buildScoreDocument` valida sempre a estrutura (`validateScoreDocument.ts`) e falha com
  `ScoreDocumentValidationError`; proibido devolver um documento inválido ou desativar a validação
  por performance.
- Cada compasso do documento soma exatamente `QUANTIZE.MEASURE_TICKS` e cada ligadura `'start'` tem
  o seu `'stop'` — invariantes verificadas em `validateScoreDocument`, não confiar só no que a
  Tarefa 10 já garantiu.
- `metadata.schemaVersion` (`SCHEMA_VERSION`, `@/lib/types.ts`) é obrigatório e incrementa-se em
  qualquer alteração à estrutura de `ScoreDocument`, com migração correspondente na Tarefa 16.
- Uma só clave e uma só tonalidade por documento; não introduzir mudanças de clave ou de armação a
  meio sem atualizar `docs/architecture.md` e todos os consumidores.
- Não acrescentar campos ao modelo (dinâmica, articulação, letra, múltiplas partes) sem existir
  código no pipeline que os preencha.
- `metadata.title` nunca é vazio nem `undefined` — `defaultTitle` gera um por omissão sensato, e
  `applyTitle` rejeita silenciosamente uma edição em branco (devolve o documento sem alterar) em
  vez de cair para um título gerado.
- `defaultTitle`/`buildScoreDocument` nunca leem `new Date()` sem argumento nem qualquer outra
  fonte não determinística; `createdAt` vem sempre de quem chama (`useTranscriber`, que não é
  `@/lib`) — é o que mantém `buildScoreDocument` determinístico (mesma entrada → mesmo documento),
  condição para os testes de fixtures da Tarefa 20.
- Inventário de componentes alargado para oito (Tarefa 3, decisão 2): `Input` entrou nesta tarefa
  para a edição do título — o único caso até agora de texto verdadeiramente livre (BPM e tonalidade
  resolveram-se com `IconButton` porque o espaço de valores é enumerável). Não introduzir um nono
  componente sem a mesma justificação escrita.

## Renderização da pauta (Tarefa 13)

- A renderização usa VexFlow com saída SVG (`@/features/notation`); proibido Canvas — a exportação
  (Tarefa 15), o cursor de reprodução (Tarefa 14) e a seleção (Tarefa 17) dependem de nós SVG no
  DOM.
- VexFlow é importado dinamicamente (`loadVexFlow` em `ScoreView.tsx`, uma promessa cacheada a
  nível de módulo) e nunca entra no bundle inicial — confirmado no build de produção (`vexflow`
  fica num chunk próprio, à parte de `index-*.js`).
- A pauta é sempre redesenhada por completo (`drawScore.ts` faz `container.innerHTML = ''` no
  início); proibido tentar atualização incremental de elementos VexFlow.
- O número de compassos por linha é calculado a partir da largura disponível
  (`computeLineBreaks.ts`, puro e testado sem VexFlow); proibido fixá-lo — a app tem de ser legível
  a 320 px.
- Cada `StaveNote` desenhada leva `data-measure` e `data-element` correspondentes à posição no
  `ScoreDocument`; encontram-se por `container.querySelectorAll('.vf-stavenote')` logo a seguir a
  desenhar cada compasso (`getSVGElement()` do próprio VexFlow procura em `document.getElementById`
  global e falha em silêncio se o contentor ainda não estiver ligado à árvore do documento — não
  confiar nele para isto). Nenhuma outra feature localiza notas no SVG pela ordem dos nós gerados
  pelo VexFlow.
- Redimensionamento é observado com `ResizeObserver` (`useElementSize.ts`) e sempre com _debounce_
  (`RESIZE_DEBOUNCE_MS`); a largura inicial mede-se sincronamente na própria _callback ref_ (não num
  `useEffect` — a regra `react-hooks/set-state-in-effect` do ESLint proíbe isso), o `ResizeObserver`
  só trata de alterações subsequentes.
- Zoom aplica-se como escala do SVG (`ScoreView.tsx`): desenha-se para `largura do contentor / zoom`
  (menos zoom, mais compassos por linha; mais zoom, menos) e depois define-se `width`/`height` do
  `<svg>` para a largura visível × zoom — nunca `transform: scale()` em CSS (o `viewBox` do VexFlow
  já dá escala nativa, vetorial, sem o descompasso entre caixa de layout e pintura que o CSS
  `transform` introduziria). A quebra de linha continua a adaptar-se ao zoom, o que mantém o scroll
  vertical como gesto normal.
- Quando a confiança agregada (`ScoreDocument.metadata.confidence.overall`,
  `LOW_CONFIDENCE_THRESHOLD` em `ScoreView.tsx`) é baixa, o aviso identifica sempre a causa (a mais
  fraca das três confianças detalhadas — `weakestConfidence`) e aponta para a correção
  correspondente; proibido aviso genérico sem ação. Este limiar é distinto de
  `TEMPO.MIN_CONFIDENCE`/`KEY.MIN_CONFIDENCE` (Tarefas 9/11, que decidem `source: 'assumed'` na
  deteção) — este é sobre o agregado já construído.
- Um documento sem notas nenhumas mostra estado vazio explicativo (`hasAnyNote` em `ScoreView.tsx`),
  nunca um pentagrama vazio.
- `ScoreView` só lê o `ScoreDocument`; proibido modificá-lo — a edição é da Tarefa 17.
- As cores do pentagrama vêm de `currentColor` (`ScoreView.module.css`, `.canvas svg { fill:
currentColor; stroke: currentColor }`), a sobrepor o preto fixo que o VexFlow desenha inline —
  verificado nos dois temas (claro e escuro). Não depender de CSS externo ao SVG para estas cores: a
  exportação para PNG/PDF (Tarefa 15) vai precisar do SVG com os estilos já aplicados inline ou
  autossuficientes.
- **`MODEL_THRESHOLDS` (Tarefa 7) e `NOTE_CLEANUP` (Tarefa 8) continuam provisórios** — o Âmbito
  técnico desta tarefa pedia para os afinar contra áudio real, mas esta sessão não teve acesso a
  microfone nem a gravações reais para o fazer. Afinar assim que houver gravações reais disponíveis,
  ouvindo o resultado como músico, não só a olhar para o código.

## Reprodução (Tarefa 14)

- A reprodução sintetiza o `ScoreDocument`; nunca reproduz o áudio original — o objetivo é
  verificar a transcrição, não ouvir a gravação.
- O agendamento de notas usa exclusivamente o relógio do `AudioContext` (`currentTime` +
  `start(when)`); proibido `setTimeout`/`setInterval` para agendar som. Um `setInterval`
  (`PLAYBACK.SCHEDULER_INTERVAL_MS`, `usePlayback.ts`) é permitido só para decidir QUANDO verificar
  se há mais eventos a agendar (o clássico agendador de janela de antecipação) — o instante de cada
  nota vem sempre de `audioContext.currentTime`, nunca do temporizador.
- O cursor é animado com `requestAnimationFrame` lendo `audioContext.currentTime`; proibido mover o
  cursor a partir de temporizadores ou de contagem de notas tocadas.
- Notas unidas por ligadura de prolongação tocam como um único som (`mergeTiedNotes`,
  `@/lib/playback`); proibido tocar cada parte separadamente.
- `stop()` desliga e desconecta todos os osciladores agendados, incluindo os agendados para o
  futuro (`disconnectScheduledNode`, `@/features/notation/synth.ts`); nenhuma nota toca depois de
  parar.
- O `AudioContext` de reprodução é distinto do de captura (Tarefa 4) e é criado dentro de um gesto
  do utilizador (`audioContextRef.current ??= new AudioContext()`, dentro de `play()`) — nunca antes,
  para não ficar suspenso em iOS.
- O controlo de velocidade altera durações, nunca frequências — `scoreToEvents(scoreDocument,
speed)` divide `startSec`/`durationSec` por `speed`; `midiToFrequency` não recebe `speed`.
- Metrónomo desligado por omissão.
- A reprodução para automaticamente quando o `ScoreDocument` muda (edição, BPM, tonalidade) —
  comparação por referência em `usePlayback` (`ScoreDocument` é sempre reconstruído, nunca mutado,
  Tarefa 12 decisão 8), nunca por um `deepEqual`.
- Não adicionar samples de instrumento nem bibliotecas de síntese (Tone.js) — o orçamento de bundle
  está comprometido com o modelo e o VexFlow. Só osciladores nativos do Web Audio
  (`@/features/notation/synth.ts`): onda triangular para notas, quadrada curta para o clique do
  metrónomo.
- Posição da reprodução guardada como proporção do total (`positionRatioRef`, 0 a 1), nunca em
  segundos absolutos — como a `speed` já está "cozinhada" dentro dos eventos de
  `scoreToEvents`/`metronomeEvents`, a proporção continua válida depois de uma mudança de
  velocidade a meio, sem conversão nenhuma.
- `metronomeEvents(tempo, durationSec)` não recebe `speed`; quem agenda (`usePlayback`) escala o
  clique passando `{ ...tempo, bpm: tempo.bpm * speed }` — multiplicar o `bpm` pela velocidade
  produz exatamente os mesmos instantes que dividir o tempo por ela, sem duplicar a lógica de escala
  entre notas e metrónomo.
- O cursor é um `<rect class="cursor">` inserido diretamente no SVG do VexFlow via
  `createElementNS` (`ScoreView.tsx`), fora do alcance do CSS Modules — por isso a classe é a
  string literal `'cursor'`, nunca `styles.cursor` (que seria `undefined`, já aconteceu: um cursor
  sem classe nenhuma herda `fill: currentColor` de `.canvas svg` e pinta um retângulo opaco enorme
  em vez de um destaque translúcido). O CSS correspondente vive atrás de `:global(.cursor)` em
  `ScoreView.module.css`.
- `usePlayback` e `synth.ts` não têm testes unitário/de componente — mesmo padrão de
  `useMicrophone` (Tarefa 4): `AudioContext` não existe em `jsdom`. Só as funções puras de
  `@/lib/playback` (`scoreToEvents`, `mergeTiedNotes`, `midiToFrequency`, `metronomeEvents`) têm
  teste; verificação manual da reprodução em navegador é obrigatória antes de dar a tarefa por
  concluída.

## Exportação (Tarefa 15)

- Todos os exportadores consomem exclusivamente o `ScoreDocument` (mais o SVG renderizado, no caso
  de PNG e PDF); proibido exportar a partir de `NoteEvent[]`, `QuantizedNote[]` ou de qualquer
  estado intermédio — o ficheiro exportado tem de corresponder sempre ao que está no ecrã.
- MusicXML e MIDI são gerados por funções puras em `@/lib/export`; proibido usar `XMLSerializer`,
  `DOMParser` ou qualquer API do DOM nesses geradores. Tudo o que toca no DOM (SVG→PNG/PDF,
  partilha) vive em `@/features/export`.
- Todo o texto inserido no MusicXML passa por `escapeXml`; todo o nome de ficheiro passa por
  `sanitizeFilename`.
- O SVG leva os estilos embutidos antes de ser serializado para PNG ou PDF (`embedSvgColors`); sem
  isso a imagem sai sem cores nem tipos de letra. Isso inclui três coisas, todas necessárias:
  cor (`fill`/`stroke` explícitos, porque `currentColor` vem de CSS externo ao SVG),
  `font-family` em cada `<text>`, e conversão do `font-size` de `pt` para `px`.
- **`font-size` em `pt` tem de ser convertido para px na exportação**: o VexFlow escreve
  `font-size="30pt"`, mas o `toPixels` do `svg2pdf.js` só entende `em`, `px` e números sem unidade —
  em `pt` devolve `0`, e texto a tamanho zero não desenha nada. O sintoma é um PDF com pentagrama,
  hastes e ligaduras (caminhos) mas sem claves nem cabeças de nota (texto). Não remover
  `normalizeFontSize` de `embedSvgColors`.
- O PDF preserva vetores (`svg2pdf.js`); proibido embutir a pauta como imagem rasterizada.
- O PNG é rasterizado com `canvg`, não com `Image` + `drawImage`: um SVG carregado por
  `<img src="blob:…">` fica num documento isolado que não vê os tipos de letra registados em
  `document.fonts`, e as notas saem como caixas vazias. O `<canvas>` do `canvg` vive no documento
  principal e tem acesso normal a eles. Passar sempre `ignoreDimensions: true` ao `render` — sem
  isso o `canvg` repõe o tamanho do canvas e perde-se a resolução 2×.
- Bravura e Academico estão vendorizados em `src/features/export/fonts/*.ttf` e importados com
  `?inline` (data URI). Não pedir tipos de letra à CDN do VexFlow em runtime: a app não fala com a
  rede (`NETWORK_ALLOWLIST`), pela mesma razão que o modelo Basic Pitch está em `public/models/`.
  São `.ttf` e não os `.otf` oficiais porque o módulo de fontes do `jsPDF` não embute contornos CFF;
  foram convertidos uma vez com `fontTools`/`cu2qu` ao preparar a Tarefa 15 — não regenerar dentro
  da app.
- A partilha é decidida por deteção de capacidade (`navigator.canShare`), nunca por _user agent_,
  com download como alternativa. Um `AbortError` (utilizador cancelou a partilha) não cai para
  download — seria surpreendente descarregar um ficheiro depois de cancelar o envio dele.
- O MIDI usa 480 _ticks_ por semínima e o MusicXML usa `divisions` 480, a mesma unidade interna da
  quantização — não converter unidades de tempo na exportação.
- Não instalar bibliotecas para gerar MusicXML ou MIDI; ambos os formatos são escritos à mão neste
  projeto. `jspdf`/`svg2pdf.js`/`canvg` são a exceção deliberada, só para PDF e PNG, e entram sempre
  por `import()` dinâmico — nenhuma delas pode aparecer no bundle inicial (confirmado no build: são
  chunks à parte de `index-*.js`).
- Notas ligadas fundem-se num só evento MIDI (`note on`/`note off` com a duração somada), tal como
  na reprodução (Tarefa 14) — nunca um `note on` repetido por cada parte da ligadura.
- `toMusicXml` e `toMidi` são determinísticos: `encoding-date` vem de `metadata.createdAt`, nunca de
  `new Date()`. Exportar o mesmo documento duas vezes tem de dar exatamente o mesmo ficheiro.
- Alterações aos exportadores exigem reverificação manual num programa de notação externo — XML bem
  formado não prova que a música está correta.
- **Falta a verificação da decisão 9 (abrir o MusicXML no MuseScore e o MIDI num reprodutor)** — não
  foi possível nesta sessão por não haver software de notação instalado no ambiente. A verificação
  feita foi estrutural (XML bem formado e com os campos certos, cabeçalho MIDI válido, PDF/PNG
  inspecionados visualmente). Fazer a validação externa antes de confiar nos ficheiros.

## Biblioteca local (Tarefa 16)

- Persistência usa IndexedDB via `idb`; proibido `localStorage`/`sessionStorage` para dados de
  transcrição. (Um sinalizador de UI sem dados de transcrição — ex.: "já mostrámos este aviso" — não
  é abrangido por esta regra; `useInstallPrompt`, Tarefa 3, já usa `localStorage` assim.)
- Guarda-se apenas o `ScoreDocument`; proibido persistir áudio, PCM ou qualquer forma da gravação
  original em IndexedDB, Cache API ou em qualquer outro sítio.
- Todo o acesso ao IndexedDB passa por `@/features/library/repository.ts`; proibido abrir a base de
  dados ou criar transações noutro módulo. `@/features/library/db.ts` é o único ficheiro que chama
  `openDB` — `repository.ts` é o único que o importa.
- `repository.save()` e `repository.update()` chamam `validateScoreDocument` antes de tocar no
  IndexedDB e deixam a exceção subir tal e qual; nunca persistir um documento inválido (era um
  requisito explícito do plano desta tarefa, não uma decisão tomada agora).
- Toda a leitura de um documento persistido passa por `migrateDocument` (`@/lib/migrations`), que
  trata versões inferiores e marca versões superiores como ilegíveis; um registo ilegível nunca
  impede a lista de carregar — `repository.list()`/`get()` devolvem sempre a entrada, com
  `result.legible === false`, em vez de lançar ou omitir.
- As migrações de documento vivem em `@/lib/migrations` e são funções puras; qualquer alteração a
  `ScoreDocument` (`@/lib/types`) incrementa `SCHEMA_VERSION` e acrescenta a entrada correspondente a
  `MIGRATIONS` em `migrateDocument.ts` na mesma alteração de código — `SCHEMA_VERSION` sem migração
  para lá chegar é o cenário exato que o registo "superior" existe para apanhar quando alguém se
  esquece.
- Uma transcrição concluída é guardada automaticamente (`useLibraryAutosave`, ligado em `App.tsx`);
  correções e edições atualizam o mesmo registo com _debounce_ (`UPDATE_DEBOUNCE_MS`) em vez de
  criar um novo. O `id` do registo atual vive numa ref, nunca em estado — não o duplicar nem o subir
  para `sessionReducer` (a sessão não sabe nada sobre a biblioteca, e é bom que continue assim).
- **A gravação inicial tem de ser deduplicada contra reentrância do próprio efeito** — o StrictMode
  do React em desenvolvimento corre um efeito, o seu _cleanup_, e o efeito outra vez, antes da
  primeira `save()` assíncrona terminar; sem uma promessa partilhada (`pendingSaveRef` em
  `useLibraryAutosave`) cada uma das duas invocações chama `save()`, e cada uma tem o seu próprio
  `crypto.randomUUID()` — duplica silenciosamente o registo. Verificado ao vivo (`?state=result`,
  contagem de registos no IndexedDB antes/depois da correção). Não remover `pendingSaveRef` nem
  voltar a um `cancelled` local por invocação — esse padrão (usado no resto da app para efeitos que
  só leem, nunca escrevem) não chega aqui.
- Falha de escrita por quota (ou qualquer outra) nunca é silenciosa: `LibrarySaveError` sobe da
  `repository`, `useLibraryAutosave` mostra-a como `saveError`, e o resultado permanece visível no
  ecrã — só não fica guardado.
- Abrir uma transcrição da biblioteca (`session.openDocument`, ação `library/open` no
  `sessionReducer`) entra direto em `result` com `notes: []` — a biblioteca nunca guardou
  `NoteEvent[]` (decisão 4: só o `ScoreDocument`), por isso não há nada para repor aí. Quem abre tem
  de chamar `useLibraryAutosave().associate(id, document)` ANTES de `session.openDocument` (mesmo
  clique, síncrono) — sem isso o efeito de gravação automática trata o documento aberto como uma
  transcrição nova e cria um duplicado.
- A biblioteca é um estado de ecrã em `App.tsx` (`showLibrary`), não uma rota nem um estado de
  `sessionReducer` — a sessão (gravar → processar → resultado) e a biblioteca são máquinas de estado
  independentes que só se tocam via `openDocument`/`associate`.
- O botão "voltar" (físico ou gesto, Android) fecha a biblioteca em vez de sair da app: abrir a
  biblioteca empurra uma entrada no `history` do browser; o "voltar" do sistema dispara `popstate`,
  que fecha a biblioteca; o botão de fechar dentro da própria view consome essa entrada com
  `history.back()` em vez de a deixar pendurada — os dois caminhos convergem no mesmo `popstate`, não
  há lógica de fecho duplicada. **Não verificado num dispositivo Android real** — este ambiente não
  tem um; a engenharia via History API foi o que deu para fazer sem ele. Confirmar num Android real
  antes de assumir a decisão 11 fechada.
- A lista mostra sempre o aviso de armazenamento local (`library.localStorageNotice`) — mesma regra
  do aviso de instrumento único da Tarefa 3: nunca atrás de ajuda, nunca só depois de perder algo.
- `List`/`ListItem` (`@/components/List`) é o nono componente do inventário fechado (Tarefa 3,
  decisão 2) — justificação: a biblioteca é a primeira coleção de tamanho variável do plano; a lista
  de formatos de exportação (Tarefa 15) usa `Button` porque são quatro ações fixas.

## Edição manual (Tarefa 17)

- As operações de edição são exclusivamente: alterar altura, alterar duração, eliminar, inserir e
  transpor (decisão 1). Não adicionar vozes, acordes, dinâmica, articulações, letra, gestão de
  compassos ou qualquer outra funcionalidade de editor de partituras — quem precisa disso exporta
  MusicXML (Tarefa 15) e usa um programa de notação a sério.
- Toda a edição passa por funções puras em `@/lib/notation/edit.ts`
  (`changePitch`, `changeDuration`, `deleteNote`, `insertNote`, `transpose`, mais
  `resolveTiedGroup`/`getElementAt` de apoio) que recebem e devolvem um `ScoreDocument`; proibido
  mutar o documento ou editar diretamente o SVG. Uma posição (`NotationPosition`) é sempre
  `{ measureNumber, elementIndex }` — a mesma convenção dos atributos `data-measure`/`data-element`
  do SVG (Tarefa 13, decisão 7): `measureNumber` é 1-indexado (`Measure.number`), `elementIndex` é
  0-indexado dentro de `measure.elements`.
- Toda a edição corre `validateScoreDocument` antes de o novo estado sair de `edit.ts`, e deixa a
  exceção subir tal e qual (mesmo padrão de `repository.save`/`update`, Tarefa 16) — nunca a
  intercetar dentro de `edit.ts`. É `useScoreEditor` (`@/features/notation`) que a apanha: mantém o
  documento anterior e marca `error: true` (decisão 8). Uma rejeição "silenciosa" é diferente disto
  — `changeDuration`/`insertNote` devolvem o MESMO documento (por referência) quando a figura pedida
  não cabe no espaço livre (ver abaixo); isso não é um erro de validação e não mostra aviso, é só a
  operação a não fazer nada.
- Alterar a duração de uma nota requantiza só o compasso afetado (decisão 5), nunca desloca os
  inícios das notas seguintes: a nova figura absorve o espaço da própria nota mais as pausas
  consecutivas a seguir (até à próxima nota ou ao fim do compasso), e o que sobrar decompõe-se em
  pausas novas (`decomposeRestTicks`, Tarefa 10, reutilizada). Se a figura pedida não couber nesse
  espaço, a operação não faz nada (mesmo documento, por referência) em vez de requantizar o resto do
  compasso — a alternativa que as Notas/Dependências da tarefa aceitam explicitamente. A interface
  (`EditToolbar`) não filtra as figuras oferecidas por tamanho disponível; o utilizador pode pedir
  uma que não caiba e nada visivelmente acontece — aceite pela mesma razão.
- A seleção de notas resolve-se pelos atributos `data-measure`/`data-element`; proibido depender da
  ordem dos nós SVG gerados pelo VexFlow. A área sensível ao toque de cada elemento é alargada por
  um `<rect>` invisível (`MIN_TOUCH_TARGET = 44`, `ScoreView.tsx`) inserido como primeiro filho do
  grupo `[data-measure][data-element]` — sem isto, seleccionar uma nota com o dedo em telefone é
  impraticável (cabeças de nota são bem mais pequenas do que 44px).
- Operações sobre uma parte de uma nota ligada aplicam-se a todas as partes do mesmo `sourceIndex`
  (`resolveTiedGroup`) — hoje isto cobre `changePitch` e `deleteNote`; `changeDuration` opera só na
  posição selecionada, mesmo que faça parte de uma ligadura (redimensionar todas as partes de uma
  ligadura em conjunto ficou fora do âmbito desta tarefa — a alternativa aceite pelas
  Notas/Dependências é mais simples e mantém o documento sempre válido).
- Transpor (`transpose`) recalcula alturas, tonalidade (`tonic`, `sharpsOrFlats` via
  `keySignatureFor`), grafia (`toNotationElements`/`applyAccidentals`, reaproveitados via
  `respellMeasures`) e clave (`chooseClef`); proibido transpor alterando só a armação. `mode`
  mantém-se — só a tónica se desloca pelos semitons pedidos.
- Desfazer/refazer (`useScoreEditor`) é uma pilha de `ScoreDocument` completos, limitada a 30
  estados (`HISTORY_LIMIT`); proibido implementar operações inversas. As pilhas vivem em estado do
  React (não numa ref) e são reiniciadas implicitamente a cada montagem — não existe desfazer entre
  sessões nem persistido.
- Os controlos globais (BPM, tonalidade, título) aparecem antes da edição nota a nota em
  `ResultView` (decisão 2) — a maioria dos erros percebidos resolve-se corrigindo o andamento ou a
  tonalidade, não nota a nota. Não reordenar.
- Qualquer edição (as cinco operações, desfazer e refazer) para a reprodução em curso primeiro
  (`stopPlayback`, chamado no início de `useScoreEditor.applyEdit`/`undo`/`redo`) — os osciladores
  agendados (Tarefa 14) já não corresponderiam ao documento novo.
- "Oitava com um gesto secundário" (decisão 4) foi resolvida com um SEGUNDO PAR de botões
  (`ArrowUpIcon`/`ArrowDownIcon` em `variant="ghost"`, ±12 semitons) em vez de um gesto de
  arrastar/premir longo — mais robusto ao toque e mais descobrível do que um gesto escondido; a
  decisão continua satisfeita em espírito (visualmente secundário ao par de semitom), não na letra
  literal de "gesto".
- A gravação automática (Tarefa 16) e a exportação (Tarefa 15) não precisaram de nenhuma alteração
  para refletir edições: as duas já consomem `ScoreDocument` diretamente da sessão, que
  `useScoreEditor` mantém atualizado via `onChange` (`session.replaceDocument`) a cada edição
  aceite — verificado ao vivo (transpor, apagar, inserir e desfazer sem gerar avisos de gravação
  nem exportar dados obsoletos).

## Acessibilidade e idioma (Tarefa 18)

- Todo o percurso funcional é operável por teclado com indicador de foco visível
  (`:focus-visible` em `global.css`); proibido remover o indicador de foco (`outline: none`) sem
  substituto igualmente visível. A única exceção existente é o `.viewport` do `Toast`
  (`ToastProvider`/Radix) — é o próprio padrão acessível do Radix Toast (a região só recebe foco
  programático via F6, nunca por Tab; os controlos lá dentro, como o botão de fechar, continuam com
  o indicador normal).
- Mudanças de estado assíncronas são anunciadas por `aria-live`: `polite` para progresso e
  conclusão, `assertive` só para erros (`role="alert"`, que já é `aria-live="assertive"` implícito —
  ver `Alert`). Progresso é anunciado por marcos (25/50/75/100%), nunca a cada atualização —
  `useMilestoneAnnouncement` (`@/features/session/views`), ligado a `ProcessingView` por uma região
  `aria-live="polite"` própria (`.sr-only`), separada do nome da etapa (que já muda por si só só
  quatro vezes ao todo). Não ligar `aria-live` diretamente a `state.progress` — é isso que decisão 2
  proíbe explicitamente.
- O SVG da pauta (`ScoreView`) tem sempre `role="img"` + `aria-label` gerado por
  `describeScore(doc)` (`@/lib/notation/describe.ts`) — não há forma de tornar o desenho do VexFlow
  navegável por leitor de ecrã, mas isto dá o essencial (tonalidade, compasso, andamento, clave,
  número de compassos, tessitura) de imediato. A lista textual completa das notas
  (`describeNotes(doc)`, mesmo ficheiro) está disponível a pedido, por um botão
  (`notation.showNotesList`/`hideNotesList`) — nunca sempre visível (é densa de mais) nem só para
  leitor de ecrã (é útil a quem não sabe ler pauta). As duas funções são puras e só leem
  `ScoreDocument` — nunca podem divergir do que está desenhado porque não há um segundo sítio onde a
  informação viva. `describe.ts` é o primeiro ficheiro em `@/lib` a importar de `@/strings`: a regra
  geral de `@/lib` ser puro (sem DOM/IO) continua a valer, mas o trabalho destas duas funções é
  compor texto em pt-PT a partir do documento, e duplicar a tabela de nomes de notas/figuras em vez
  de reaproveitar `@/strings` seria a duplicação que este ficheiro existe para evitar.
- Navegação nota a nota por teclado (`editor.selectPrevious`/`selectNext`, `@/lib/notation/edit.ts`
  `allPositions`) — os botões "nota anterior"/"nota seguinte" em `ResultView` são o caminho por
  teclado para selecionar uma nota, já que o SVG (`role="img"`) não é navegável por leitor de ecrã e
  os retângulos de área sensível ao toque (Tarefa 17, decisão 3) não são focáveis. Não remover estes
  botões nem assumir que clicar no SVG é o único caminho de seleção.
- Gestão de foco nas transições de estado: `ResultView` foca a região da pauta (`Sheet` com
  `tabIndex={-1}`) na montagem; `ErrorView` foca um invólucro à volta do `Alert` (que não encaminha
  `ref`) na montagem; `EditToolbar` foca o primeiro controlo só na transição de "nada selecionado"
  para "algo selecionado" (nunca ao trocar de nota para nota — isso lutaria com a navegação
  nota-a-nota acima); a biblioteca (Tarefa 16) devolve o foco ao botão que a abriu, ao fechar, pelos
  dois caminhos de fecho (`history.back()`/`setShowLibrary(false)`). Cada view de estado principal é
  montada de novo a cada transição (Tarefa 3, decisão 7), por isso um efeito sem dependências que
  corre na montagem é o mecanismo certo — não inventar outro.
- Contraste mínimo 4.5:1 para texto e 3:1 para elementos gráficos, nos dois temas — verificado por
  cálculo a partir dos valores de `tokens.css` (fórmula de luminância relativa do WCAG), não a
  olho. `--color-border` foi corrigido nesta tarefa (`#dededa`/`#33333a`, ~1.3:1, para
  `#8a8a83`/`#77777f`, ~3.4-3.7:1): é o contorno de `Input` e de `Button variant="secondary"`, não
  só decorativo — dizia onde o campo/botão acaba. Qualquer novo token de cor tem de ser verificado
  contra os fundos onde vai aparecer antes de entrar em `tokens.css`.
- `prefers-reduced-motion: reduce` (`global.css`) já elimina toda a animação/transição decorativa
  (regra `!important` genérica); o cursor de reprodução e o indicador de nível mantêm-se por serem
  informação, não decoração. `.viewport` de `ScoreView` usa `scroll-behavior: smooth` para o
  auto-scroll a seguir o cursor — a mesma regra global torna isto instantâneo sob a preferência, sem
  tratamento à parte.
- Alvos de toque com pelo menos 44×44 px (`--touch-target-min`, `tokens.css`, já aplicado em
  `Button`/`IconButton`/`Input`); as notas da pauta são a única exceção documentada e usam áreas de
  toque invisíveis alargadas (`MIN_TOUCH_TARGET`, `ScoreView.tsx`, Tarefa 17, decisão 3).
- Proibido `role`/`aria-*` que dupliquem semântica nativa de HTML (ex.: `role="button"` num
  `<button>`). `role="alert"`/`role="status"`/`role="img"` usados na app são todos legítimos — vão
  em elementos sem esse papel nativo (`<div>`, `<svg>`).
- Terminologia musical em pt-PT correta: semibreve, mínima, semínima, colcheia, semicolcheia (não
  "corchea"/"semicorchea" — são espanhol, não português; alguns comentários internos mais antigos em
  `@/lib/quantize` ainda usam a forma espanhola por engano, mas não são texto visível ao utilizador,
  por isso ficaram de fora do âmbito desta revisão). Todo o texto novo desta tarefa usa a forma
  correta (`edit.noteTypeNames`, Tarefa 17, já a usava).
- `axe-core` corre nos testes de componentes e nalguns ecrãs principais (`IdleView`, `RecordingView`,
  `ProcessingView`, `ErrorView`, `LibraryView`) via `expectNoA11yViolations` (`@/test/axe`) — ver
  "Testes de componentes" abaixo para o que essa função faz e não faz. Encontrou e corrigiu uma
  violação real: o `<input type="file">` escondido em `IdleView` não tinha nome acessível
  (`aria-label={idle.pickFile}` adicionado).
- **Não foi possível fazer a auditoria manual com leitor de ecrã (NVDA/VoiceOver) nesta sessão** —
  não há nenhum dos dois disponível neste ambiente. O que ficou feito foi revisão de código
  sistemática (papéis, rótulos, `aria-live`, ordem de foco) mais `axe-core` automatizado, que a
  própria tarefa reconhece como cobrindo só metade dos problemas — a auditoria manual, que é onde
  está o valor real desta tarefa (Notas/Dependências), fica por fazer. Fazer antes de considerar a
  decisão 4 fechada.

## Desempenho e limites (Tarefa 19)

- Nenhuma alteração motivada por desempenho entra sem medição antes/depois registada em
  `docs/performance.md`. **A linha de base desse documento está incompleta**: não há dispositivos
  reais neste ambiente de desenvolvimento, e os três níveis pedidos pela decisão 2 (telefone
  modesto, telefone recente, portátil) nunca foram medidos — ver a nota no topo do próprio
  documento antes de confiar em qualquer limite abaixo em produção.
- Os limites de duração de áudio (`MAX_DURATION_MS`/`MIN_DURATION_MS`,
  `@/lib/performance/durationLimit.ts`) derivam das medições em `docs/performance.md`; alterá-los
  exige atualizar essas medições, não só a constante. **Continuam provisórios** (herdados das
  Tarefas 4/5 sem confirmação numérica) — ver o mesmo documento.
- O limite efetivo de duração é sempre visível ao utilizador (`idle.maxDurationNotice`,
  `truncateBody`/`truncateConfirm` — todos funções de `seconds`, não texto fixo, desde esta tarefa);
  a deteção de capacidade do dispositivo (`detectDeviceCapability`,
  `@/features/capture/deviceCapability.ts`, lendo `navigator.hardwareConcurrency`/`deviceMemory`)
  escolhe um valor por omissão (`chooseDurationLimitMs`, puro, `@/lib/performance/durationLimit.ts`)
  e nunca bloqueia uma ação — a deteção é grosseira e pode errar. Não duplicar a leitura do
  `navigator` fora de `deviceCapability.ts`; a decisão do valor fica só na função pura.
- Áudio é processado por janelas com libertação incremental de memória
  (`TRANSCRIBE_WINDOW`/`planWindows`/`mergeWindowedNotes` em `@/lib/transcribe`,
  `transcribe.worker.ts`) — proibido voltar a entregar a duração inteira ao modelo num único
  `evaluateModel`. As janelas sobrepõem-se (`OVERLAP_SEC`) e os fragmentos da mesma nota nas
  fronteiras fundem-se sempre com `mergeWindowedNotes` (reaproveita `mergeFragmented`, Tarefa 8,
  decisão 6) — nunca aceitar uma nota partida em dois como resultado final. `frames`/`onsets`/
  `contours` (Tarefa 7) são locais a cada janela (`transcribeWindow`), nunca acumulados para a peça
  inteira. Os valores de `TRANSCRIBE_WINDOW` são provisórios (mesma razão dos limites de duração).
- Todo o `postMessage` de um buffer de áudio usa `transfer` — confirmado por leitura de código nesta
  tarefa (`usePreprocessAudio`, `useTranscriber`, `audio.worker.ts`, `recorder.worklet.ts`); já
  estava correto desde as Tarefas 4/6/7, não foi preciso alterar nada. Qualquer `postMessage` novo
  com um buffer grande tem de manter isto.
- O bundle inicial não inclui o modelo nem o VexFlow (os dois só entram por `import()` dinâmico,
  guardrail já existente da Tarefa 15) e respeita o orçamento verificado na build
  (`scripts/check-bundle-budget.js`, chamado por `pnpm build` a seguir a `vite build`) — mede o gzip
  de cada `<script>` referenciado em `dist/index.html` e falha a build (`process.exit(1)`) acima de
  `BUDGET_KB`. Não subir `BUDGET_KB` sem justificação escrita na alteração que o exige; não duplicar
  esta verificação com `chunkSizeWarningLimit` do Vite (esse fica só como aviso genérico por chunk).
- Mudar o backend de execução do modelo (Tarefa 7, decisão 2: WASM) exige demonstrar, nos três
  níveis de dispositivo, que é mais rápido E que produz os mesmos resultados — **não feito nesta
  sessão**, pela mesma falta de dispositivos reais; o backend mantém-se WASM.
- A app respondeu ao toque e mostrou progresso monótono durante uma transcrição de teste neste
  ambiente (áudio sintético de 15 s, ver `docs/performance.md`) — não é a verificação no dispositivo
  mais fraco que a decisão 6 pede, só uma confirmação de que o pipeline por blocos não regrediu a
  responsividade que a arquitetura de workers (Tarefas 6/7) já garantia.

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
  `Spinner`, `Toast`, `Input`, `List` (`src/components/`, cada um com `index.ts` + `.types.ts` +
  `.module.css` + `.test.tsx`). Acrescentar um décimo exige justificação escrita na tarefa que o
  introduz — a Tarefa 17 provavelmente precisa de um controlo de seleção, e é lá que se decide, não
  antes. `icons/` e `cx.ts` não contam para este inventário: são suporte (glifos e um utilitário de
  classes), não primitivas de interação com opinião de design própria.
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
- Todo componente do inventário fechado, e os ecrãs principais que tenham teste, incluem um teste
  `'não tem violações de acessibilidade'` que chama `expectNoA11yViolations(container)`
  (`@/test/axe`, Tarefa 18) — corre `axe-core` sobre o nó montado e falha com uma mensagem legível
  se houver violações. A regra `color-contrast` vem desligada nesse helper: o jsdom não pinta nada a
  sério, por isso não tem dados fiáveis para essa regra — o contraste verifica-se à parte, a partir
  dos valores de `tokens.css` (secção "Acessibilidade e idioma" abaixo). Não remover essa exceção
  nem tentar "corrigir" um falso positivo de `color-contrast` em teste — não é real.
- **Testes de `axe-core` podem falhar por timeout (5000ms) sob carga do sistema** (várias corridas
  de teste/lint/build em paralelo) — `axe.run()` é razoavelmente pesado e o limite por omissão do
  Vitest é apertado para isso. Confirmado na Tarefa 20: o mesmo teste passa isolado
  (`vitest run caminho/do/ficheiro.test.tsx`) sempre que falhou em conjunto com outro trabalho
  pesado a correr ao mesmo tempo. Antes de assumir uma regressão real, correr o ficheiro isolado.

## Testes (Tarefa 20)

- Pirâmide assimétrica (decisão 1): a maior parte da suite cobre `@/lib` (lógica pura); poucos
  testes end-to-end (Playwright, `e2e/`), cobrindo percursos, não detalhes musicais — não escrever
  testes que pontuem "qualidade musical" automaticamente (decisão 9); o que se testa é estabilidade
  (mesma entrada → mesmo resultado, ou uma mudança revista à mão), nunca "isto soa bem".
- **Fixtures de áudio sintético** (`tests/fixtures/audio/generate.js`, `pnpm generate-audio-fixtures`)
  — WAV pequenos e determinísticos (nunca `Math.random()` cru; o gerador de ruído usa um PRNG com
  semente fixa, `mulberry32`), versionados como `*.min.wav` (única exceção ao `.gitignore` que
  ignora áudio pesado em `tests/fixtures/audio/`). Proibido adicionar gravações reais ou ficheiros
  de música com direitos ao repositório.
- **Testes de regressão** (`e2e/regression.spec.ts`) correm sobre esses fixtures, com inferência
  real (nada de duplo de teste aqui — decisão 4, é o único sítio que a usa) e comparam contra um
  _snapshot_ do Playwright (`e2e/regression.spec.ts-snapshots/*.txt`) da lista textual de notas
  (`describeNotes`, Tarefa 18) e da confiança agregada — texto legível por uma pessoa, não o
  `ScoreDocument` inteiro em JSON. **Os esperados só se atualizam com `--update-snapshots` revisto à
  mão antes de committar** (decisão 3) — nunca em bloco, nunca sem ler o diff nota a nota e explicar
  no commit porque o resultado novo é melhor. `rhythm.min.wav` usa a mesma altura repetida de
  propósito: uma tentativa de alternar duas alturas para dar variedade rítmica desencadeou um bug
  real de quantização (ver abaixo) — documentado no próprio `generate.js`, não silenciado.
- **Bug real encontrado ao preparar os fixtures, não corrigido nesta tarefa**: certas combinações de
  duração/altura fazem `@/lib/quantize/quantize.ts` lançar `[quantize] compasso N soma X ticks,
esperado 1920` — um compasso deixa de somar `QUANTIZE.MEASURE_TICKS`. Sinalizado como tarefa à
  parte (não é do âmbito da Tarefa 20 mexer em `quantize.ts`). O que É desta tarefa, e está feito: a
  exceção já não escapa por apanhar — ver o ponto seguinte.
- **`useTranscriber` apanha agora qualquer exceção do pipeline pós-inferência** (limpeza → tempo →
  quantização → tonalidade → notação) e falha a sessão (`session.fail('transcribe-failed', true)`)
  em vez de a deixar presa em "processing" para sempre com progresso a 100% e sem erro nenhum
  visível — era exatamente o que o bug de quantização acima produzia antes desta correção. Proibido
  remover este `try/catch`; é a única coisa entre uma exceção de biblioteca interna e uma sessão
  presa sem forma de recuperar exceto recarregar a página.
- **Duplo de teste do worker de transcrição** (`@/test/fakeWorker.ts`, `installFakeWorker`) —
  substitui o `Worker` global por uma classe que expõe `postMessage`/`terminate` espiados e um
  método `emit(data)` para simular respostas; `useTranscriber.test.ts` e
  `usePreprocessAudio.test.ts` usam-no para testar a máquina de estados da sessão sem carregar
  TensorFlow.js nem o modelo real. Proibido carregar o modelo real fora de `e2e/regression.spec.ts`.
- **Playwright** (`playwright.config.ts`, `e2e/`) corre sempre sobre `pnpm preview` (produção) — o
  service worker está desativado em `pnpm dev` de propósito (Tarefa 2), e testar PWA/offline em
  desenvolvimento não testaria nada. `pnpm build` tem de correr antes de `pnpm test:e2e`
  localmente — `webServer` não o faz por si (repetiria ~20s a cada arranque do Playwright).
  Um só projeto (Chromium): é o único a aceitar `--use-fake-device-for-media-stream` +
  `--use-file-for-fake-audio-capture=<caminho>` para simular o microfone com um ficheiro WAV
  (decisão 6) — precisa também de `--use-fake-ui-for-media-stream` (sem ele, `getUserMedia` falha
  com `NotSupportedError` mesmo com o dispositivo falso) e de `/` em vez de `\` no caminho do
  ficheiro no Windows.
- **Testes de componentes consultam por papel e por texto acessível** (decisão 5) — já era a
  convenção desde a Tarefa 3; nada mudou aqui, só passou a ser regra escrita.
- **Cobertura como diagnóstico, não meta** (decisão 8) — `vitest.config.ts`,
  `coverage.thresholds['src/lib/**']`, agregado (não `perFile`) sobre `statements`/`lines` 85%,
  `functions` 90%, `branches` 75%. Nenhum mínimo para `@/features`/`@/components`/`src/workers` —
  subiria a cobertura à custa de testes escritos só para a percentagem em código de interface
  trivial, que a decisão 8 proíbe explicitamente. `pnpm test:coverage` (não `pnpm test`, que fica
  sem instrumentação de propósito — decisão "a suite unitária corre em segundos").
- Casos limite cobertos: áudio em silêncio (`silence.min.wav` → erro `too-quiet`, Tarefa 4), uma só
  nota (fixtures), ficheiro corrompido (`e2e/import-export.spec.ts`, "recupera de um erro
  conhecido"), documento de `schemaVersion` superior (Tarefa 16, `migrateDocument.test.ts`, já
  existia), quota esgotada (Tarefa 16, `repository.test.ts`, já existia), permissão de microfone
  negada (Tarefa 4, `useMicrophone.test.ts`, já existia) — o que faltava e ficou coberto agora é o
  ficheiro corrompido e, por acidente feliz de os ter procurado, o bug de quantização acima.

## Erros e telemetria (Tarefa 21)

- **Catálogo único de erros** (`@/lib/errors.ts`, decisão 1) — todo o erro da app vive lá: código,
  título, mensagem, ação sugerida, recuperabilidade. Proibido criar erros ad-hoc numa feature ou
  mostrar ao utilizador um erro sem ação sugerida — `errors.test.ts` verifica que nenhuma entrada
  fica sem `action`, `title` ou `body` não vazios. `src/strings/errors.ts` importa daqui
  (`getErrorEntry`) — deixou de ser a fonte, é só a camada que a interface consome.
- **Detalhes técnicos nunca vão para a interface** (decisão 3) — mensagem original, `stack trace` e
  contexto ficam só no registo local (`@/features/diagnostics/errorLog.ts`); a interface mostra
  sempre a mensagem do catálogo, indexada por `code`.
- **Registo local em anel** (`@/features/diagnostics/errorLog.ts`, `db.ts`, decisão 4) — até
  `ERROR_LOG_LIMIT` (50) entradas numa base de dados IndexedDB própria, `pauta-diagnostics`,
  **separada** de `pauta-library` (Tarefa 16): o registo de erros nunca pode competir com as
  transcrições pela quota de armazenamento. `logError()` nunca lança — uma falha a registar um erro
  cai em `console.error`, nunca propaga para quem estava a falhar.
- **`DiagnosticsView`** (`@/features/diagnostics/views/DiagnosticsView.tsx`) — acessível por um botão
  discreto no cabeçalho (`WrenchIcon`, ao lado do da biblioteca), fora do fluxo principal, sem
  `history.pushState` (ao contrário da biblioteca, Tarefa 16 decisão 11: não é um destino que
  alguém espere alcançar com o botão físico "voltar"). Mostra o registo de erros (copiar, exportar
  como ficheiro via `shareOrDownload`, limpar com confirmação), informação do dispositivo/app
  (`__APP_VERSION__`, injetada por `define` em `vite.config.ts`/`vitest.config.ts` a partir de
  `package.json` — nunca duplicar o número à mão) e o controlo de consentimento de telemetria.
- **Erro de worker sempre propagado com código; `onerror` e `onmessageerror` sempre tratados**
  (decisão 5) — `useTranscriber`/`usePreprocessAudio` tratam os dois; nenhum passa por `onmessage`,
  por isso não podem ficar sem handler próprio. A app nunca pode ficar presa em `processing`.
- **Limite de tempo em toda a operação assíncrona** (decisão 6) — dois mecanismos, conforme o tipo
  de operação, nunca misturados:
  - Baseada em worker (pré-processamento, transcrição): `setTimeout` armado a cada `postMessage` e
    reiniciado a cada mensagem de progresso (sinal de vida), implementado diretamente em
    `useTranscriber`/`usePreprocessAudio` — dispara `operation-timeout` e termina o worker. Não usar
    `withTimeout` aqui: precisa de terminar o worker, não só rejeitar uma promessa.
  - Baseada em promessa (escrita em IndexedDB, `@/features/library/repository.ts`):
    `@/lib/withTimeout.ts`, `WRITE_TIMEOUT_MS`.
  - Exportação (`@/features/export`) fica de fora de propósito: `shareOrDownload` pode abrir o
    postal de partilha do sistema, que espera por uma escolha do utilizador — "esgotar o tempo"
    nesse caso seria um bug, não uma proteção.
- **Telemetria opt-in, desligada por omissão, sem destino** (decisão 7) — `@/lib/telemetry.ts`
  prepara só a fila de eventos e a validação da lista permitida; **não envia nada para lado
  nenhum**, não há função `send`/`flush`. O consentimento (`getTelemetryConsent`/
  `setTelemetryConsent`) vive em `@/features/diagnostics/telemetryConsent.ts`, não em `@/lib` — `@/lib`
  é puro, sem `localStorage` (guardrail de ESLint, `no-restricted-globals`). Ligar um destino a
  sério exige escolher o serviço, abrir a CSP para esse domínio e atualizar
  `docs/architecture.md`/`README.md` — não é uma alteração de configuração.
- **Lista fechada de campos de telemetria, verificada em código** (decisão 8) —
  `recordEvent(event, consent)` em `@/lib/telemetry.ts` lança `TelemetryFieldNotAllowedError` para
  qualquer campo fora de `errorCode`, `audioDurationBucket`, `inputType`, `deviceTier`,
  `appVersion`, `processingTimeBucket` — a validação corre sempre, com ou sem consentimento (um
  campo proibido é um bug a apanhar em desenvolvimento). Nunca: áudio, notas, alturas, títulos,
  nomes de ficheiro, identificadores.
- **Proibido qualquer identificador de utilizador ou de instalação, mesmo anónimo** (decisão 9) —
  nenhum `crypto.randomUUID()` nem equivalente gerado ou persistido para este fim (a biblioteca
  usa `crypto.randomUUID()` para o `id` de cada transcrição, Tarefa 16 — isso é diferente, é a
  chave de um registo, não um identificador de pessoa ou instalação).
- **`AppErrorBoundary` preserva e comunica o resultado guardado** (decisão 10) — ao apanhar um
  erro, regista no diagnóstico local (`logError`) e consulta `count()` da biblioteca
  (`@/features/library/repository.ts`); se houver pelo menos um registo guardado, mostra
  `crash.savedNotice`. Não é uma garantia perfeita de que É a transcrição mais recente que ficou
  guardada (o crash podia ter acontecido antes da gravação automática, Tarefa 16 decisão 5) — é o
  sinal honesto que dá para mostrar sem inventar mais estado.

## Qualidade

- Toda a função nova em `/src/lib` tem teste unitário — sem exceções. É a parte do sistema onde os
  bugs são silenciosos (uma pauta errada não estoura, só está errada).
- Proibido `any` em código novo; a saída do modelo e o `ScoreDocument` têm tipos explícitos.
- Erros mostrados ao utilizador explicam o que fazer a seguir; proibido expor mensagens técnicas
  cruas (`TypeError`, stack traces) na interface.
