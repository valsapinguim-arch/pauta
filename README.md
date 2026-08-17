# pauta

Uma PWA que ouve música — do microfone ou de um ficheiro — e escreve a pauta. Grava-se um trecho, e sai notação musical que se pode ver, ouvir e exportar para MusicXML, MIDI, PDF ou imagem.

- **Frontend**: React + TypeScript (Vite)
- **Transcrição**: [Basic Pitch](https://github.com/spotify/basic-pitch) via TensorFlow.js, a correr no browser
- **Notação**: [VexFlow](https://vexflow.com/) para desenhar, MusicXML para exportar
- **Armazenamento**: IndexedDB (local, no dispositivo)
- **Backend**: nenhum

## O que esta app faz e não faz

Faz bem: **melodias de um só instrumento** — cantar, assobiar, uma linha de piano, uma guitarra sozinha, um trecho de flauta.

Faz mal: música com **vários instrumentos ao mesmo tempo** — uma gravação de rádio, uma banda completa, qualquer coisa com bateria. A tecnologia atual de transcrição automática não resolve isto de forma fiável, e a app tem de dizer isso ao utilizador antes de ele gravar, não depois de lhe entregar uma pauta errada.

Isto é uma limitação assumida do produto, não um bug à espera de correção. Ver "Melhorias arquiteturais recomendadas" em [`prompts/base.md`](prompts/base.md).

## Porque é que corre tudo no browser

O áudio nunca sai do dispositivo. Não há upload, não há servidor de inferência, não há conta de utilizador. Três consequências práticas:

1. **Privacidade** por construção — não é uma política, é uma impossibilidade técnica.
2. **Custo** de operação praticamente zero: alojamento estático, sem GPU, sem tráfego de áudio.
3. **Offline** de verdade — depois da primeira visita, funciona em modo avião.

O preço é o desempenho ficar dependente do dispositivo do utilizador, e o modelo ter de ser pequeno o suficiente para descarregar. Ver [`docs/architecture.md`](docs/architecture.md).

O plano de desenvolvimento completo está em [`prompts/base.md`](prompts/base.md), detalhado tarefa a tarefa em [`prompts/tasks/`](prompts/tasks/). Antes de meteres mãos ao código, dá uma vista de olhos por lá — cada ficheiro explica as decisões técnicas já tomadas para essa parte do sistema, e porquê.

## Pré-requisitos

- [Node.js](https://nodejs.org/) (versão LTS) e [pnpm](https://pnpm.io/)
- Git
- Um browser com suporte a Web Audio, WebAssembly e Service Workers (qualquer Chrome, Edge, Firefox ou Safari recente)

## Arranque local

```bash
pnpm install
```

```bash
pnpm dev
```

Não há Docker, nem base de dados, nem serviços a subir — é uma aplicação estática. O `pnpm dev` arranca o Vite com hot reload e é tudo o que precisas.

Atenção: o service worker e a instalação de PWA só se testam a sério num build de produção servido localmente:

```bash
pnpm preview
```

## Estrutura do repositório

```
/src/features/     → cada etapa do pipeline e do ecrã (capture, transcribe, notation, export, library)
/src/components/   → interface mínima partilhada
/src/workers/      → Web Workers (pré-processamento e inferência)
/src/lib/          → utilitários puros (quantização, tonalidade, MusicXML, MIDI)
/public/models/    → modelo Basic Pitch empacotado para offline
/docs/             → documentação de arquitetura
/prompts/          → plano de desenvolvimento (base.md + tasks detalhadas)
```

## Fluxo de contribuição

Trabalha sempre numa branch — **nunca faças `push` direto para `main`**.

### Nomenclatura de branches

```
<tipo>/<numero-tarefa>-<descricao-curta>
```

- `<tipo>`: `feat`, `fix`, `chore`, `refactor`, `test` ou `docs` (a mesma lógica dos [Conventional Commits](https://www.conventionalcommits.org/))
- `<numero-tarefa>`: o número da tarefa em [`prompts/tasks/`](prompts/tasks/) a que a alteração corresponde (ex.: `07` para a Tarefa 7 — Motor de Transcrição). Se não corresponder a nenhuma, usa `misc`
- `<descricao-curta>`: em inglês, `kebab-case`, curtinha

Exemplos:

```
feat/07-basic-pitch-worker
fix/10-tie-across-barline
chore/00-eslint-config
```

Assim que criares a branch, publica-a logo no remoto:

```bash
git push -u origin <nome-da-branch>
```

### Commits

Usa sempre [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `chore:`, `refactor:`, `test:`, `docs:`) — o Husky/commitlint valida isto automaticamente.

### Como pegares numa tarefa

1. Lê o ficheiro correspondente em [`prompts/tasks/`](prompts/tasks/) — tem as decisões técnicas já tomadas para essa parte do sistema, com a justificação de cada uma.
2. Dá uma olhadela ao [`AGENTS.md`](AGENTS.md) na raiz — são as regras que todo o código (escrito por ti ou por IA) deve seguir.
3. Achas que alguma decisão já documentada não faz sentido? Fica à vontade para adaptar o ficheiro da tarefa antes de avançares. O plano não é para seguir às cegas — é um ponto de partida sólido.
4. Corre o conteúdo do ficheiro da tarefa como prompt num assistente de IA (ex.: Claude Code), já dentro da branch que criaste.
5. Quando a tarefa estiver concluída, move o ficheiro de [`prompts/tasks/`](prompts/tasks/) para [`prompts/tasks/old/`](prompts/tasks/old/) — assim mantemos o histórico das decisões sem misturar o que já está feito com o que ainda falta.

## Comandos úteis

```bash
pnpm dev        # arranca o Vite em modo desenvolvimento
pnpm build      # build de produção
pnpm preview    # serve o build (única forma de testar PWA/service worker)
pnpm lint       # ESLint
pnpm test       # testes unitários e de componentes (Vitest)
pnpm test:e2e   # testes end-to-end (Playwright)
```
