# Tarefa 3 — Interface Mínima

## Objetivo

Construir os poucos componentes de interface que a app precisa e o ecrã único com os seus cinco estados visuais. No fim desta tarefa o fluxo completo é navegável com dados falsos — grava (simulado), processa (simulado), mostra uma pauta (imagem estática) — o que permite validar o desenho antes de existir pipeline.

## Contexto

Depende da Tarefa 1 (tokens, máquina de estados, `@/strings`). É a tarefa que define o que o utilizador vê; as Tarefas 4 a 15 ligam funcionalidade real aos *slots* deixados aqui.

## Decisões adotadas

**1. Sem biblioteca de componentes, sem framework de CSS**
- CSS Modules + tokens CSS. Sem MUI, sem Tailwind, sem shadcn.
- Justificação: o inventário total de componentes são sete peças simples. Uma biblioteca de componentes traria mais bytes e mais opinião do que valor, e Tailwind traria uma linguagem de estilo inteira para estilizar sete coisas. O orçamento de bundle desta app é gasto no modelo de ML (Tarefa 7) e no VexFlow (Tarefa 13), não em CSS.

**2. Inventário fechado de sete componentes**
- `Button`, `IconButton`, `Sheet`, `Progress`, `Alert`, `Spinner`, `Toast`. Mais nada.
- Justificação: a app tem um ecrã. Cada componente acrescentado é uma decisão de design a manter consistente para sempre. Este inventário cobre todos os estados do fluxo; o que não estiver aqui deve ser composto a partir destes, ou não deve existir.
- **Quando alargar:** a Tarefa 16 (biblioteca) provavelmente precisa de uma `List`, e a Tarefa 17 (edição) de um controlo de seleção. Nessas tarefas, acrescentar ao inventário e justificar — não antes.

**3. Radix apenas onde há acessibilidade não trivial**
- `Toast` e `Alert` (quando modal) sobre as primitivas Radix; os restantes são HTML nativo estilizado.
- Justificação: um `Button` é um `<button>` — embrulhá-lo numa primitiva não acrescenta nada. Já gestão de foco, `aria-live` e ordem de anúncio em toasts é fácil de fazer mal e chato de descobrir. Usa-se a primitiva exatamente onde ela paga o seu peso.

**4. O botão de gravar é o único elemento primário do ecrã**
- Alvo grande e circular, centrado, com estados visuais claros para `idle` e `recording`. Tudo o resto (importar ficheiro, biblioteca, exportar) é visualmente secundário.
- Justificação: o produto tem uma ação. Hierarquia visual ambígua num ecrã de uma ação é um problema autoinfligido. Também resolve o uso com uma mão em telefones, que é o cenário provável (alguém a ouvir algo e a querer captá-lo depressa).

**5. Importar ficheiro é uma ação secundária, sempre visível**
- Botão de texto abaixo do botão principal, mais zona de *drop* em ecrãs largos.
- Justificação: em telefone, drag & drop não existe; em desktop, é o gesto esperado. Um botão sempre visível funciona nos dois, e a zona de *drop* acrescenta-se só onde faz sentido.

**6. Aviso de limitação mostrado no estado `idle`, antes de gravar**
- Uma linha permanente e discreta a dizer que funciona com um instrumento ou voz de cada vez, e mal com música com vários instrumentos.
- Justificação: é o requisito de honestidade do `AGENTS.md` transformado em pixels. Enterrado num ecrã de ajuda ninguém o lê; mostrado depois do resultado, é uma desculpa. Antes de gravar, é uma expectativa calibrada. Deve ser discreto — não um aviso alarmante que faça a app parecer estragada.

**7. Cinco estados = cinco componentes, um por estado**
- `IdleView`, `RecordingView`, `ProcessingView`, `ResultView`, `ErrorView`, escolhidos por `switch` exaustivo sobre o estado da sessão.
- Justificação: renderização condicional entrelaçada num só componente é onde nascem estados visuais impossíveis. Um `switch` exaustivo sobre uma união discriminada faz o TypeScript reclamar se um estado novo não for tratado.

**8. Modo escuro por preferência do sistema, sem alternador**
- Tokens redefinidos em `@media (prefers-color-scheme: dark)`.
- Justificação: respeita a escolha que o utilizador já fez no sistema. Um alternador é uma preferência a persistir, um controlo a colocar e um estado a testar, para resolver um problema que o sistema operativo já resolveu.

**9. Sem animações de transição entre estados nesta fase**
- Apenas *feedback* imediato (pressão de botão, indicador de nível, progresso).
- Justificação: transições entre estados que duram segundos ou minutos (processamento) não beneficiam de coreografia; e animar antes de saber quanto tempo cada estado dura na realidade leva a animações erradas. A Tarefa 18 revê isto, incluindo `prefers-reduced-motion`.

## Âmbito técnico

* Completar `src/styles/tokens.css`: paleta (clara e escura), espaçamento, tipografia, radius, sombra, z-index
* Implementar os sete componentes da decisão 2, cada um em `ComponentName.tsx` + `ComponentName.module.css` + `index.ts`
* Implementar `IdleView`, `RecordingView`, `ProcessingView`, `ResultView`, `ErrorView`
* Ligar as views ao `sessionReducer` da Tarefa 1 com `switch` exaustivo
* Deixar *slots* explícitos, com `// TODO Tarefa N:` a identificar quem os preenche:
  * `onStartRecording` → Tarefa 4
  * `onPickFile` / zona de *drop* → Tarefa 5
  * nível de áudio em `RecordingView` → Tarefa 4
  * progresso real em `ProcessingView` → Tarefas 6/7
  * pauta em `ResultView` → Tarefa 13
  * ações de exportação em `ResultView` → Tarefa 15
* Implementar o aviso de limitação da decisão 6, com texto em `@/strings`
* Adicionar um mecanismo de desenvolvimento para forçar cada estado (ex.: `?state=processing`) e conseguir revê-los todos sem pipeline
* Verificar em 320 px, 768 px e 1280 px, nos modos claro e escuro

## Guardrails para IA (atualizar `AGENTS.md`)

* "O inventário de componentes é fechado: `Button`, `IconButton`, `Sheet`, `Progress`, `Alert`, `Spinner`, `Toast`. Acrescentar um componente exige justificação escrita no ficheiro da tarefa que o introduz."
* "Não introduzir bibliotecas de componentes (MUI, Chakra, shadcn) nem frameworks de CSS (Tailwind, styled-components) — CSS Modules + tokens é a única abordagem de estilo."
* "Cada estado da sessão tem exatamente um componente de view, escolhido por `switch` exaustivo; proibido renderizar dois estados ao mesmo tempo ou condicionar partes de uma view a flags de outro estado."
* "Nenhuma página ou feature estiliza elementos HTML base (`<button>`, `<input>`) diretamente — usa sempre o componente correspondente, importado do barrel `@/components`."
* "Proibido valor literal de cor, espaçamento, tipografia, radius ou z-index dentro de um componente; vem sempre de `var(--token)`."
* "O aviso sobre a limitação a instrumento único é mostrado no estado `idle`, antes de gravar. Proibido removê-lo, esconder atrás de um ecrã de ajuda, ou mostrar só depois do resultado."
* "O botão de gravar é o único elemento visualmente primário do ecrã principal; qualquer ação nova entra como secundária."
* "Não adicionar alternador de tema — o modo escuro segue `prefers-color-scheme`."

## Entregáveis

* Os cinco estados navegáveis com dados falsos, do início ao fim
* Sete componentes implementados, com teste de componente básico (renderiza, responde a interação, estados desativados)
* Legível e utilizável em 320 px, em claro e escuro
* Alvos de toque com pelo menos 44×44 px
* Aviso de limitação visível no estado `idle`
* `AGENTS.md` atualizado com as regras acima

## Notas / Dependências

* Depende da Tarefa 1.
* Os *slots* desta tarefa são o contrato com as tarefas seguintes. Se uma tarefa posterior precisar de mudar a forma de um *slot*, atualizar aqui o componente — nunca criar uma view alternativa em paralelo.
* A `ResultView` mostra nesta fase uma imagem estática de pauta como *placeholder*. Não tentar desenhar notação à mão em SVG para fazer de conta — VexFlow é da Tarefa 13 e uma implementação intermédia seria descartada.
* Testar o botão de gravar com o telefone numa só mão, e a pauta em paisagem — são os dois cenários reais de uso e os mais fáceis de esquecer num monitor grande.
