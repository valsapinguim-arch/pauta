# Tarefa 20 — Testes

## Objetivo

Consolidar a suite de testes: unitários do pipeline, de componentes, de regressão sobre áudio conhecido, end-to-end e de PWA/offline.

## Contexto

Depende de todas as tarefas anteriores. Cada uma já entregou os seus testes unitários — esta tarefa fecha as lacunas, acrescenta as camadas que só fazem sentido com a app completa, e transforma a suite em rede de segurança contra regressões.

## Decisões adotadas

**1. Pirâmide assimétrica: muito peso em `@/lib`, pouco em end-to-end**
- A maior parte dos testes cobre as funções puras do pipeline; poucos testes end-to-end, cobrindo percursos e não detalhes.
- Justificação: é em `@/lib` que estão os bugs que importam e que são silenciosos — uma quantização errada não estoura, produz uma pauta errada. Testes end-to-end sobre esta app são lentos (envolvem inferência real) e frágeis; servem para provar que as peças estão ligadas, não para verificar musicologia.

**2. Testes de regressão sobre fixtures de áudio, com resultado esperado versionado**
- Um pequeno conjunto de ficheiros WAV curtos e sintéticos (escala, arpejo, ritmo simples, silêncio, ruído) com o `ScoreDocument` esperado guardado em JSON no repositório.
- Justificação: é a única forma de detetar que uma afinação de limiares ou uma alteração ao pós-processamento piorou o resultado. Sem isto, cada ajuste é uma aposta — melhora um caso e estraga outro sem ninguém ver.
- WAV sintético e não gravações reais: são pequenos (cabem no git), determinísticos, e não têm questões de direitos. Estão explicitamente excluídos da regra do `.gitignore` que ignora áudio pesado.

**3. Os esperados dos fixtures são revistos à mão, nunca gerados automaticamente**
- Quando um esperado muda, a alteração é revista nota a nota e o commit explica porque é melhor.
- Justificação: um esperado regenerado com `--update-snapshots` sem revisão transforma o teste em tautologia — passa sempre a registar o comportamento atual, incluindo as regressões. É a forma mais comum de um teste de regressão deixar de ter valor.

**4. Modelo *mocked* por omissão nos testes; inferência real apenas nos de regressão**
- A maioria dos testes injeta um `NoteEvent[]` fixo; os de regressão correm o modelo a sério.
- Justificação: carregar o modelo custa segundos e é a diferença entre uma suite que corre a cada gravação de ficheiro e uma que ninguém corre. A confinação do TensorFlow.js a um único worker (Tarefa 7, decisão 9) é o que torna esta substituição trivial.

**5. Testes de componentes com Testing Library, por comportamento observável**
- Consultas por papel e por texto acessível; nada de seletores de classe CSS nem de estruturas internas.
- Justificação: testes ligados a classes quebram em cada mudança de estilo e não detetam nada de útil. Consultar por papel tem o efeito lateral de verificar acessibilidade — se o teste não encontra o botão pelo nome, um leitor de ecrã também não.

**6. End-to-end com Playwright, com microfone falso do browser**
- Percursos: importar ficheiro → ver pauta → exportar; gravar (com microfone sintético) → ver pauta; abrir da biblioteca; recuperar de erro.
- Justificação: o Chromium aceita `--use-fake-device-for-media-stream` com um ficheiro WAV, o que permite testar o percurso de gravação sem hardware nem interação humana — a única forma de o caminho principal da app ter cobertura automática.

**7. Testes de PWA e offline no build de produção**
- Playwright sobre `pnpm preview`: instalação do service worker, segundo carregamento sem rede, transcrição offline, prompt de atualização.
- Justificação: o service worker não existe em modo de desenvolvimento; testá-lo em `dev` não testa nada. É também o único sítio onde a promessa central do produto (funciona offline) fica verificada automaticamente.

**8. Cobertura como diagnóstico, não como meta**
- Recolhe-se cobertura e exige-se um mínimo alto em `@/lib`; nada de meta global.
- Justificação: uma meta global leva a testes escritos para subir a percentagem — tipicamente em código de interface trivial — enquanto o código difícil fica igual. Exigir cobertura onde os bugs são silenciosos é a versão útil da mesma ideia.

**9. Sem testes de "qualidade musical" automáticos**
- Não se tenta pontuar automaticamente se uma transcrição é "boa".
- Justificação: exigiria uma verdade de referência que não existe para gravações reais, e uma métrica de semelhança que seria ela própria discutível. O que se testa é a **estabilidade** (fixtures, decisão 2); a qualidade avalia-se ouvindo (Tarefa 14) e vendo (Tarefa 13), por uma pessoa.

## Âmbito técnico

* Auditar a cobertura de `@/lib` e fechar lacunas em: `audio`, `notes`, `tempo`, `quantize`, `key`, `notation`, `export`, `playback`, `migrations`
* Criar os fixtures de áudio sintéticos (decisão 2) e um utilitário que os gere de forma reprodutível a partir de código
* Criar os `ScoreDocument` esperados e o teste de regressão que os compara
* Documentar em `docs/` o procedimento de revisão de um esperado alterado (decisão 3)
* Criar o duplo de teste do worker de transcrição (decisão 4)
* Completar os testes de componentes das views e dos sete componentes de interface
* Configurar Playwright e implementar os percursos da decisão 6
* Implementar os testes de PWA/offline sobre `pnpm preview` (decisão 7)
* Configurar cobertura com mínimo em `@/lib` (decisão 8)
* Acrescentar testes dos casos limite conhecidos: áudio em silêncio, uma só nota, ficheiro corrompido, documento de versão superior, quota esgotada, permissão de microfone negada
* Garantir que a suite unitária corre em segundos, sem carregar o modelo

## Guardrails para IA (atualizar `AGENTS.md`)

* "Toda a função em `@/lib` tem teste unitário; a cobertura mínima de `@/lib` é verificada e não se baixa para fazer passar uma alteração."
* "Os `ScoreDocument` esperados dos testes de regressão são revistos à mão; proibido regenerá-los em bloco com atualização automática de snapshots — um esperado alterado exige justificação no commit de porque o novo resultado é melhor."
* "Os fixtures de áudio são WAV sintéticos gerados por código e versionados; proibido adicionar gravações reais ou ficheiros de música com direitos ao repositório."
* "Testes que não sejam de regressão usam o duplo de teste do worker de transcrição; proibido carregar o modelo real em testes unitários ou de componentes."
* "Testes de componentes consultam por papel e por texto acessível; proibido seletores de classe CSS ou dependências da estrutura interna dos componentes."
* "Testes de PWA e offline correm sempre sobre o build de produção (`pnpm preview`); o service worker não existe em modo de desenvolvimento."
* "Não escrever testes que pontuem automaticamente a qualidade musical de uma transcrição; testa-se estabilidade, não qualidade."
* "A suite unitária corre em segundos; qualquer teste que precise do modelo real vive na suite de regressão, separada."

## Entregáveis

* Suite unitária completa de `@/lib`, a correr em segundos
* Testes de regressão com fixtures a detetar alterações de comportamento do pipeline
* Testes de componentes de todas as views e componentes
* Percursos end-to-end a passar, incluindo gravação com microfone falso
* Testes de PWA/offline a passar sobre o build de produção
* Casos limite cobertos
* Cobertura de `@/lib` acima do mínimo definido
* Procedimento de revisão de esperados documentado
* `AGENTS.md` atualizado com as regras acima

## Notas / Dependências

* Depende de todas as tarefas anteriores.
* Os fixtures da decisão 2 são o entregável mais valioso desta tarefa: são a única defesa contra o cenário em que alguém afina um limiar para melhorar um caso e piora silenciosamente três outros. Vale a pena que cubram os casos que já se sabe serem difíceis — harmónicos de oitava (Tarefa 8), notas ligadas sobre barras (Tarefa 10), tonalidade com bemóis (Tarefa 11).
* O microfone falso do Playwright (decisão 6) precisa de WAV com formato específico; confirmar a taxa de amostragem e o número de canais aceites, ou o teste falha por uma razão que não tem nada a ver com a app.
* Se um teste end-to-end começar a falhar de forma intermitente, a causa provável é tempo de inferência variável — aumentar o tempo de espera, nunca desativar o teste.
