# Tarefa 7 — Motor de Transcrição

## Objetivo

Integrar o modelo Basic Pitch a correr no browser: empacotar o modelo para funcionar offline, executar a inferência num Web Worker, reportar progresso, permitir cancelamento e converter a saída do modelo em `NoteEvent[]`.

## Contexto

Depende da Tarefa 6 (áudio mono 22050 Hz garantido) e da Tarefa 2 (política de cache do modelo). Entrega para a Tarefa 8. É a tarefa central do produto e a mais pesada em bytes e em tempo de execução.

## Decisões adotadas

**1. Basic Pitch (Spotify) via TensorFlow.js**
- Modelo de transcrição multi-instrumento e polifónico, publicado com licença permissiva.
- Justificação: é o único modelo de qualidade decente com exportação oficial para web, pequeno o suficiente para descarregar (poucos MB) e rápido o suficiente para correr sem GPU. Alternativas: MT3 (Google) é melhor em polifonia mas grande e não corre no browser; abordagens clássicas de deteção de frequência fundamental (YIN, pYIN) são pequenas mas só funcionam para monofonia limpa e falham com ataques e vibrato. Basic Pitch é o compromisso certo para o âmbito descrito no `README.md`.
- **Confirmar na versão instalada:** a API exata do pacote (`@spotify/basic-pitch`) e os nomes das funções de pós-processamento mudaram entre versões. Ler o `README` do pacote instalado em vez de assumir assinaturas.

**2. Backend de execução: WASM com SIMD, `webgl` como alternativa, nunca WebGPU nesta fase**
- Tenta WASM+SIMD+threads; se indisponível, WASM simples.
- Justificação: WASM é o backend mais previsível entre dispositivos e não depende do estado dos *drivers* gráficos. O backend `webgl` é por vezes mais rápido mas tem falhas de precisão e problemas conhecidos de perda de contexto em telefones — para um modelo cujo output é depois interpretado como notas, resultados inconsistentes entre dispositivos são pior do que serem uniformemente mais lentos. WebGPU fica de fora por o suporte ainda não ser suficientemente uniforme; reavaliar na Tarefa 19 com medições reais.

**3. Modelo empacotado localmente em `/public/models/basic-pitch/`**
- `model.json` mais os ficheiros de pesos, servidos da própria origem. Nada de CDN.
- Justificação: (a) é o que permite offline real, o requisito central da PWA; (b) um CDN externo introduz uma dependência de rede e de terceiros numa app que promete não falar com ninguém; (c) a política de CSP da app não abre exceções para domínios externos. Os ficheiros de modelo são a única exceção à regra "sem `fetch`" do `AGENTS.md`, e a allowlist do ESLint (Tarefa 0) é alargada aqui de forma explícita e mínima.

**4. Inferência num worker dedicado e reutilizável (`transcribe.worker.ts`)**
- Worker criado à primeira utilização, mantido vivo entre transcrições; o modelo carrega uma só vez por sessão.
- Justificação: carregar o modelo custa segundos e memória. Recriar o worker a cada transcrição faria o utilizador pagar esse custo repetidamente — inaceitável para quem grava três trechos seguidos. É a razão pela qual este worker é separado do worker de áudio (`docs/architecture.md`, decisão 4), que é descartável.

**5. Primeira utilização tem estado próprio: "a preparar"**
- Enquanto o modelo é descarregado e inicializado pela primeira vez, a `ProcessingView` mostra uma mensagem distinta, com progresso do download quando disponível.
- Justificação: o download do modelo é a espera mais longa que a app impõe, e acontece exatamente no momento em que o utilizador experimenta o produto pela primeira vez. Sem uma mensagem que explique que é só desta vez, parece que a app é assim de lento. Consequência já prevista na Tarefa 2, decisão 3.

**6. Progresso reportado por blocos processados, não estimado por tempo**
- O modelo processa o áudio em janelas; o progresso é a fração de janelas concluídas.
- Justificação: um progresso baseado em tempo estimado mente em dispositivos lentos, que é onde ele mais importa. A fração de janelas é a verdade e é monótona.

**7. Cancelamento por terminação do worker, não por *flag***
- `cancel()` chama `worker.terminate()` e marca o worker como inexistente; a próxima transcrição recria-o e recarrega o modelo.
- Justificação: a inferência TensorFlow.js é síncrona por janela e não é interrompível de dentro — uma *flag* verificada entre janelas deixaria o utilizador à espera do fim da janela atual, e as chamadas nativas não a leem. Terminar é imediato e é o que o utilizador espera de um botão de cancelar. O custo (recarregar o modelo depois) é aceitável porque cancelar é raro.

**8. Limiares do modelo como constantes nomeadas, com valores iniciais explicitamente provisórios**
- `ONSET_THRESHOLD`, `FRAME_THRESHOLD`, `MIN_NOTE_LENGTH_MS` numa constante `MODEL_THRESHOLDS`, marcada como a afinar com áudio real.
- Justificação: são os parâmetros que mais mexem na qualidade percebida do resultado — demasiado baixos geram notas a mais, demasiado altos perdem notas. Não há valor certo sem ouvir e comparar com áudio real, o que só é possível quando a pauta se desenha (Tarefa 13). Ficam nomeados e num só lugar para serem afinados de uma vez, em vez de espalhados por chamadas.

**9. Saída convertida imediatamente para o tipo do domínio**
- A saída bruta do modelo é convertida para `NoteEvent[]` (`@/lib/types.ts`) dentro do worker; nada da estrutura do TensorFlow.js atravessa a fronteira.
- Justificação: mantém o TensorFlow.js confinado a um único ficheiro. Todo o resto do pipeline (Tarefas 8 a 17) trabalha sobre um tipo próprio, o que permite testar tudo a jusante com notas escritas à mão, sem modelo e sem áudio — condição para os testes da Tarefa 20 serem rápidos e determinísticos.

**10. Tensores libertados explicitamente**
- `tf.dispose()`/`tf.tidy()` em todos os caminhos, incluindo erro.
- Justificação: TensorFlow.js não liberta memória de tensores automaticamente. Sem isto, transcrições sucessivas acumulam memória até o *tab* morrer — falha que só aparece ao terceiro ou quarto uso e que é difícil de atribuir à causa.

## Âmbito técnico

* Instalar `@spotify/basic-pitch` e `@tensorflow/tfjs` (com o backend WASM)
* Copiar os ficheiros do modelo para `/public/models/basic-pitch/` e confirmar que entram na cache dedicada da Tarefa 2
* Alargar a allowlist de `fetch` do ESLint (Tarefa 0) apenas ao módulo que carrega o modelo
* Criar `src/workers/transcribe.worker.ts`: seleção de backend (decisão 2), carregamento do modelo, inferência, progresso, conversão para `NoteEvent[]`, libertação de tensores
* Implementar `@/features/transcribe/useTranscriber()`: gestão do ciclo de vida do worker (decisão 4), `transcribe()`, `cancel()`, estados `preparing` / `running`
* Implementar o estado "a preparar" na `ProcessingView` (decisão 5)
* Definir `MODEL_THRESHOLDS` (decisão 8) com comentário a marcar como provisório
* Ligar o pipeline completo: Tarefa 4/5 → Tarefa 6 → esta tarefa → estado `result` com `NoteEvent[]`
* Tratar falhas: modelo indisponível, backend não inicializa, inferência falha, sem memória
* Verificar offline: build, carregar uma vez, desligar a rede, transcrever com sucesso
* Verificar que a segunda transcrição na mesma sessão não recarrega o modelo
* Medir e registar tempos num telefone e num portátil (entrada para a Tarefa 19)

## Guardrails para IA (atualizar `AGENTS.md`)

* "TensorFlow.js e `@spotify/basic-pitch` só podem ser importados por `src/workers/transcribe.worker.ts`; proibido importá-los na thread principal ou em qualquer outro módulo — mantê-los confinados é o que permite testar o pipeline sem modelo."
* "A saída do modelo é convertida para `NoteEvent[]` dentro do worker; nenhuma estrutura do TensorFlow.js atravessa a fronteira do worker."
* "O modelo é servido de `/public/models/` na própria origem; proibido carregar o modelo (ou qualquer peso) de um CDN ou domínio externo."
* "O worker de transcrição é reutilizado entre transcrições e o modelo carrega uma vez por sessão; proibido recriar o worker por transcrição."
* "Cancelar uma transcrição faz `worker.terminate()`; proibido implementar cancelamento por *flag* verificada entre janelas — não interrompe a inferência em curso."
* "Todo o tensor criado é libertado (`tf.tidy`/`tf.dispose`), incluindo nos caminhos de erro."
* "Limiares do modelo vivem exclusivamente na constante `MODEL_THRESHOLDS`, marcada como provisória até afinação com áudio real; proibido passar valores literais nas chamadas."
* "O backend de execução é WASM (com `webgl` como alternativa); não mudar para WebGPU sem medições documentadas na Tarefa 19."
* "A primeira transcrição de uma sessão mostra sempre o estado 'a preparar' distinto do progresso normal — o utilizador tem de perceber que a espera longa é única."

## Entregáveis

* Pipeline completo funcional: gravar ou importar → notas
* Transcrição a funcionar offline depois da primeira visita
* Modelo carregado uma vez por sessão, confirmado por medição
* Progresso monótono e verdadeiro; cancelamento imediato
* Sem crescimento de memória ao longo de cinco transcrições consecutivas
* `NoteEvent[]` produzido com tipos do domínio, sem dependências de TensorFlow.js a jusante
* Tempos medidos em telefone e portátil, registados para a Tarefa 19
* `AGENTS.md` atualizado com as regras acima

## Notas / Dependências

* Depende das Tarefas 2 e 6. Entrega para a Tarefa 8.
* Confirmar a API do pacote instalado (decisão 1) antes de escrever o código de pós-processamento da saída do modelo — assumir assinaturas de memória é a forma mais rápida de perder uma tarde aqui.
* Os ficheiros WASM do TensorFlow.js também têm de ser servidos localmente e entrar na cache, ou a app deixa de funcionar offline por uma razão que não é óbvia no código.
* A partir desta tarefa a app produz um resultado real mas ainda ilegível — notas soltas sem ritmo nem pauta. A verificação de qualidade a sério só é possível na Tarefa 13; até lá, inspecionar `NoteEvent[]` na consola contra um áudio de escala conhecida.
* Verificar o consumo de memória em iOS com particular atenção: é onde o limite por *tab* é mais apertado e onde o modelo mais facilmente falha por falta de memória.
