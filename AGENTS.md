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
  /src/features/   → uma pasta por etapa/ecrã (capture, transcribe, notation, export, library, pwa)
  /src/components/ → interface mínima partilhada
  /src/workers/    → Web Workers
  /src/lib/        → lógica pura (sem DOM, sem I/O)
  /src/styles/     → tokens
  /src/sw.ts       → service worker (injectManifest — Tarefa 2)
  /public/models/  → modelo Basic Pitch empacotado
  /public/*.png, /public/favicon.ico, /public/*.svg → ícones PWA (gerados, Tarefa 2)
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
- `src/sw.ts` e `src/workers/**/*.ts` usam `tsconfig.worker.json` (lib `WebWorker`, não `DOM`) e
  ficam excluídos do `tsconfig.json` principal — `pnpm typecheck` corre os dois. Não os remover de
  `exclude` no tsconfig principal nem apagar `tsconfig.worker.json`.
- Os ícones em `public/` (`pwa-*.png`, `maskable-icon-*.png`, `apple-touch-icon-*.png`,
  `favicon.ico`) são gerados por `pnpm generate-pwa-assets` a partir de `public/pwa-icon.svg`
  (`pwa-assets.config.ts`) — nunca editados à mão nem gerados por outra ferramenta. Alterar o ícone
  é sempre: editar o SVG → correr o script → commitar os PNGs resultantes.
- Testar sempre com `pnpm preview` (nunca `pnpm dev`) para qualquer coisa relacionada com o service
  worker ou instalação — em `vite dev` o service worker está desativado de propósito
  (`devOptions.enabled: false`).

## Interface

- O interface é deliberadamente mínimo. Antes de adicionar um componente, um ecrã, um menu ou uma
  opção de configuração, verificar se o fluxo principal (gravar → ver pauta → exportar) fica
  mesmo melhor com ele. A resposta por omissão é não.
- Existe um ecrã principal com estados mutuamente exclusivos
  (`idle`, `recording`, `processing`, `result`, `error`) geridos por uma máquina de estados
  explícita; proibido representar este fluxo com múltiplos booleanos independentes.
- Cor, espaçamento, tipografia e radius vêm sempre dos tokens em `/src/styles/tokens.css` via
  `var(--token)`; proibido valor literal (ex.: `#ffffff`, `16px`) dentro de um componente.
- Todo o texto visível ao utilizador é pt-PT e vive no módulo de strings, nunca inline no JSX.

## Qualidade

- Toda a função nova em `/src/lib` tem teste unitário — sem exceções. É a parte do sistema onde os
  bugs são silenciosos (uma pauta errada não estoura, só está errada).
- Proibido `any` em código novo; a saída do modelo e o `ScoreDocument` têm tipos explícitos.
- Erros mostrados ao utilizador explicam o que fazer a seguir; proibido expor mensagens técnicas
  cruas (`TypeError`, stack traces) na interface.
