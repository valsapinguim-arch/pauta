# Tarefa 16 — Biblioteca Local

## Objetivo

Guardar transcrições no dispositivo e permitir voltar a elas: listar, abrir, renomear, eliminar, com gestão da quota de armazenamento.

## Contexto

Depende da Tarefa 12 (`ScoreDocument`, incluindo `schemaVersion`) e da Tarefa 15 (exportação, que é o mecanismo de backup). É o primeiro ecrã secundário da app.

## Decisões adotadas

**1. IndexedDB, não `localStorage`**

- Justificação: `localStorage` é síncrono (bloqueia a thread principal), limitado a ~5 MB e guarda só strings. Um `ScoreDocument` serializado é pequeno, mas dezenas deles mais os metadados passam facilmente esse limite, e escrever de forma síncrona no momento em que a app acaba de transcrever é o pior momento possível para bloquear a interface.

**2. `idb` como camada fina sobre a API nativa**

- Justificação: a API nativa do IndexedDB é baseada em eventos e verbosa o suficiente para gerar bugs de transação (transações que fecham antes de a escrita acabar é o clássico). `idb` é um invólucro de poucos KB que a torna baseada em promessas, sem esconder o modelo. Não se usa nada maior (Dexie, PouchDB) porque a app tem uma tabela e cinco operações.

**3. Uma só _object store_, com índice por data**

- `transcriptions`, chave `id` (UUID), índice em `createdAt`.
- Justificação: os documentos são autocontidos e não há relações entre eles. A lista é sempre ordenada por data descendente, que é a única ordenação que interessa numa lista de gravações. Mais tabelas ou índices seria estrutura para consultas que ninguém vai fazer.

**4. Guarda-se o `ScoreDocument`, nunca o áudio**

- Justificação: (a) o áudio é dezenas de MB por gravação e esgotaria a quota em poucas transcrições, enquanto um documento são poucos KB; (b) a app não precisa dele — a reprodução sintetiza a pauta (Tarefa 14, decisão 1) e a exportação parte do documento (Tarefa 15, decisão 8); (c) não retendo áudio, a promessa de privacidade fica mais forte do que uma política — não há nada gravado para vazar.
- **Consequência a assumir:** não é possível voltar a transcrever com limiares diferentes uma gravação antiga. É um custo aceitável face ao benefício.

**5. Gravação automática ao concluir a transcrição**

- O documento é guardado assim que fica pronto, sem o utilizador pedir.
- Justificação: uma transcrição custou tempo real de gravação e de inferência no dispositivo. Perdê-la por o utilizador ter fechado o _tab_ antes de carregar em "guardar" é uma perda desproporcionada face ao custo de guardar (poucos KB). Vale mais dar uma forma fácil de eliminar do que exigir uma ação para preservar.

**6. Correções e edições atualizam o registo existente**

- Alterar BPM, tonalidade, título ou notas (Tarefa 17) grava sobre o mesmo `id`, com _debounce_.
- Justificação: o utilizador está a corrigir uma transcrição, não a criar outra. Criar versões novas a cada ajuste enchia a lista de quase-duplicados. _Debounce_ porque a edição de título dispara a cada tecla.

**7. Migração por `schemaVersion`, com falha graciosa**

- Ao ler, compara-se `metadata.schemaVersion` com a atual: igual abre; inferior passa pela migração; superior (ficheiro de uma versão mais recente da app) marca-se como ilegível, mostra-se na lista como tal e continua a poder ser eliminado.
- Justificação: é a razão de existir do `schemaVersion` (Tarefa 12, decisão 8). O caso "superior" acontece de verdade quando a app é usada em dois browsers ou depois de um _rollback_, e o comportamento correto nunca é falhar a abrir a lista toda por causa de um registo.

**8. Quota verificada antes de guardar, com aviso e sugestão de exportar**

- `navigator.storage.estimate()` antes de escrever; perto do limite, avisa e sugere exportar e eliminar. Se a escrita falhar por quota, o resultado continua visível no ecrã — só não fica guardado, e diz-se isso.
- Justificação: uma escrita falhada silenciosamente dá a impressão de que a transcrição está guardada quando não está — descoberto mais tarde, com a transcrição já perdida. Como os documentos são pequenos, isto é raro; mas o modo de falha é grave o suficiente para se tratar.

**9. Armazenamento persistente pedido, sem depender dele**

- `navigator.storage.persist()` pedido uma vez, depois da primeira transcrição guardada.
- Justificação: sem isto, o browser pode limpar o IndexedDB sob pressão de armazenamento sem avisar. Pedir depois da primeira transcrição (e não no arranque) é pedir num momento em que já existe algo a proteger, o que aumenta a probabilidade de o utilizador aceitar. Nunca se depende da concessão — o aviso da decisão 10 mantém-se em qualquer caso.

**10. A lista diz claramente que isto é armazenamento local**

- Uma linha permanente: as transcrições estão só neste dispositivo e limpar os dados do browser apaga-as; para as guardar a sério, exportar.
- Justificação: os utilizadores assumem que uma app "guarda na nuvem". Descobrir que não guardava depois de perder tudo é o pior momento para aprender a arquitetura da app. Já previsto em `docs/architecture.md`, decisão 2.

**11. Navegação por estado, sem router**

- A biblioteca é um estado do ecrã, não uma rota.
- Justificação: mantém a decisão 2 da Tarefa 1. Com dois ecrãs secundários, um router seria peso morto.
- **Reavaliar aqui:** se o botão "voltar" do telefone fechar a app em vez de sair da biblioteca, o comportamento é mau o suficiente para justificar um router mínimo ou uma entrada no histórico. Verificar em Android antes de fechar a tarefa.

## Âmbito técnico

- Instalar `idb`
- Implementar `@/features/library/db.ts`: abertura, criação da _object store_ e do índice, migrações de versão do IndexedDB
- Implementar `@/features/library/repository.ts`: `save(doc)`, `update(id, doc)`, `list()`, `get(id)`, `remove(id)`, `count()`
- Implementar `@/lib/migrations/`: `migrateDocument(raw)` puro, por versão de schema (decisão 7)
- Implementar gravação automática (decisão 5) e atualização com _debounce_ (decisão 6)
- Implementar verificação de quota e pedido de persistência (decisões 8 e 9)
- Implementar `LibraryView`: lista ordenada por data, com título, data, duração e indicador de confiança; abrir, renomear, eliminar com confirmação; estado vazio; registos ilegíveis assinalados
- Adicionar o acesso à biblioteca no ecrã principal, como ação secundária (Tarefa 3, decisão 4)
- Incluir o aviso da decisão 10
- Verificar o comportamento do botão "voltar" em Android (decisão 11)
- Acrescentar `List` ao inventário de componentes da Tarefa 3, justificando
- Testes:
  - `migrateDocument` com versão atual devolve o documento intacto
  - `migrateDocument` com versão superior devolve marcação de ilegível, sem lançar
  - guardar e ler devolve um documento equivalente
  - `list()` ordena por data descendente
  - eliminar remove e não afeta os restantes

## Guardrails para IA (atualizar `AGENTS.md`)

- "Persistência usa IndexedDB via `idb`; proibido `localStorage`/`sessionStorage` para dados de transcrição."
- "Guarda-se apenas o `ScoreDocument`; proibido persistir áudio, PCM ou qualquer forma da gravação original em IndexedDB, Cache API ou em qualquer outro sítio."
- "Todo o acesso ao IndexedDB passa por `@/features/library/repository.ts`; proibido abrir a base de dados ou criar transações noutro módulo."
- "Toda a leitura de um documento persistido passa por `migrateDocument`, que trata versões inferiores e marca versões superiores como ilegíveis; um registo ilegível nunca impede a lista de carregar."
- "As migrações de documento vivem em `@/lib/migrations` e são funções puras; qualquer alteração a `ScoreDocument` incrementa `schemaVersion` e acrescenta a migração correspondente na mesma alteração de código."
- "Uma transcrição concluída é guardada automaticamente; correções e edições atualizam o mesmo registo em vez de criar um novo."
- "Falha de escrita por quota nunca é silenciosa: o utilizador é informado de que o resultado não ficou guardado, e o resultado permanece visível no ecrã."
- "A biblioteca mostra sempre que o armazenamento é local e que exportar é a única forma de backup."

## Entregáveis

- Transcrições guardadas automaticamente e listadas por data
- Abrir uma transcrição repõe a pauta, incluindo BPM, tonalidade e edições
- Renomear e eliminar a funcionar, com confirmação na eliminação
- Registo de versão superior assinalado sem quebrar a lista
- Aviso de armazenamento local visível
- Comportamento do botão "voltar" verificado em Android
- Testes da decisão acima a passar
- `AGENTS.md` atualizado com as regras acima

## Notas / Dependências

- Depende das Tarefas 12 e 15.
- iOS tem quota mais apertada e pode limpar dados de sites pouco usados. Mais uma razão para o aviso da decisão 10 ser explícito em vez de diplomático.
- A migração (decisão 7) é código que só é exercitado quando `schemaVersion` mudar — ou seja, muito depois de ser escrito. Escrever o teste da versão superior agora, enquanto o raciocínio está fresco.
- Não deixar a gravação automática (decisão 5) acontecer antes de `validateScoreDocument` (Tarefa 12) ter passado, ou pode ficar um documento inválido persistido que rebenta ao abrir.
