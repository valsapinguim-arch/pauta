# Tarefa 17 — Edição Manual Mínima

## Objetivo

Permitir corrigir a transcrição à mão: selecionar uma nota, alterar altura ou duração, eliminar, transpor a peça, com desfazer e refazer.

## Contexto

Depende da Tarefa 12 (`ScoreDocument` imutável), da Tarefa 13 (`data-*` no SVG para seleção) e da Tarefa 16 (gravação das alterações). É a última tarefa de funcionalidade do produto.

## Decisões adotadas

**1. Âmbito fechado: cinco operações**
- Alterar altura, alterar duração, eliminar nota, inserir nota, transpor a peça. Mais nada.
- Justificação: a app é uma ferramenta de transcrição com correção, não um editor de partituras. Adicionar vozes, dinâmica, articulações, compassos ou letra é construir um MuseScore no browser — e quem precisa disso exporta MusicXML (Tarefa 15) e usa o MuseScore, que é melhor nisso. Estas cinco operações cobrem os erros que a transcrição automática realmente comete.

**2. Correção antes de edição: os controlos de BPM e tonalidade são a primeira linha**
- A interface apresenta primeiro os controlos globais (BPM, tonalidade, título) e só depois a edição nota a nota.
- Justificação: a maioria dos erros percebidos não são notas erradas — são o andamento ou a tonalidade errados, que fazem *todas* as notas parecerem erradas. Corrigir o BPM resolve dezenas de notas de uma vez; editar nota a nota o que um ajuste de BPM resolvia é trabalho desperdiçado. A ordem na interface deve refletir isso.

**3. Seleção por toque no SVG, resolvida pelos `data-*`**
- Clique/toque num elemento sobe até ao nó com `data-measure`/`data-element` e seleciona a posição correspondente no documento.
- Justificação: é exatamente para isto que os atributos foram criados na Tarefa 13, decisão 7. Depender da ordem dos nós que o VexFlow gera seria frágil a cada atualização da biblioteca.
- Alvos de toque: notas desenhadas são pequenas em telefone; a área sensível tem de ser alargada por um retângulo invisível, ou a seleção é impossível com o dedo.

**4. Altura alterada por semitons, com botões, não por arrastar**
- Setas para cima/baixo, um semitom por toque, e oitava com um gesto secundário.
- Justificação: arrastar uma nota no pentagrama é o gesto de um editor de partituras em desktop, e num telefone é impreciso — um erro de um pixel muda a nota. Botões são inequívocos e funcionam com o dedo. Semitons e não graus da escala porque a alteração pretendida é frequentemente cromática (foi isso que o modelo errou).

**5. Alteração de duração propaga-se por requantização do compasso, não por deslocamento**
- Mudar a duração de uma nota refaz o preenchimento de pausas e as ligaduras **do compasso afetado**, mantendo os inícios das notas seguintes.
- Justificação: se alterar uma duração empurrasse tudo para a frente, uma correção pontual desalinhava o resto da peça — e os inícios são a informação rítmica que a Tarefa 10 (decisão 4) decidiu preservar. Requantizar o compasso mantém a alteração local e o documento sempre válido.

**6. Todas as operações passam pelas funções puras de `@/lib/notation/edit`**
- `changePitch`, `changeDuration`, `deleteNote`, `insertNote`, `transpose` — recebem e devolvem `ScoreDocument`.
- Justificação: mantém a imutabilidade da Tarefa 12 (decisão 7), permite testar todas as edições sem interface, e é o que faz o desfazer da decisão 7 ser trivial.

**7. Desfazer/refazer por pilha de documentos, com limite**
- Duas pilhas de `ScoreDocument`, limitadas a 30 estados.
- Justificação: com documentos imutáveis, guardar o documento inteiro é mais simples e mais robusto do que registar operações inversas — não há operação inversa a implementar mal. Cada documento são poucos KB; 30 estados são irrelevantes em memória. O limite existe só para a pilha não crescer indefinidamente numa sessão longa.

**8. Toda a edição revalida o documento e falha em vez de gravar inválido**
- Cada operação corre `validateScoreDocument` (Tarefa 12) antes de aceitar o novo estado. Se falhar, mantém-se o anterior e avisa-se.
- Justificação: as edições são o caminho mais provável para chegar a um documento inconsistente (um compasso que não soma, uma ligadura sem par). Sem esta verificação, o documento inválido seria persistido (Tarefa 16) e a falha apareceria ao reabrir — longe da causa.

**9. Transposição altera as alturas e reavalia a grafia, não só a armação**
- Transpor por semitons recalcula `pitchMidi` de todas as notas, atualiza a tonalidade e refaz a grafia (Tarefa 11) e a clave (Tarefa 12).
- Justificação: transpor mudando apenas a armação produz notação errada. E como a tessitura muda, a clave escolhida pode deixar de ser a adequada — uma melodia transposta uma oitava abaixo em clave de sol fica ilegível.

**10. Notas ligadas editadas como uma unidade**
- Operações sobre uma parte de uma nota ligada aplicam-se a todas as partes com o mesmo `sourceIndex`.
- Justificação: para o utilizador é uma nota, não duas. É a razão pela qual `sourceIndex` foi preservado na Tarefa 10 (decisão 9).

**11. Reprodução para ao editar**
- Qualquer edição interrompe a reprodução em curso.
- Justificação: os osciladores estão agendados a partir do documento antigo (Tarefa 14, decisão 3). Continuar a tocar produziria som que já não corresponde à pauta. Regra já estabelecida na Tarefa 14.

## Âmbito técnico

* Implementar em `@/lib/notation/edit.ts` como funções puras:
  * `changePitch(doc, position, semitones)`
  * `changeDuration(doc, position, noteType, dots)` — requantiza o compasso (decisão 5)
  * `deleteNote(doc, position)` — substitui por pausa equivalente
  * `insertNote(doc, position, pitchMidi, noteType)`
  * `transpose(doc, semitones)` — reavalia grafia e clave (decisão 9)
  * `resolveTiedGroup(doc, position)` → todas as posições da nota (decisão 10)
* Implementar `@/features/notation/useScoreEditor(doc)`: seleção, operações, pilhas de desfazer/refazer, validação (decisão 8)
* Implementar a seleção no SVG com áreas de toque alargadas (decisão 3)
* Implementar a barra de edição: aparece com uma nota selecionada, com altura, duração, eliminar
* Implementar o controlo de transposição e os botões de desfazer/refazer
* Ordenar a interface conforme a decisão 2 (globais primeiro)
* Ligar à gravação da Tarefa 16 com *debounce*
* Parar a reprodução em qualquer edição (decisão 11)
* Acrescentar ao inventário de componentes da Tarefa 3 o que for necessário, justificando
* Testes:
  * `changePitch` altera a altura e a grafia conforme a tonalidade
  * `changeDuration` mantém o compasso a somar `measureTicks`
  * `deleteNote` deixa uma pausa da mesma duração
  * `transpose` de +2 semitons sobe todas as notas e atualiza a armação
  * `transpose` de −12 semitons pode mudar a clave
  * editar uma parte de uma nota ligada afeta todas
  * operação que produziria documento inválido é rejeitada e o documento anterior mantém-se
  * desfazer/refazer repõe estados exactos; pilha limitada a 30

## Guardrails para IA (atualizar `AGENTS.md`)

* "As operações de edição são exclusivamente: alterar altura, alterar duração, eliminar, inserir e transpor. Não adicionar vozes, acordes, dinâmica, articulações, letra, gestão de compassos ou qualquer outra funcionalidade de editor de partituras — quem precisa disso exporta MusicXML."
* "Toda a edição passa por funções puras em `@/lib/notation/edit.ts` que recebem e devolvem `ScoreDocument`; proibido mutar o documento ou editar diretamente o SVG."
* "Toda a edição corre `validateScoreDocument` antes de ser aceite; se falhar, mantém-se o documento anterior e avisa-se o utilizador — nunca se persiste um documento inválido."
* "Alterar a duração de uma nota requantiza o compasso afetado; proibido deslocar os inícios das notas seguintes."
* "A seleção de notas resolve-se pelos atributos `data-measure`/`data-element`; proibido depender da ordem dos nós SVG gerados pelo VexFlow."
* "Operações sobre uma parte de uma nota ligada aplicam-se a todas as partes do mesmo `sourceIndex`."
* "Transpor recalcula alturas, tonalidade, grafia e clave; proibido transpor alterando apenas a armação."
* "Desfazer/refazer é uma pilha de `ScoreDocument` completos, limitada a 30 estados; proibido implementar operações inversas."
* "Os controlos globais (BPM, tonalidade, título) aparecem antes da edição nota a nota — a maioria dos erros resolve-se aí."
* "Qualquer edição interrompe a reprodução em curso."

## Entregáveis

* As cinco operações a funcionar, em telefone e desktop
* Seleção de notas usável com o dedo em 320 px
* Documento sempre válido após qualquer sequência de edições
* Desfazer/refazer fiável
* Transposição correta, incluindo mudança de clave quando aplicável
* Edições persistidas e repostas ao reabrir da biblioteca
* Exportação (Tarefa 15) a refletir as edições
* Testes da decisão acima a passar
* `AGENTS.md` atualizado com as regras acima

## Notas / Dependências

* Depende das Tarefas 12, 13 e 16.
* A decisão 5 é a mais difícil de implementar bem. Se a requantização do compasso se revelar complicada, a alternativa aceitável é restringir a alteração de duração às figuras que caibam no espaço disponível — menos flexível, mas mantém o documento sempre válido, que é o requisito que não se negocia.
* Verificar a exportação depois de editar: é o caminho onde a decisão 8 da Tarefa 15 (exportar sempre do documento) é posta à prova.
* Se a edição nota a nota se revelar pouco usada em favor dos controlos de BPM e tonalidade, isso confirma a decisão 2 — e é sinal para não investir mais aqui.
