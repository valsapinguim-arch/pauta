A seguinte lista de passos permite a criação de uma PWA que ouve música — do microfone ou de um ficheiro de áudio — e a converte numa pauta (notação musical) que o utilizador pode ver, ouvir e exportar.

O interface é deliberadamente muito simples: um ecrã, um botão grande para gravar (ou largar um ficheiro), e o resultado. Sem menus, sem configuração obrigatória, sem registo.

Toda a transcrição corre **no dispositivo do utilizador**, dentro do browser: o áudio nunca sai do telefone/computador. Isto não é só uma decisão de privacidade — é o que torna a app viável a custo praticamente zero e funcional offline, sem servidor de inferência.

O resultado esperado é uma **melodia numa pauta** — uma linha, um instrumento. A app deve ser honesta sobre este limite: gravações de bandas completas, com bateria e vários instrumentos ao mesmo tempo, produzem resultados maus e o utilizador tem de ser avisado disso antes de gravar, não depois.

Stack: React + TypeScript (Vite), Basic Pitch (TensorFlow.js) para áudio→notas, VexFlow para desenhar a pauta, IndexedDB para guardar localmente. Sem backend.

---

# 0. Preparação do projeto

## Arquitetura

- Definir arquitetura da solução (local-first, sem backend)
- Definir estrutura de pastas
- Definir convenções de código
- Configurar ESLint
- Configurar Prettier
- Configurar Husky
- Configurar lint-staged
- Configurar commitlint
- Configurar Git ignore
- Definir estratégia de branches
- Criar README
- Criar documentação da arquitetura
- Criar AGENTS.md inicial

---

# 1. Scaffold React

- Criar projeto Vite + React + TypeScript
- Configurar paths / alias
- Configurar estrutura por features
- Configurar tokens de estilo
- Configurar error boundary
- Configurar estado da aplicação (máquina de estados do ecrã único)
- Configurar Vitest

---

# 2. PWA

- Configurar `vite-plugin-pwa` (Workbox)
- Criar manifest (nome, ícones, tema, orientação, display)
- Criar ícones (todos os tamanhos + maskable)
- Configurar service worker e estratégias de cache
- Garantir funcionamento offline completo
- Implementar prompt de instalação
- Implementar fluxo de atualização de versão
- Configurar splash screen / iOS meta tags

---

# 3. Interface mínima

Criar apenas o necessário:

- Tokens (cor, espaçamento, tipografia)
- Button
- IconButton
- Sheet (contentor de conteúdo)
- Progress
- Alert
- Spinner
- Toast

Criar o ecrã único com os seus estados:

- Inativo (botão gravar + largar ficheiro)
- A gravar (nível de áudio + tempo)
- A processar (progresso)
- Resultado (pauta + ações)
- Erro

---

# 4. Captura de microfone

- Pedir permissão de microfone (com explicação prévia)
- Capturar via Web Audio API
- Mostrar nível de áudio em tempo real
- Mostrar tempo decorrido
- Limitar duração máxima
- Parar / cancelar
- Tratar permissão negada, microfone ocupado, sem microfone

---

# 5. Importação de ficheiro

- Selecionar ficheiro (input + drag & drop)
- Validar formato
- Validar tamanho
- Validar duração
- Descodificar para PCM
- Tratar ficheiros corrompidos ou não suportados

---

# 6. Pré-processamento de áudio

Num Web Worker:

- Converter para mono
- Reamostrar para 22050 Hz
- Normalizar amplitude
- Cortar silêncio inicial e final
- Devolver `Float32Array` pronto para o modelo

---

# 7. Motor de transcrição

- Integrar Basic Pitch (TensorFlow.js)
- Empacotar o modelo localmente (offline)
- Correr inferência num Web Worker
- Reportar progresso
- Converter saída do modelo em eventos de nota
- Permitir cancelamento
- Tratar falha de inferência

Saída: lista de notas com `pitchMidi`, `startTime`, `duration`, `amplitude`.

---

# 8. Pós-processamento de notas

- Filtrar notas por amplitude mínima
- Filtrar notas por duração mínima
- Resolver sobreposições
- Reduzir a uma única voz (melodia)
- Remover artefactos de harmónicos
- Calcular métrica de confiança

---

# 9. Deteção de tempo

- Extrair _inter-onset intervals_
- Estimar BPM
- Detetar o primeiro tempo forte
- Assumir compasso (4/4 por omissão)
- Construir grelha de tempos e compassos
- Permitir correção manual do BPM

---

# 10. Quantização rítmica

- Alinhar inícios à grelha
- Alinhar durações a figuras (semibreve … semicorchea, com ponto)
- Inserir pausas
- Ligar notas que atravessam a barra de compasso
- Evitar figuras impossíveis de notar

---

# 11. Tonalidade e grafia de notas

- Construir histograma de classes de altura
- Detetar tonalidade
- Escolher armação de clave
- Decidir sustenidos vs bemóis
- Calcular acidentes de cada nota
- Permitir correção manual da tonalidade

---

# 12. Modelo de notação

Criar o modelo interno da partitura:

- Documento
- Compassos
- Notas e pausas
- Clave (escolhida pela tessitura)
- Armação de clave
- Indicação de compasso
- Andamento
- Ligaduras

---

# 13. Renderização da pauta

- Integrar VexFlow
- Desenhar compassos e sistemas
- Quebrar linhas conforme a largura do ecrã
- Zoom
- Scroll
- Estado vazio
- Desempenho em partituras longas

---

# 14. Reprodução

- Sintetizar a pauta via Web Audio
- Play / pause / parar
- Cursor sincronizado com a nota em execução
- Controlar velocidade
- Metrónomo opcional

---

# 15. Exportação

- MusicXML
- MIDI
- PNG
- PDF
- Partilha (Web Share API)
- Nome de ficheiro previsível

---

# 16. Biblioteca local

- Guardar transcrições em IndexedDB
- Listar
- Abrir
- Renomear
- Eliminar
- Gerir quota de armazenamento

---

# 17. Edição manual mínima

- Selecionar nota
- Alterar altura
- Alterar duração
- Eliminar nota
- Transpor a partitura
- Desfazer / refazer

---

# 18. Acessibilidade e idioma

- Navegação por teclado
- Leitores de ecrã
- Contraste
- Alvos de toque
- Modo escuro
- Textos em pt-PT centralizados
- Redução de movimento

---

# 19. Desempenho e limites

- Processar áudio longo por blocos
- Limitar memória
- Adaptar ao dispositivo
- Manter a interface fluida durante a inferência
- Medir e afixar limites reais

---

# 20. Testes

- Testes unitários (quantização, tonalidade, notação, exportação)
- Testes de componentes
- Testes de fixtures de áudio conhecido
- Testes end-to-end
- Testes de PWA / offline

---

# 21. Erros e telemetria

- Error boundary
- Mensagens de erro úteis
- Registo local de erros
- Telemetria opcional (opt-in, anónima, desligada por omissão)
- Ecrã de diagnóstico

---

# 22. Build e distribuição

- Build de produção
- Orçamento de tamanho do bundle
- Alojamento estático
- Versionamento
- Fluxo de atualização do service worker

---

## Melhorias arquiteturais recomendadas

Posteriormente, poderão ser acrescentados alguns requisitos:

- **Transcrição polifónica a sério** (acordes, várias vozes, separação de instrumentos), provavelmente com um modelo maior a correr no servidor — mudança de arquitetura, não uma melhoria incremental.
- **Separação de fontes** (isolar a voz ou um instrumento antes de transcrever), o que melhoraria muito o resultado em gravações de bandas.
- **Deteção de compasso** em vez de assumir 4/4.
- **Quinálteras e ritmos compostos** (6/8, tercinas), fora de âmbito na quantização inicial.
- **Reconhecimento do instrumento** para escolher clave, tessitura e transposição adequadas.
- **Conta de utilizador e sincronização** entre dispositivos — obrigaria a backend e a rever a promessa de que o áudio nunca sai do dispositivo.
- **Modelo mais recente** (ex.: modelos de transcrição mais fortes exportados para ONNX/WebGPU) mantendo a inferência no cliente.
- **Deteção de dinâmica e articulação** (forte/piano, ligados, acentos) a partir da amplitude e do envelope.
