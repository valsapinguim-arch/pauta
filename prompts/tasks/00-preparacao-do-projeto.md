# Tarefa 0 — Preparação do Projeto

## Objetivo

Estabelecer as bases do repositório: tooling, convenções, documentação e as regras que todas as tarefas seguintes vão herdar. No fim desta tarefa não há aplicação nenhuma a correr — há um repositório onde é seguro começar a escrever código.

## Contexto

Primeira tarefa, sem dependências. O `README.md`, o `AGENTS.md` e o `docs/architecture.md` já existem no repositório com as decisões estruturantes tomadas — esta tarefa **não os reescreve**, apenas os complementa com o que ficar decidido aqui.

## Decisões adotadas

**1. Aplicação única, não mono-repo**
- Uma só `package.json` na raiz, um só `tsconfig.json`, um só build.
- Justificação: não há backend, não há pacotes partilhados, não há segundo consumidor de nada. Um mono-repo com workspaces aqui só acrescentaria indireção e tempo de instalação sem resolver problema nenhum. Se algum dia aparecer um backend (ver "Melhorias" no `base.md`), a migração para workspaces faz-se nesse momento.

**2. pnpm como gestor de pacotes**
- Justificação: rápido, estrito quanto a dependências fantasma (o que evita imports que funcionam por acidente), e é o gestor já usado noutros projetos do autor.

**3. TypeScript em modo estrito, `any` proibido**
- `strict: true`, `noUncheckedIndexedAccess: true`, `noImplicitOverride: true`.
- Justificação: este projeto manipula estruturas musicais onde um erro não estoura — produz uma pauta errada. Tipos estritos são a primeira linha de defesa contra bugs silenciosos.

**4. ESLint (flat config) + Prettier, com Prettier a não discutir formatação**
- ESLint só para regras de correção e boas práticas; formatação é 100% do Prettier via `eslint-config-prettier`.
- Regra `no-restricted-imports` a proibir imports relativos com `../..` (força o alias `@/`).
- Regra a proibir `fetch`/`XMLHttpRequest` fora de uma lista explícita de ficheiros — a app não fala com a rede, e isto torna a regra do `AGENTS.md` mecanicamente verificável em vez de apenas escrita.

**5. Husky + lint-staged + commitlint**
- `pre-commit`: lint-staged (ESLint + Prettier nos ficheiros staged).
- `commit-msg`: commitlint com `@commitlint/config-conventional`.
- Justificação: mesma convenção do resto do trabalho do autor; mantém o histórico legível e permite gerar changelog depois.

**6. Vitest como runner de testes desde o início**
- Configurado nesta tarefa (mesmo sem testes para correr), com `environment: 'node'` por omissão e `jsdom` apenas nos testes de componentes.
- Justificação: `/src/lib` é lógica pura e deve testar-se em Node, sem o custo de arrancar um DOM. Configurar isto agora evita que a Tarefa 20 tenha de reorganizar a suite toda.

**7. Sem CI/CD nesta tarefa**
- Justificação: o projeto ainda não tem nada para construir nem para onde publicar. A Tarefa 22 (Build e distribuição) trata disto quando houver artefacto real.

## Âmbito técnico

* Criar `package.json` com scripts: `dev`, `build`, `preview`, `lint`, `format`, `test`, `test:e2e`, `typecheck`
* Configurar `tsconfig.json` (estrito, alias `@/* → src/*`)
* Configurar `eslint.config.js` (flat config) com as regras da decisão 4
* Configurar `.prettierrc` e `.prettierignore`
* Configurar Husky (`pre-commit`, `commit-msg`), `.lintstagedrc.json` e `commitlint.config.js`
* Configurar `vitest.config.ts` conforme decisão 6
* Confirmar que o `.gitignore` cobre `node_modules`, `dist`, `coverage`, `.env` e os fixtures de áudio pesados
* Criar `.editorconfig`
* Criar `.nvmrc` com a versão LTS de Node
* Documentar em `docs/architecture.md` qualquer decisão desta tarefa que altere o que lá está

## Guardrails para IA (atualizar `AGENTS.md`)

* "Uma só `package.json` na raiz — este projeto não é mono-repo. Não criar workspaces nem sub-pacotes."
* "Proibido `any`, `@ts-ignore` e `@ts-expect-error` sem comentário a justificar e a referir a tarefa onde a exceção foi aceite."
* "Formatação é decidida exclusivamente pelo Prettier; nunca adicionar regras de formatação ao ESLint nem discutir estilo em revisão."
* "Imports usam sempre o alias `@/...`; a regra `no-restricted-imports` do ESLint bloqueia `../..` e não deve ser desativada por ficheiro."
* "Nenhum ficheiro fora da allowlist do ESLint pode usar `fetch`, `XMLHttpRequest`, `WebSocket` ou `navigator.sendBeacon` — a app não comunica com a rede em runtime."
* "Commits seguem Conventional Commits; o hook `commit-msg` valida isto e não se contorna com `--no-verify`."

## Entregáveis

* `pnpm install` corre sem erros
* `pnpm lint`, `pnpm format`, `pnpm typecheck` e `pnpm test` correm (mesmo que sem ficheiros para processar)
* Um commit com mensagem inválida é rejeitado pelo hook
* Um ficheiro com `../../` num import é rejeitado pelo ESLint
* `AGENTS.md` atualizado com as regras acima

## Notas / Dependências

* Sem dependências.
* Não instalar ainda React, Vite, TensorFlow.js, VexFlow ou qualquer dependência de runtime — isso é da Tarefa 1 em diante. Esta tarefa só instala tooling.
* A allowlist de `fetch` da decisão 4 começa vazia e vai crescer de forma controlada: a Tarefa 7 precisa dela para carregar o modelo de `/public/models`. Cada adição à lista é uma decisão consciente, não um ajuste de conveniência.
