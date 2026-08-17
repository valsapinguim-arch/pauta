# Tarefa 13 — Renderização da Pauta

## Objetivo

Desenhar o `ScoreDocument` no ecrã: pentagrama, compassos, notas, pausas, ligaduras, armação, indicação de compasso e andamento — legível em telefone e em desktop.

## Contexto

Depende da Tarefa 12 (`ScoreDocument`) e da Tarefa 3 (_slot_ da pauta na `ResultView`). É o momento em que o produto passa a ser verificável: até aqui a qualidade da transcrição era invisível.

## Decisões adotadas

**1. VexFlow como motor de desenho**

- Justificação: é a biblioteca de notação para web mais madura, desenha em SVG, e cobre tudo o que o modelo produz (notas, pausas, ligaduras, armações, claves). Alternativas: OpenSheetMusicDisplay é excelente mas consome MusicXML — obrigaria a serializar o documento para XML só para o desenhar, e a exportação (Tarefa 15) deixaria de ser o único consumidor desse formato; desenhar notação à mão em SVG é semanas de trabalho para reproduzir mal o que o VexFlow já faz.

**2. Saída em SVG, não Canvas**

- Justificação: (a) a exportação para PNG e PDF (Tarefa 15) parte do SVG, que é vetorial e escala sem perda; (b) o SVG tem nós no DOM, o que permite associar elementos a notas para o cursor de reprodução (Tarefa 14) e para a seleção na edição (Tarefa 17); (c) em ecrãs de alta densidade não é preciso gerir `devicePixelRatio` à mão.

**3. Sistemas quebrados por largura disponível, recalculado ao redimensionar**

- O número de compassos por linha é calculado a partir da largura do contentor, não fixo.
- Justificação: uma pauta com quatro compassos por linha fica ilegível em 320 px e desperdiça metade do ecrã em 1280 px. É o mínimo para que a app funcione em telefone, que é o caso de uso principal.

**4. Redesenho completo a cada alteração, sem desenho incremental**

- Qualquer mudança (novo documento, redimensionamento, edição) limpa o SVG e redesenha.
- Justificação: o VexFlow não tem um modelo de atualização incremental, e para trechos de até 60 segundos (poucas dezenas de compassos) o redesenho é rápido. Tentar atualizar cirurgicamente seria complexidade sem benefício mensurável. Reavaliar apenas se a Tarefa 19 medir lentidão real.

**5. Redimensionamento com `ResizeObserver` e atraso deliberado**

- `ResizeObserver` no contentor, com _debounce_.
- Justificação: sem atraso, arrastar a janela em desktop dispara dezenas de redesenhos por segundo. Com atraso, redesenha uma vez no fim. `ResizeObserver` e não o evento `resize` da janela porque o contentor também muda de tamanho quando a interface em volta muda (avisos a aparecer, teclado a abrir).

**6. Zoom por escala do SVG, com scroll horizontal só quando inevitável**

- Zoom em passos, aplicado como escala; a quebra de linha continua a adaptar-se, de modo a manter o scroll vertical como o gesto normal.
- Justificação: uma pauta que exige arrastar para os lados para ler cada linha é uma experiência má em telefone. Mantendo a quebra adaptativa, o zoom aumenta o tamanho das notas e reduz compassos por linha — que é o que quem tem dificuldade em ver realmente quer.

**7. Elementos SVG associados às notas por atributo `data-*`**

- Cada nota desenhada leva `data-measure` e `data-element` correspondentes à posição no `ScoreDocument`.
- Justificação: é o que permite às Tarefas 14 e 17 localizar a nota no ecrã a partir do documento (e vice-versa) sem depender da ordem interna dos nós que o VexFlow gera. Fazer isto agora evita que essas tarefas tenham de reabrir este código.

**8. Aviso de confiança baixa mostrado acima da pauta, com o motivo**

- Se a confiança agregada (Tarefa 12) for baixa, mostra-se um aviso que diz qual das partes está fraca e sugere a correção correspondente (BPM ou tonalidade).
- Justificação: é onde o requisito de honestidade do produto se junta a uma ação concreta. Um aviso genérico ("o resultado pode não ser preciso") é ruído; um aviso que diz "o andamento pode estar errado — corrige aqui" é útil.

**9. Sem edição nesta tarefa**

- Notas desenhadas não respondem a cliques.
- Justificação: a edição é a Tarefa 17 e depende de decisões de interação que não vale a pena antecipar. Os `data-*` da decisão 7 são a preparação suficiente.

**10. VexFlow importado dinamicamente**

- `import()` dinâmico, carregado só quando há um resultado para desenhar.
- Justificação: o VexFlow é uma das duas dependências grandes da app (a outra é o modelo). O primeiro carregamento não precisa dele — quem abre a app vê o botão de gravar. Tirá-lo do bundle inicial melhora o arranque, que é o momento em que a app é julgada.

## Âmbito técnico

- Instalar VexFlow e configurar o `import()` dinâmico (decisão 10)
- Implementar `@/features/notation/ScoreView`:
  - converte `ScoreDocument` em elementos VexFlow (compassos, notas, pausas, ligaduras, armação, compasso, andamento)
  - calcula compassos por linha a partir da largura (decisão 3)
  - `ResizeObserver` com _debounce_ (decisão 5)
  - aplica `data-measure` / `data-element` (decisão 7)
- Implementar controlos de zoom
- Implementar o aviso de confiança (decisão 8), ligado aos controlos de BPM (Tarefa 9) e tonalidade (Tarefa 11)
- Implementar estado vazio: documento sem notas mostra mensagem, não pauta em branco
- Preencher o _slot_ da pauta na `ResultView` (Tarefa 3)
- Mostrar um `Spinner` enquanto o VexFlow carrega
- Verificar em 320 px, 768 px e 1280 px, em retrato e paisagem, claro e escuro
- **Afinar** `MODEL_THRESHOLDS` (Tarefa 7) e `NOTE_CLEANUP` (Tarefa 8) agora que o resultado é visível

## Guardrails para IA (atualizar `AGENTS.md`)

- "A renderização usa VexFlow com saída SVG; proibido Canvas — a exportação (Tarefa 15), o cursor de reprodução (Tarefa 14) e a seleção (Tarefa 17) dependem de nós SVG no DOM."
- "VexFlow é importado dinamicamente e nunca entra no bundle inicial."
- "A pauta é sempre redesenhada por completo; proibido tentar atualização incremental de elementos VexFlow."
- "O número de compassos por linha é calculado a partir da largura disponível; proibido fixá-lo — a app tem de ser legível a 320 px."
- "Cada nota desenhada leva `data-measure` e `data-element` correspondentes à posição no `ScoreDocument`; nenhuma outra feature localiza notas no SVG pela ordem dos nós gerados pelo VexFlow."
- "Redimensionamento é observado com `ResizeObserver` e sempre com _debounce_."
- "Quando a confiança é baixa, o aviso identifica a causa (notas, andamento ou tonalidade) e liga à correção correspondente; proibido aviso genérico sem ação."
- "Um documento sem notas mostra estado vazio explicativo, nunca um pentagrama vazio."
- "`ScoreView` só lê o `ScoreDocument`; proibido modificá-lo (a edição é da Tarefa 17)."

## Entregáveis

- Pauta desenhada corretamente a partir de qualquer `ScoreDocument` válido
- Legível em 320 px e a aproveitar a largura em 1280 px
- Redimensionamento e zoom a funcionar sem tremer nem redesenhar em excesso
- Ligaduras, armação, acidentes, pausas e andamento desenhados
- Aviso de confiança a apontar a causa e a ligar à correção
- `data-*` presentes e corretos
- Limiares das Tarefas 7 e 8 afinados contra resultados reais, com os valores novos documentados
- `AGENTS.md` atualizado com as regras acima

## Notas / Dependências

- Depende das Tarefas 3 e 12. Entrega para as Tarefas 14, 15 e 17.
- Esta é a primeira tarefa em que se pode julgar a qualidade da transcrição. Gravar uma escala, uma melodia simples conhecida e um trecho cantado, e olhar para as três pautas — é aqui que os limiares das Tarefas 7 e 8 se acertam de vez, e essa afinação faz parte do âmbito.
- Verificar as cores do SVG nos dois temas: é fácil o pentagrama ficar preto sobre fundo escuro. Usar tokens (`currentColor` onde possível) e não cores literais.
- A exportação para PNG/PDF (Tarefa 15) vai precisar do SVG com estilos aplicáveis fora do DOM — evitar depender de CSS externo para as cores das notas, ou o ficheiro exportado sai sem elas.
