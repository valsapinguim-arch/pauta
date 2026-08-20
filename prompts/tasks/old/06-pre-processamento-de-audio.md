# Tarefa 6 — Pré-processamento de Áudio

## Objetivo

Converter o áudio de entrada no formato exato que o modelo exige: mono, 22050 Hz, normalizado, sem silêncio nas pontas. Tudo dentro de um Web Worker.

## Contexto

Depende das Tarefas 4 e 5 (que entregam `Float32Array` + `sampleRate` da captura). Entrega para a Tarefa 7. Esta é a tarefa que faz cumprir o contrato de 22050 Hz mono descrito em `docs/architecture.md` (decisão 5) — se falhar aqui, o modelo devolve lixo sem dar erro.

## Decisões adotadas

**1. Todo o processamento num Web Worker dedicado (`audio.worker.ts`)**

- Recebe PCM e `sampleRate`, devolve PCM processado, comunicando por `postMessage`.
- Justificação: reamostrar 60 segundos de áudio é aritmética sobre milhões de amostras. Na thread principal isso congela a interface durante o tempo em que o utilizador está a olhar para um indicador de progresso — precisamente quando a app tem de parecer viva.

**2. Buffers transferidos, não copiados**

- `postMessage` com `transfer` do `ArrayBuffer` subjacente, nos dois sentidos.
- Justificação: sem transferência, cada mensagem clona o buffer inteiro (dezenas de MB), duplicando memória e acrescentando latência. Com transferência, a posse muda de thread a custo zero. Contrapartida a respeitar: o buffer fica inutilizável do lado do emissor depois de enviado — o código tem de assumir isso explicitamente e nunca voltar a ler o buffer que enviou.

**3. Reamostragem por convolução com janela sinc (Lanczos), implementada à mão**

- Não interpolação linear, não `OfflineAudioContext`.
- Justificação: a interpolação linear introduz _aliasing_ e atenua as frequências altas, que é onde vive a informação de ataque das notas — degrada diretamente a deteção de _onsets_. O `OfflineAudioContext` faria a reamostragem nativamente, mas o algoritmo não é especificado nem consistente entre browsers, e não está disponível dentro de um worker de forma fiável; num pipeline em que o resultado tem de ser reprodutível e testável (Tarefa 20), depender de um comportamento não especificado é mau negócio. Uma sinc com janela é bem compreendida, testável contra um sinal sintético conhecido, e a diferença de custo em 60 segundos de áudio é irrelevante.

**4. Filtro passa-baixo antes de reduzir a taxa de amostragem**

- Filtro aplicado a ~10.5 kHz (abaixo da nova frequência de Nyquist, 11025 Hz) antes da decimação.
- Justificação: reduzir a taxa sem filtrar primeiro dobra as frequências acima de Nyquist para dentro da banda audível como componentes falsos. Esses componentes falsos aparecem ao modelo como notas que nunca existiram. É o erro clássico de reamostragem e é invisível a olho nu no código — só se nota como notas fantasma na pauta.

**5. Conversão para mono por média dos canais, não por seleção do primeiro**

- Justificação: em gravações estéreo é frequente um instrumento estar predominantemente num dos canais. Usar só o canal esquerdo pode perder ou atenuar muito a fonte que interessa. A média preserva tudo, ao custo de possível cancelamento de fase — que é um problema raro e menor comparado com perder metade do sinal.

**6. Normalização de pico para −1 dBFS, sem compressão nem _gating_**

- Ganho único aplicado a toda a gravação, calculado a partir do pico absoluto.
- Justificação: o modelo comporta-se melhor com o sinal a usar toda a gama dinâmica disponível, e gravações de microfone de telefone costumam ser muito baixas. Um ganho único e uniforme não altera as relações de amplitude entre notas — o que importa preservar, porque a amplitude é usada na Tarefa 8 (filtragem) e potencialmente para dinâmica no futuro. Compressão ou _gating_ alterariam essas relações e podem eliminar notas suaves.

**7. Corte de silêncio apenas nas pontas, com deslocamento registado**

- Detetam-se as fronteiras por RMS em janelas curtas; corta-se antes da primeira e depois da última região com sinal, deixando uma pequena margem. O número de amostras cortadas no início é devolvido como `trimOffsetSamples`.
- Justificação: silêncio inicial é inevitável (o utilizador carrega em gravar e só depois toca) e desloca todo o alinhamento rítmico da Tarefa 9, que passaria a colocar o primeiro tempo forte no lugar errado. O deslocamento é devolvido em vez de esquecido porque a reprodução (Tarefa 14) precisa de o somar para sincronizar o cursor com o áudio original. Nunca se corta silêncio no meio — isso são pausas, e pausas são informação musical.

**8. Ordem fixa e documentada das etapas**

- `mono → passa-baixo → reamostrar → cortar silêncio → normalizar`.
- Justificação: a ordem não é arbitrária. O filtro tem de vir antes da reamostragem (decisão 4). O corte tem de vir antes da normalização, ou o pico de uma região de ruído já descartada define o ganho de todo o sinal. Cada troca de ordem aqui produz um resultado diferente e pior, portanto a ordem faz parte do contrato.

**9. Verificação de saída antes de entregar**

- Antes de devolver, o worker verifica: um só canal, `sampleRate === 22050`, sem `NaN`/`Infinity`, pico ≤ 1.0, comprimento acima de um mínimo. Falha explícita se algo não bate.
- Justificação: é o último ponto onde um erro é detetável. Passado isto, o modelo aceita qualquer coisa e devolve notas plausíveis mas erradas — o pior modo de falha possível, porque não parece falha nenhuma.

## Âmbito técnico

- Criar `src/workers/audio.worker.ts` com o protocolo de mensagens tipado (`PreprocessRequest` / `PreprocessResult` / `PreprocessError`)
- Implementar em `@/lib/audio/` como funções puras e testáveis:
  - `toMono(channels)`
  - `lowPassFilter(samples, sampleRate, cutoffHz)`
  - `resample(samples, fromRate, toRate)` (sinc com janela)
  - `trimSilence(samples, sampleRate)` → `{ samples, trimOffsetSamples }`
  - `normalizePeak(samples, targetDbfs)`
  - `assertModelInput(samples, sampleRate)`
- Encadear pela ordem da decisão 8 dentro do worker
- Implementar transferência de buffers nos dois sentidos (decisão 2)
- Reportar progresso por etapa para a `ProcessingView` (Tarefa 3)
- Suportar cancelamento (terminar o worker e libertar memória)
- Devolver `trimOffsetSamples` e a duração final no resultado
- Testes: sinal sintético de frequência conhecida reamostrado mantém a frequência; sinal acima de Nyquist não produz componente falso após filtro+reamostragem; `trimSilence` devolve o deslocamento correto; `assertModelInput` rejeita entradas inválidas

## Guardrails para IA (atualizar `AGENTS.md`)

- "O pré-processamento de áudio corre sempre em `audio.worker.ts`; proibido reamostrar ou filtrar na thread principal."
- "A ordem das etapas é fixa: `mono → passa-baixo → reamostrar → cortar silêncio → normalizar`. Trocar a ordem altera o resultado e não é uma otimização — não reordenar."
- "Reduzir a taxa de amostragem sem aplicar antes um filtro passa-baixo abaixo da nova frequência de Nyquist é proibido: produz notas fantasma na pauta."
- "Proibido reamostrar por interpolação linear ou via `OfflineAudioContext`; a reamostragem é a implementação sinc com janela em `@/lib/audio/resample.ts`, porque o resultado tem de ser determinístico e testável."
- "Conversão para mono é sempre por média dos canais; proibido usar apenas o primeiro canal."
- "A normalização é um ganho de pico único e uniforme; proibido compressão, limitação ou _noise gating_ — alteram as relações de amplitude entre notas, que o pipeline usa a jusante."
- "Silêncio só é cortado nas pontas, nunca no interior do sinal — silêncio interior são pausas musicais. O deslocamento cortado no início é sempre devolvido como `trimOffsetSamples` e propagado até à reprodução."
- "`assertModelInput` corre sempre antes de entregar áudio ao worker de transcrição; proibido desativá-la por performance."
- "Buffers são transferidos (`transfer`) e não clonados; depois de enviar um buffer, o emissor nunca volta a lê-lo."

## Entregáveis

- Worker a converter qualquer entrada das Tarefas 4/5 em mono 22050 Hz normalizado
- Interface fluida durante todo o processamento, com progresso visível
- `trimOffsetSamples` correto e propagado no estado da sessão
- Cancelamento a libertar memória e a terminar o worker
- Testes da decisão acima a passar, incluindo o teste de ausência de componentes falsos
- `AGENTS.md` atualizado com as regras acima

## Notas / Dependências

- Depende das Tarefas 4 e 5. Entrega para a Tarefa 7.
- A decisão 4 é a mais fácil de implementar mal sem ninguém notar. O teste do sinal acima de Nyquist não é opcional — é a única forma de provar que o filtro está a fazer o seu trabalho.
- Se a reamostragem se revelar lenta em dispositivos fracos, a otimização correta é pré-calcular a tabela do núcleo sinc, não baixar a qualidade do algoritmo. Medir na Tarefa 19 antes de otimizar.
- Verificar que `assertModelInput` corre também quando o áudio já vem a 22050 Hz (caso em que a reamostragem é ignorada) — é o caminho mais fácil de esquecer.

### Registado durante a implementação

- **O PCM capturado (Tarefas 4/5) não entra no `SessionState`.** A primeira tentativa foi acrescentar um campo `audio: CapturedAudio` ao estado `processing`, para o worker o ler a partir da sessão. Descoberto um problema real ao testar: o mecanismo `?state=processing` (Tarefa 3) força esse estado com um áudio de mentira, e um `useEffect` a reagir a "sessão entrou em `processing`" dispararia um worker de verdade sobre PCM vazio — falhando quase de imediato em `assertModelInput` e transformando uma ferramenta de desenvolvimento inerte (rever uma view sem pipeline nenhum) num efeito secundário visível e errado. Resolvido entregando o PCM por chamada direta: `useRecordingFlow`/`useFilePicker` recebem agora um segundo argumento, `onAudioReady`, chamado imediatamente a seguir a `session.stopRecording()`/`startProcessing()` — nunca a partir de uma reação ao estado. Verificado com `?state=processing&stage=preprocessing`: a app fica inerte, sem worker nenhum a arrancar.
- **`toMono` já existia — era `downmixToMono` da Tarefa 5.** A conversão para mono por média dos canais (decisão 5) é matematicamente a mesma operação que a importação de ficheiro já precisava para um `AudioBuffer` estéreo caber no `Float32Array` único que o resto do pipeline espera. Em vez de duplicar, o ficheiro foi renomeado (`downmixToMono.ts` → `toMono.ts`) e passou a ser partilhado pelas Tarefas 5 e 6 — no worker, a chamada é sobre um array já com um só canal (o worklet da Tarefa 4 só lê um canal), por isso aí é normalmente um caso trivial.
- **O protocolo de mensagens do worker teve de sair de `audio.worker.ts` para um ficheiro à parte (`audio.worker.types.ts`).** `usePreprocessAudio` (compilado sob o `tsconfig.json` principal, lib `DOM`) precisa dos tipos `PreprocessRequest`/`PreprocessResponse` para falar com o worker. Um `import type` direto de `audio.worker.ts` obrigaria o TypeScript a verificar esse ficheiro — que usa `self.postMessage`/`onmessage` da lib `WebWorker` — sob a configuração errada, porque `exclude` no `tsconfig.json` só tira ficheiros da raiz da compilação, não impede o compilador de os seguir através de um import. Um ficheiro só de tipos, sem `self`/`postMessage` nenhum, é seguro sob qualquer lib e evita o conflito. Confirmado com os três `tsc --noEmit` do `pnpm typecheck` a passar sem avisos.
- **`new Worker(new URL(...))` usa caminho relativo, não o alias `@/`.** Ao contrário de imports normais (onde o alias é obrigatório, `AGENTS.md`), a deteção especial do Vite para workers funciona sobre o padrão literal `new URL('./caminho', import.meta.url)` — o mesmo aviso já registado na Tarefa 4 para o `?worker&url` dos AudioWorklets aplica-se aqui. Usado `new URL('../../workers/audio.worker.ts', import.meta.url)` a partir de `usePreprocessAudio.ts`; confirmado com `pnpm build` que aparece um `audio.worker-<hash>.js` próprio em `dist/assets/`.
- **Verificação end-to-end real, com ficheiros WAV sintéticos gerados em runtime** (a mesma técnica da Tarefa 5, incluindo aqui um com 0.4 s de silêncio inicial escrito à mão sobre o cabeçalho RIFF): um tom de 3 s a 48 000 Hz produziu exatamente 66 150 amostras a 22 050 Hz (3.0 s, confirma a reamostragem); o ficheiro com silêncio inicial cortou 7717 amostras (≈0.35 s — os 0.4 s de silêncio menos a margem de 50 ms da decisão 7, exatamente como esperado); cancelar a meio de um ficheiro de 55 s voltou a `idle` de imediato e uma importação seguinte voltou a funcionar sem estado preso. Confirmado por inspeção da consola e do `<progress>` renderizado (`value="1"` no fim) — o mesmo limite de verificação visual já registado nas Tarefas 3 e 4 aplica-se aqui (sem `computer.screenshot` nesta sessão).
- **Os testes de `resample`/`lowPassFilter` usam um DFT de um só ponto (bin), não uma FFT completa.** Suficiente para comparar "muita" vs. "pouca" energia numa frequência conhecida sem trazer uma dependência de FFT só para os testes — e é exatamente o que a Nota desta tarefa pedia como não-opcional: um teste com um sinal acima da nova Nyquist (15 000 Hz → alias esperado em 7050 Hz) que falha sem o filtro e passa com ele, provando que o filtro está mesmo a fazer o seu trabalho.
