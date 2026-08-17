# Arquitetura

## Visão geral

`pauta` é uma **aplicação estática local-first**. Não há servidor de aplicação, não há base de dados remota, não há API. Todo o trabalho — captura, descodificação, inferência do modelo, quantização, notação, exportação — acontece dentro do browser do utilizador.

```
┌──────────────────────────────────────────────────────────────┐
│  Browser (único ambiente de execução)                        │
│                                                              │
│  Thread principal (UI)                                       │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  React — ecrã único, máquina de estados                │  │
│  │  idle → recording → processing → result │ error        │  │
│  └────────────────────────────────────────────────────────┘  │
│         │ captura (Web Audio)          ▲ ScoreDocument       │
│         ▼                              │                     │
│  ┌──────────────────┐          ┌───────────────────────────┐ │
│  │ Worker: audio    │  Float32 │ lib (puro, sem I/O)       │ │
│  │ mono, 22050 Hz,  │─────────▶│ notas → tempo → quantiza  │ │
│  │ normalizar, trim │          │ → tonalidade → notação    │ │
│  └──────────────────┘          └───────────────────────────┘ │
│         │                              ▲                     │
│         ▼                              │ NoteEvent[]         │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ Worker: transcribe — Basic Pitch (TensorFlow.js/WASM)  │  │
│  │ modelo servido de /public/models (offline)             │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  IndexedDB — transcrições guardadas   Cache API — app + modelo│
└──────────────────────────────────────────────────────────────┘
```

## Decisões estruturantes

### 1. Inferência no cliente, não no servidor

O modelo de transcrição (Basic Pitch) corre em TensorFlow.js dentro de um Web Worker. Alternativa rejeitada: backend Python com o modelo original.

**Porquê:** um backend de inferência introduz custo por utilização (CPU ou GPU), obriga a fazer upload do áudio de cada pessoa, e mata a possibilidade de funcionar offline. Basic Pitch é pequeno o suficiente (poucos MB) para ser descarregado uma vez e ficar em cache.

**Custo desta decisão:** o tempo de transcrição depende do dispositivo. Num telefone antigo, um trecho de 30 segundos pode levar bastante mais do que num portátil recente. A Tarefa 19 trata de medir e comunicar isto.

**Quando reconsiderar:** se o produto passar a precisar de transcrição polifónica real (bandas, acordes, várias vozes), o modelo necessário deixa de caber no browser e esta decisão tem de ser revista de raiz — incluindo a promessa de que o áudio nunca sai do dispositivo.

### 2. Sem backend, portanto sem contas

Não havendo servidor, não há autenticação, não há sincronização entre dispositivos e não há partilha por link. As transcrições vivem em IndexedDB, no dispositivo onde foram criadas. A partilha faz-se exportando um ficheiro (MusicXML/MIDI/PDF) através da Web Share API ou download.

**Consequência a assumir:** se o utilizador limpar os dados do browser, perde a biblioteca. A Tarefa 16 tem de avisar disto e a exportação é o mecanismo de backup.

### 3. O pipeline é uma cadeia de funções puras

Da saída do modelo até ao MusicXML, cada etapa é uma função pura em `/src/lib`:

```
NoteEvent[] → TempoMap → QuantizedNote[] → KeyAnalysis → ScoreDocument → MusicXML | MIDI | VexFlow
```

Nenhuma destas funções toca no DOM, no Web Audio, no IndexedDB ou em `fetch`. É isto que as torna testáveis sem browser e sem áudio real, e é a razão pela qual a Tarefa 20 consegue ter testes verdadeiramente unitários.

`ScoreDocument` é a **única** representação da partitura na aplicação. O renderizador (VexFlow), o reprodutor, os exportadores e o editor manual consomem todos o mesmo documento. Não existe um modelo paralelo "para desenhar" e outro "para exportar".

### 4. Dois workers, fronteiras explícitas

- **Worker de áudio** — descodificação, conversão para mono, reamostragem para 22050 Hz, normalização, corte de silêncio.
- **Worker de transcrição** — carrega o modelo e corre a inferência.

Estão separados porque têm ciclos de vida diferentes: o de áudio é barato e descartável, o de transcrição carrega dezenas de MB de modelo e deve ser reutilizado entre transcrições. Nenhum trabalho pesado corre na thread principal — a interface tem de continuar a responder (e a mostrar progresso) durante a inferência.

### 5. 22050 Hz mono é um contrato, não uma preferência

Basic Pitch foi treinado a 22050 Hz mono. Qualquer áudio que entre no worker de transcrição com outra taxa de amostragem ou mais do que um canal produz resultados silenciosamente errados — não um erro, o que é pior. A conversão é obrigatória e verificada.

### 6. Uma voz, uma pauta

O pós-processamento reduz a saída do modelo a uma **única linha melódica**. Basic Pitch devolve notas potencialmente simultâneas, mas notar polifonia corretamente (vozes, hastes, acordes) é um problema muito maior do que a app resolve nesta fase, e um resultado polifónico mal notado é pior do que uma melodia limpa.

### 7. PWA offline-first

O service worker faz _precache_ de toda a shell da aplicação e do modelo. Depois da primeira visita, a app arranca e transcreve sem rede. Atualizações são explícitas: o utilizador é notificado e escolhe recarregar — nunca se troca a versão a meio de uma transcrição.

## Limites conhecidos

| Limite                               | Razão                              | Tarefa que trata |
| ------------------------------------ | ---------------------------------- | ---------------- |
| Só melodia monofónica                | Decisão 6                          | 8                |
| Compasso assumido 4/4                | Deteção de compasso fora de âmbito | 9                |
| Sem quinálteras/tercinas             | Grelha de quantização binária      | 10               |
| Duração máxima de áudio limitada     | Memória do dispositivo             | 19               |
| Sem sincronização entre dispositivos | Decisão 2                          | 16               |
| Desempenho variável por dispositivo  | Decisão 1                          | 19               |

## Fluxo de dados completo

1. **Entrada** — microfone (Tarefa 4) ou ficheiro (Tarefa 5).
2. **Descodificação e normalização** (Tarefa 6, worker de áudio) → `Float32Array` mono @ 22050 Hz.
3. **Inferência** (Tarefa 7, worker de transcrição) → `NoteEvent[]` com altura MIDI, início, duração e amplitude.
4. **Limpeza** (Tarefa 8) → uma voz, sem artefactos, com confiança calculada.
5. **Tempo** (Tarefa 9) → BPM, primeiro tempo forte, grelha métrica.
6. **Quantização** (Tarefa 10) → figuras rítmicas notáveis, pausas, ligaduras.
7. **Tonalidade** (Tarefa 11) → armação de clave e grafia de cada nota.
8. **Notação** (Tarefa 12) → `ScoreDocument`.
9. **Saída** — desenho (Tarefa 13), reprodução (Tarefa 14), exportação (Tarefa 15), persistência (Tarefa 16), edição (Tarefa 17).
