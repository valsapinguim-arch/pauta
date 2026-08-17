# Tarefa 12 — Modelo de Notação

## Objetivo

Montar o `ScoreDocument`: a estrutura única que representa a partitura na aplicação, consumida pelo renderizador, pelo reprodutor, pelos exportadores e pelo editor.

## Contexto

Depende das Tarefas 10 (`QuantizedNote[]`) e 11 (`KeyAnalysis`). Entrega `ScoreDocument` para as Tarefas 13 a 17. É a última etapa do pipeline em `@/lib` e a fronteira a partir da qual ninguém volta a olhar para áudio ou para notas do modelo.

## Decisões adotadas

**1. `ScoreDocument` é a única representação da partitura**
- Já declarado em `docs/architecture.md` (decisão 3); esta tarefa é onde se cumpre.
- Justificação: com um modelo separado para desenhar e outro para exportar, o PDF e o MusicXML acabam a divergir da pauta no ecrã, e a edição manual (Tarefa 17) passa a ter de escrever em dois sítios. Um documento só significa que corrigir a notação corrige tudo de uma vez.

**2. Estrutura hierárquica explícita, não uma lista plana**
```
ScoreDocument
  metadata { title, createdAt, sourceName, durationSec, confidence }
  tempo    { bpm, timeSignature, source }
  key      { tonic, mode, sharpsOrFlats, source }
  clef     'treble' | 'bass'
  measures[]
    number
    elements[]  → Note | Rest
      Note { step, alter, octave, pitchMidi, noteType, dots, tie, accidental, sourceIndex }
      Rest { noteType, dots }
```
- Justificação: tanto o VexFlow como o MusicXML são organizados por compasso. Uma lista plana de notas obrigaria os dois consumidores a reconstruir os compassos, cada um com o seu bug. A hierarquia também torna a validação (decisão 6) local e barata.

**3. Clave escolhida pela tessitura, uma só para toda a peça**
- Média das alturas abaixo de dó central (MIDI 60) → clave de fá; acima → clave de sol.
- Justificação: uma pauta com notas todas abaixo do pentagrama em clave de sol é ilegível. Escolher pela média é simples e acerta na quase totalidade dos casos. Uma só clave (sem mudanças a meio) porque mudar de clave exige decidir onde, e uma mudança no sítio errado é mais confusa do que algumas linhas suplementares.
- **Consequência aceite:** melodias com tessitura muito larga vão ter linhas suplementares em excesso num dos extremos. É legível, apenas não é elegante.

**4. Título gerado, editável, nunca vazio**
- Por omissão: nome do ficheiro importado (sem extensão) ou "Gravação" com data para o microfone.
- Justificação: o título aparece na pauta, no PDF exportado, no nome do ficheiro e na biblioteca (Tarefa 16). Um documento sem título produz ficheiros chamados `undefined.musicxml` e entradas indistinguíveis na lista.

**5. Confiança agregada das três fontes, guardada no documento**
- Combina a confiança das notas (Tarefa 8), do tempo (Tarefa 9) e da tonalidade (Tarefa 11) num valor e mantém os três detalhados.
- Justificação: o agregado serve para decidir mostrar o aviso na `ResultView`; os detalhes servem para dizer **o que** está fraco, que é o que permite ao utilizador agir — corrigir o BPM é uma ação diferente de corrigir a tonalidade.

**6. Validação estrutural na construção, com falha explícita**
- `buildScoreDocument` valida: cada compasso soma `measureTicks`; ligaduras emparelham (`tie: 'start'` tem sempre um `'stop'` correspondente); alturas dentro de uma gama plausível; `noteType` dentro do conjunto permitido. Falha com erro nomeado se algo não bater.
- Justificação: é o último ponto onde uma incoerência é detetável em código. Passado isto, o VexFlow desenha algo estranho e o MusicXML gera um ficheiro que outro programa recusa — falhas que aparecem longe da causa. Falhar aqui, com mensagem clara, poupa horas.

**7. Documento imutável; edições produzem um novo documento**
- Todas as funções de modificação (Tarefa 17) recebem e devolvem `ScoreDocument`, sem mutar.
- Justificação: é o que torna desfazer/refazer (Tarefa 17) trivial — guarda-se a pilha de documentos. Com mutação, seria preciso implementar diffs ou snapshots à mão. Para documentos desta dimensão (um trecho de 60 s), o custo de copiar é irrelevante.

**8. Versão do formato no documento**
- `schemaVersion: 1` em `metadata`.
- Justificação: os documentos são persistidos em IndexedDB (Tarefa 16). Sem versão, a primeira alteração à estrutura torna ilegíveis as transcrições que o utilizador já tinha guardadas, sem forma de migrar nem de detetar o problema.

**9. Sem dinâmica, articulação, letra ou múltiplas partes**
- Nenhum destes campos existe no modelo nesta fase.
- Justificação: nada no pipeline os produz — inventá-los no modelo seria criar campos que nenhum código preenche e que os exportadores teriam de tratar como sempre vazios. Acrescentam-se quando houver quem os produza (a deteção de dinâmica está listada como melhoria futura).

## Âmbito técnico

* Definir `ScoreDocument` e os tipos auxiliares em `@/lib/types.ts` conforme decisão 2
* Implementar em `@/lib/notation/`:
  * `chooseClef(notes)` (decisão 3)
  * `groupIntoMeasures(notes, measureTicks)`
  * `toNotationElements(quantizedNotes, keyAnalysis)` — usa `spellPitch`/`applyAccidentals` da Tarefa 11
  * `defaultTitle(source)` (decisão 4)
  * `aggregateConfidence(noteConf, tempoConf, keyConf)`
  * `validateScoreDocument(doc)` (decisão 6)
  * `buildScoreDocument({ quantizedNotes, tempoMap, keyAnalysis, metadata })` — encadeia e valida
* Definir `SCHEMA_VERSION = 1`
* Ligar ao estado da sessão: `result` passa a carregar o `ScoreDocument`
* Implementar edição do título na `ResultView`
* Testes:
  * documento construído a partir de uma melodia simples tem o número de compassos esperado
  * melodia grave escolhe clave de fá; aguda, clave de sol
  * ligadura sem par faz `validateScoreDocument` falhar
  * compasso com soma errada faz `validateScoreDocument` falhar
  * `buildScoreDocument` é determinístico: a mesma entrada dá exatamente o mesmo documento
  * documento devolvido é congelado / não é mutado por nenhuma função de leitura

## Guardrails para IA (atualizar `AGENTS.md`)

* "`ScoreDocument` é a única representação da partitura na app. Renderizador, reprodutor, exportadores e editor consomem este documento — proibido criar uma estrutura paralela 'para desenhar' ou 'para exportar', e proibido a jusante desta tarefa voltar a ler `NoteEvent[]` ou `QuantizedNote[]`."
* "`ScoreDocument` é imutável: funções de edição recebem e devolvem um documento novo, nunca mutam o recebido."
* "`buildScoreDocument` valida sempre a estrutura e falha com erro nomeado; proibido devolver um documento inválido ou desativar a validação por performance."
* "Cada compasso do documento soma exactamente `measureTicks` e cada `tie: 'start'` tem o seu `'stop'` — invariantes verificadas na construção."
* "`metadata.schemaVersion` é obrigatório e incrementa-se em qualquer alteração à estrutura de `ScoreDocument`, com migração correspondente na Tarefa 16."
* "Uma só clave e uma só tonalidade por documento; não introduzir mudanças de clave ou de armação a meio sem atualizar `docs/architecture.md` e todos os consumidores."
* "Não acrescentar campos ao modelo (dinâmica, articulação, letra, múltiplas partes) sem existir código no pipeline que os preencha."
* "`metadata.title` nunca é vazio nem `undefined`."

## Entregáveis

* `ScoreDocument` construído a partir do pipeline completo, do áudio à estrutura
* Validação ativa e a falhar nos casos previstos
* Clave escolhida corretamente por tessitura
* Título por omissão sensato e editável
* Confiança agregada e detalhada disponível na `ResultView`
* Todos os testes da decisão acima a passar
* `AGENTS.md` atualizado com as regras acima

## Notas / Dependências

* Depende das Tarefas 10 e 11. Entrega para as Tarefas 13 a 17.
* O teste de determinismo (decisão da lista de testes) é mais valioso do que parece: garante que nada no pipeline depende de `Date.now()`, de iteração sobre objetos ou de aleatoriedade — o que é condição para os testes de fixtures da Tarefa 20 funcionarem.
* Manter `sourceIndex` nas notas do documento: é o que liga a pauta ao áudio original e serve à reprodução (Tarefa 14) e à edição (Tarefa 17).
* Esta tarefa fecha o pipeline. A partir daqui, todas as tarefas consomem `ScoreDocument` — se alguma sentir necessidade de voltar atrás para as notas cruas, é sinal de que falta um campo no documento, não de que se deve abrir uma exceção.
