# Tarefa 18 — Acessibilidade e Idioma

## Objetivo

Tornar a app utilizável por teclado e por leitor de ecrã, com contraste e alvos de toque adequados, movimento respeitador das preferências do sistema, e todos os textos revistos em pt-PT.

## Contexto

Depende de todas as tarefas de interface (3, 4, 5, 13, 14, 16, 17). Faz-se agora, e não no início, porque só com todos os ecrãs construídos é possível verificar percursos completos em vez de componentes isolados — mas as regras que aqui se fixam são retroativas a tudo o que existe.

## Decisões adotadas

**1. Auditoria e correção, não reescrita**
- Percorrem-se os percursos completos e corrige-se o que estiver mal, mantendo a estrutura existente.
- Justificação: os componentes foram construídos sobre HTML nativo e primitivas Radix (Tarefa 3, decisão 3), o que significa que a base de acessibilidade já existe. O que falta são lacunas concretas — rótulos, anúncios de mudança de estado, ordem de foco — não uma arquitetura errada.

**2. Estados assíncronos anunciados com `aria-live`, com granularidade deliberada**
- `polite` para progresso e conclusão; `assertive` apenas para erros.
- O progresso da transcrição é anunciado por marcos (25%, 50%, 75%, concluído), nunca a cada atualização.
- Justificação: um `aria-live` ligado a uma percentagem que muda dez vezes por segundo torna a app inutilizável com leitor de ecrã — a fala nunca chega ao fim de uma frase. Marcos dão a informação sem inundar. `assertive` só para erros porque interrompe o que está a ser lido, o que só se justifica quando é preciso agir.

**3. A pauta descrita em texto, não apenas desenhada**
- O SVG leva `role="img"` e uma descrição gerada a partir do `ScoreDocument`: tonalidade, compasso, andamento, número de compassos, tessitura. Existe além disso uma lista textual das notas, disponível a pedido.
- Justificação: uma pauta é informação visual densa e não há forma de a tornar navegável por leitor de ecrã com o SVG do VexFlow. Uma descrição do resumo dá o essencial; a lista de notas ("compasso 1: dó semínima, ré corchea…") é o que permite mesmo saber o que foi transcrito. É gerada do documento, portanto é sempre coerente com o que está desenhado.

**4. Percursos completos operáveis por teclado**
- Gravar, importar, corrigir BPM e tonalidade, reproduzir, editar, exportar e navegar a biblioteca — tudo alcançável e acionável sem rato, com indicador de foco visível.
- Justificação: é o teste que revela problemas reais (ordem de tabulação, focos perdidos ao mudar de estado, teclas de atalho em conflito) que a verificação componente a componente não deteta. O indicador de foco nunca é removido — é o que um utilizador de teclado usa para saber onde está.

**5. Foco gerido nas transições de estado**
- Ao passar para `result`, o foco vai para a região da pauta; ao abrir a barra de edição, para o primeiro controlo; ao fechar um diálogo, volta ao elemento que o abriu; em erro, para a mensagem.
- Justificação: as views são substituídas por completo (Tarefa 3, decisão 7), o que faz o foco cair no `body` e um utilizador de teclado ou de leitor de ecrã perder o contexto — tem de tabular do início a cada mudança de estado.

**6. Contraste AA verificado com os tokens, incluindo os elementos SVG**
- Mínimo 4.5:1 para texto, 3:1 para elementos gráficos, nos temas claro e escuro.
- Inclui o pentagrama, as notas e o cursor de reprodução.
- Justificação: os elementos do VexFlow são desenhados por uma biblioteca e escapam facilmente à revisão de contraste — é o sítio mais provável para ficar cinzento sobre cinzento, e é o conteúdo principal da app.

**7. `prefers-reduced-motion` respeitado; o cursor de reprodução é exceção justificada**
- Com a preferência ativa, elimina-se toda a animação decorativa. O cursor de reprodução e o indicador de nível de áudio mantêm-se, por serem informação e não decoração.
- Justificação: `prefers-reduced-motion` pede para não haver movimento gratuito, não para remover a informação transmitida por movimento — um cursor de reprodução parado não indica nada. O auto-scroll passa a instantâneo em vez de suave, que é a adaptação correta.

**8. Textos revistos em pt-PT, sem biblioteca de i18n**
- Mantém-se a estrutura de `@/strings` (Tarefa 1, decisão 6); revê-se a qualidade e a consistência do português.
- Justificação: a decisão de não instalar i18n mantém-se — continua a haver um só idioma. O que esta tarefa acrescenta é revisão de conteúdo: consistência de tratamento, terminologia musical correta (as figuras chamam-se semínima e corchea, não "quarto" e "oitavo"), e mensagens de erro que dizem o que fazer.
- **Reavaliar:** se aparecer intenção real de suportar outro idioma, a estrutura de `@/strings` já isola tudo e a migração é mecânica. Não antecipar.

**9. Alvos de toque de 44×44 px em toda a interface, com uma exceção documentada**
- Aplica-se a todos os controlos. A exceção são as notas na pauta, cujo tamanho é definido pela notação — resolvida com áreas de toque invisíveis alargadas (Tarefa 17, decisão 3).
- Justificação: não se pode desenhar uma nota com 44 px de altura sem destruir a pauta. Alargar a área sensível resolve o problema sem alterar o desenho.

**10. Sem `role`/`aria-*` a duplicar semântica nativa**
- Um `<button>` não leva `role="button"`; um `<nav>` não leva `role="navigation"`.
- Justificação: atributos ARIA redundantes não melhoram nada e criam a oportunidade de contradizer a semântica nativa — uma das causas mais comuns de acessibilidade pior por excesso de zelo.

## Âmbito técnico

* Auditar com teclado todos os percursos da decisão 4, corrigindo ordem de tabulação e focos perdidos
* Auditar com leitor de ecrã (NVDA ou VoiceOver) os mesmos percursos
* Implementar `@/lib/notation/describe.ts`: `describeScore(doc)` (resumo) e `describeNotes(doc)` (lista textual), funções puras
* Implementar a descrição do SVG e a lista de notas a pedido (decisão 3)
* Implementar os anúncios `aria-live` com a granularidade da decisão 2
* Implementar a gestão de foco nas transições (decisão 5)
* Verificar contraste de todos os tokens e dos elementos SVG, nos dois temas (decisão 6)
* Implementar o tratamento de `prefers-reduced-motion` (decisão 7)
* Revisão completa dos textos em `@/strings`, incluindo terminologia musical (decisão 8)
* Verificar alvos de toque (decisão 9)
* Remover atributos ARIA redundantes já introduzidos (decisão 10)
* Adicionar `axe-core` aos testes de componentes, a falhar em violações
* Testes: `describeScore`/`describeNotes` com melodia conhecida; nomes de figuras em pt-PT; ausência de violações axe nos ecrãs principais

## Guardrails para IA (atualizar `AGENTS.md`)

* "Todo o percurso funcional é operável por teclado com indicador de foco visível; proibido remover o indicador de foco (`outline: none`) sem substituto igualmente visível."
* "Mudanças de estado assíncronas são anunciadas por `aria-live`: `polite` para progresso e conclusão, `assertive` só para erros. Progresso é anunciado por marcos, nunca a cada atualização."
* "O SVG da pauta tem sempre descrição textual gerada do `ScoreDocument` por `describeScore`; a lista textual de notas está disponível a pedido. Proibido deixar a pauta como conteúdo exclusivamente visual."
* "As transições de estado colocam o foco explicitamente (pauta em `result`, primeiro controlo ao abrir a edição, mensagem em `error`, elemento de origem ao fechar um diálogo)."
* "Contraste mínimo 4.5:1 para texto e 3:1 para elementos gráficos, nos dois temas, incluindo os elementos desenhados pelo VexFlow."
* "`prefers-reduced-motion` elimina animação decorativa; o cursor de reprodução e o indicador de nível mantêm-se por serem informação — o auto-scroll passa a instantâneo."
* "Alvos de toque com pelo menos 44×44 px; as notas da pauta são a única exceção e usam áreas de toque invisíveis alargadas."
* "Proibido `role`/`aria-*` que dupliquem semântica nativa de HTML."
* "Terminologia musical em pt-PT correta: semibreve, mínima, semínima, corchea, semicorchea; nunca traduções literais do inglês."
* "Os testes de componentes correm `axe-core` e falham em violações."

## Entregáveis

* Todos os percursos completáveis apenas com teclado
* Percursos verificados com leitor de ecrã, com anúncios úteis e não intrusivos
* Descrição textual da pauta e lista de notas disponíveis e corretas
* Contraste AA verificado nos dois temas, incluindo a pauta
* `prefers-reduced-motion` respeitado sem perder informação
* Textos revistos, com terminologia musical correta
* `axe-core` integrado e sem violações nos ecrãs principais
* `AGENTS.md` atualizado com as regras acima

## Notas / Dependências

* Depende das Tarefas 3, 4, 5, 13, 14, 16 e 17.
* A decisão 3 é a mais valiosa desta tarefa: sem ela, o conteúdo principal da app é inacessível. A lista de notas também é útil a quem vê — serve para verificar a transcrição sem saber ler pauta, o que é uma boa surpresa vinda de um requisito de acessibilidade.
* Ferramentas automáticas (axe, Lighthouse) apanham talvez metade dos problemas. A auditoria manual com teclado é a que encontra os focos perdidos, e é onde está o valor real desta tarefa.
* Verificar o percurso de gravação com leitor de ecrã com atenção especial: é onde há mais mudanças de estado em pouco tempo e mais fácil o utilizador ficar sem saber o que está a acontecer.
