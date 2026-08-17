# Tarefa 1 — Scaffold React

## Objetivo

Criar a aplicação React + TypeScript com Vite, a estrutura de pastas por feature, os tokens de estilo e a máquina de estados do ecrã único. No fim desta tarefa a app arranca e mostra o ecrã inicial — sem gravar, sem transcrever, sem pauta.

## Contexto

Depende da Tarefa 0 (tooling, TypeScript estrito, alias `@/`, Vitest). Esta tarefa cria o esqueleto que a Tarefa 2 transforma em PWA e a Tarefa 3 veste com a interface.

## Decisões adotadas

**1. Vite + React + TypeScript, sem framework de aplicação**

- Sem Next.js, Remix ou similar.
- Justificação: a app é 100% cliente, não tem rotas de servidor, não tem SSR, não tem API. Um framework full-stack aqui só traz configuração e uma build mais lenta. Vite dá HMR rápido e um build estático, que é exatamente o artefacto pretendido (Tarefa 22).

**2. Sem router**

- A app tem um ecrã principal com estados, mais dois ecrãs secundários (biblioteca na Tarefa 16, diagnóstico na Tarefa 21).
- Justificação: com três ecrãs e nenhuma necessidade de URLs partilháveis (não há partilha por link — ver `docs/architecture.md`, decisão 2), um router é peso morto. A navegação é estado da aplicação.
- **Quando reconsiderar:** se aparecer necessidade de deep links ou de o botão "voltar" do telefone navegar entre ecrãs. Nesse caso, a Tarefa 16 é o momento certo para introduzir um router mínimo.

**3. Máquina de estados explícita para o ecrã principal, com `useReducer`**

- Estados: `idle | recording | processing | result | error`. Transições explícitas, definidas num reducer em `@/features/session`.
- Cada estado carrega os seus dados (`recording` → nível e tempo; `processing` → etapa e progresso; `result` → `ScoreDocument`; `error` → código de erro).
- Justificação: com booleanos independentes (`isRecording`, `isProcessing`, `hasError`) é trivial chegar a combinações impossíveis (a gravar e a processar ao mesmo tempo). Um estado discriminado torna essas combinações inexprimíveis. Não se usa uma biblioteca de máquinas de estados (XState) porque cinco estados não justificam a dependência.

**4. Estado de servidor: não existe**

- Sem TanStack Query, sem Redux, sem Zustand.
- Justificação: não há servidor para sincronizar. O estado é (a) o estado da sessão atual, num reducer; (b) a biblioteca persistida em IndexedDB, acedida pelo seu próprio módulo (Tarefa 16). Introduzir uma biblioteca de estado global antes de existir um problema de estado global é adiantar complexidade.

**5. Estrutura por feature, com `lib` puro à parte**

```
src/
  features/
    session/     → máquina de estados do ecrã principal
    capture/     → microfone (Tarefa 4) e ficheiro (Tarefa 5)
    transcribe/  → orquestração dos workers (Tarefas 6, 7)
    notation/    → renderização e edição (Tarefas 13, 17)
    export/      → exportadores (Tarefa 15)
    library/     → IndexedDB (Tarefa 16)
  components/    → interface partilhada (Tarefa 3)
  lib/           → funções puras: quantize, key, notation, musicxml, midi
  workers/       → audio.worker.ts, transcribe.worker.ts
  styles/        → tokens.css, global.css
  strings/       → textos pt-PT
```

- Justificação: cada feature corresponde a uma etapa do pipeline documentado em `docs/architecture.md`, o que mantém a correspondência entre o plano e o código óbvia. `lib` fica fora das features porque é partilhado e porque a sua pureza é uma regra arquitetural (`AGENTS.md`) que ficaria diluída se estivesse espalhada.

**6. Textos centralizados em `@/strings`, sem biblioteca de i18n**

- Um módulo por área (`strings/session.ts`, `strings/errors.ts`, …) exportando objetos tipados.
- Justificação: a app é só em pt-PT nesta fase. Centralizar os textos dá a maior parte do benefício (revisão de copy num só lugar, nenhum texto perdido no JSX) sem a máquina de i18n. A Tarefa 18 avalia se vale a pena o passo seguinte.

**7. Error boundary na raiz desde já**

- Componente `AppErrorBoundary` a envolver a app, com fallback que oferece recarregar.
- Justificação: um erro não capturado numa app cliente dá ecrã branco. Como esta app faz trabalho pesado e assíncrono em workers, é uma questão de quando, não de se. A Tarefa 21 refina a mensagem e o registo; aqui garante-se que existe rede de segurança desde o primeiro dia.

## Âmbito técnico

- Criar projeto Vite (`react-ts`) sobre a configuração já existente da Tarefa 0
- Configurar alias `@/` no `vite.config.ts` (a par do `tsconfig.json`)
- Criar a estrutura de pastas da decisão 5, com um `index.ts` por feature
- Implementar `sessionReducer` e `useSession()` em `@/features/session`, com os estados e transições da decisão 3
- Definir os tipos base em `@/lib/types.ts`: `NoteEvent`, `TempoMap`, `QuantizedNote`, `KeyAnalysis`, `ScoreDocument` — apenas as formas, sem implementação (as tarefas 8–12 preenchem-nas)
- Criar `src/styles/tokens.css` e `global.css` (reset mínimo, tipografia base)
- Criar `AppErrorBoundary`
- Criar `src/strings/` com os textos do ecrã inicial
- Criar `App.tsx` a renderizar o estado `idle` com um placeholder
- Confirmar que `pnpm dev`, `pnpm build` e `pnpm typecheck` passam

## Guardrails para IA (atualizar `AGENTS.md`)

- "O fluxo do ecrã principal é representado por um estado discriminado (`idle | recording | processing | result | error`) num reducer em `@/features/session`; proibido introduzir booleanos independentes como `isRecording`/`isProcessing` para representar este fluxo."
- "Não introduzir router, nem biblioteca de estado global (Redux, Zustand, TanStack Query), sem justificação documentada nesta tarefa — a app não tem servidor nem URLs partilháveis."
- "Ficheiros em `@/lib` são puros: proibido importar React, tocar no DOM, em `window`, `navigator`, `fetch` ou IndexedDB. `@/lib` é testável em Node sem jsdom, e essa propriedade não se negocia."
- "Cada feature em `@/features` expõe a sua API pública por `index.ts`; outras features importam do `index.ts`, nunca de ficheiros internos."
- "Nenhum texto visível ao utilizador é escrito inline no JSX — vem sempre de `@/strings`."
- "Os tipos do pipeline (`NoteEvent`, `TempoMap`, `QuantizedNote`, `KeyAnalysis`, `ScoreDocument`) vivem apenas em `@/lib/types.ts`; proibido redefinir versões locais numa feature."

## Entregáveis

- `pnpm dev` arranca e mostra o ecrã inicial
- `pnpm build` e `pnpm typecheck` passam
- Estrutura de pastas criada conforme decisão 5
- `sessionReducer` com teste unitário a cobrir as transições válidas e a rejeitar as inválidas
- Tipos do pipeline definidos em `@/lib/types.ts`
- `AGENTS.md` atualizado com as regras acima

## Notas / Dependências

- Depende da Tarefa 0.
- Os tipos criados aqui são propositadamente provisórios na sua riqueza — o objetivo é fixar os nomes e as fronteiras do pipeline. As Tarefas 8 a 12 vão refiná-los; o que não deve acontecer é cada tarefa inventar o seu próprio tipo de nota.
- Não instalar ainda TensorFlow.js nem VexFlow — só entram nas Tarefas 7 e 13. Instalá-los agora inflaciona o bundle antes de haver forma de medir o impacto (Tarefa 22).

### Registado durante a implementação

- **React 19.** Sem decisão à parte — é a versão atual e não há razão para fixar uma anterior.
- **A pureza de `@/lib` (decisão da Tarefa 0/`AGENTS.md`) passou a ser imposta pelo ESLint**, não só escrita em prosa: um bloco dedicado em `eslint.config.js` (`files: ['src/lib/**/*.ts']`) proíbe importar React, `window`, `document`, `navigator`, `fetch`, `AudioContext`/`OfflineAudioContext`, IndexedDB e qualquer coisa de `@/features`, `@/components` ou `@/workers`. Verificado com um ficheiro de propósito que viola as sete regras — todas apanhadas.
- **Linha de base do bundle (build de produção, sem VexFlow nem modelo, que só entram nas Tarefas 7 e 13):** 195 KB / 61 KB gzip. Serve de referência para o orçamento que a Tarefa 19 vai fixar com medições reais.
- **`sessionReducer`: `fail` e `reset` tratados fora do `switch (state.status)`.** São as duas transições que valem em qualquer estado (uma falha pode ocorrer a meio de qualquer etapa; resetar é a saída de emergência universal) — misturá-las dentro de cada bloco de estado duplicaria os mesmos dois casos cinco vezes.
- O teste do reducer cobre a tabela de verdade completa (5 estados × 8 tipos de ação), incluindo a garantia de que uma transição inválida devolve o **mesmo objeto** (`toBe`, não `toEqual`) — para apanhar uma cópia acidental que faria o React re-renderizar sem motivo.
