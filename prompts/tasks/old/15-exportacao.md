# Tarefa 15 — Exportação

## Objetivo

Deixar o utilizador levar a pauta para fora da app: MusicXML, MIDI, PNG, PDF e partilha pelo sistema.

## Contexto

Depende da Tarefa 12 (`ScoreDocument`) e da Tarefa 13 (SVG renderizado, para os formatos de imagem). Como não há sincronização entre dispositivos (`docs/architecture.md`, decisão 2), a exportação é também o único mecanismo de backup que o utilizador tem.

## Decisões adotadas

**1. MusicXML é o formato principal**

- `score-partwise`, MusicXML 4.0, sem compressão (`.musicxml` e não `.mxl`).
- Justificação: é o formato universal de notação — abre no MuseScore, Sibelius, Finale, Dorico, Flat, e é editável. É o que transforma o resultado da app em algo com que se pode realmente trabalhar, em vez de uma imagem para olhar. Sem compressão porque o ganho é irrelevante nestes tamanhos e o ficheiro não comprimido é inspecionável quando algo corre mal.

**2. MusicXML gerado por construção de string, não por DOM XML**

- Serialização direta, com escape explícito dos caracteres do XML.
- Justificação: mantém o gerador uma função pura em `@/lib` (testável em Node, sem jsdom — regra do `AGENTS.md`), o que não seria possível com `XMLSerializer`. O formato que se gera é fixo e conhecido; não há necessidade de manipular uma árvore.

**3. MIDI: Standard MIDI File tipo 0, escrito à mão**

- Uma só track, 480 _ticks_ por semínima (a mesma unidade da Tarefa 10).
- Justificação: uma parte monofónica não precisa de mais do que uma track, e tipo 0 é o mais amplamente suportado. Escrever à mão em vez de instalar uma biblioteca porque o formato é simples, a unidade de tempo já coincide com a interna (o que elimina toda a conversão), e é mais uma dependência evitada num bundle já pesado.

**4. PNG a partir do SVG, via `canvas`, a 2× de resolução**

- O SVG da Tarefa 13 é serializado, desenhado num canvas ao dobro do tamanho e exportado.
- Justificação: 2× dá uma imagem nítida em ecrãs de alta densidade e para partilhar em conversas, sem os ficheiros enormes que 4× produziria. É o compromisso normal para imagem de ecrã.
- **Cuidado obrigatório:** o SVG tem de levar os estilos embutidos antes da serialização, ou a imagem sai sem cores e sem tipos de letra corretos — já anotado na Tarefa 13.

**5. PDF gerado a partir do SVG, com vetores preservados**

- Uma biblioteca leve que aceite SVG e produza PDF vetorial, em A4 retrato, com o título no topo.
- Justificação: um PDF com a pauta rasterizada fica desfocado ao imprimir, que é o principal motivo para exportar PDF. Vetorial imprime bem em qualquer tamanho. Escolher a biblioteca pelo peso e verificar que suporta mesmo SVG vetorial (não a embutir como imagem).

**6. Web Share API quando existe, download em alternativa**

- Se `navigator.canShare({ files })` for verdadeiro, partilha o ficheiro pelo sistema; caso contrário, descarrega.
- Justificação: em telefone, partilhar diretamente para uma conversa ou email é o que o utilizador quer e a pasta de downloads é um beco sem saída. Em desktop, o download é o comportamento esperado. A deteção é por capacidade e não por _user agent_.

**7. Nomes de ficheiro derivados do título, sanitizados**

- `<titulo-sanitizado>.musicxml`, etc. Caracteres inválidos substituídos, comprimento limitado, nunca vazio.
- Justificação: o título vem do nome de ficheiro importado ou é editado pelo utilizador (Tarefa 12, decisão 4) e pode conter qualquer coisa. Um nome com barras ou dois pontos falha em alguns sistemas de ficheiros de forma pouco clara.

**8. Exportação sempre a partir do `ScoreDocument`, nunca de estado intermédio**

- Todos os exportadores recebem o documento; PNG e PDF recebem além disso o SVG já renderizado.
- Justificação: é o que garante que o ficheiro exportado corresponde ao que está no ecrã, incluindo edições manuais (Tarefa 17) e correções de BPM ou tonalidade. Exportar a partir de notas quantizadas ou de `NoteEvent[]` produziria ficheiros que divergem da pauta visível — o pior tipo de bug, porque só se descobre ao abrir o ficheiro noutro programa.

**9. MusicXML valida por abertura real, não por schema**

- Verificação: abrir os ficheiros exportados no MuseScore e confirmar que a pauta é igual à do ecrã.
- Justificação: validar contra o XSD prova que o XML é bem formado, não que a música está certa — um MusicXML válido pode ter as notas na oitava errada. O teste que importa é o programa de destino mostrar o que se espera. Faz parte dos entregáveis desta tarefa, não é verificação opcional.

## Âmbito técnico

- Implementar em `@/lib/export/` como funções puras:
  - `toMusicXml(scoreDocument)` → string
  - `toMidi(scoreDocument)` → `Uint8Array`
  - `sanitizeFilename(title)`
  - `escapeXml(text)`
- Implementar em `@/features/export/` (precisam do DOM):
  - `svgToPng(svgElement, scale)` — embute estilos antes de serializar (decisão 4)
  - `svgToPdf(svgElement, metadata)`
  - `shareOrDownload(blob, filename, mimeType)` (decisão 6)
- Incluir no MusicXML: `part-list`, `divisions`, clave, armação, indicação de compasso, andamento (`sound tempo`), notas com `step`/`alter`/`octave`/`type`/`dot`, pausas, ligaduras (`tie` e `tied`), acidentes, título e `encoding-date`
- Incluir no MIDI: `set tempo`, `time signature`, `key signature`, eventos `note on`/`note off`, `end of track`
- Adicionar as ações de exportação à `ResultView` (preenchendo o _slot_ da Tarefa 3)
- Mostrar progresso/`Spinner` durante a geração de PDF e PNG
- Testes:
  - `toMusicXml` produz XML bem formado (parse de verificação no teste)
  - uma melodia conhecida gera as `step`/`alter`/`octave` corretas
  - ligaduras geram `tie` e `tied` emparelhados
  - `toMidi` produz cabeçalho válido e o número esperado de eventos
  - MIDI de dó central contém a nota 60
  - `sanitizeFilename` trata barras, dois pontos, emoji, string vazia e nomes muito longos
  - `escapeXml` trata `&`, `<`, `>`, `"`, `'`
- Verificação manual: abrir o MusicXML no MuseScore e o MIDI num reprodutor, comparar com o ecrã (decisão 9)

## Guardrails para IA (atualizar `AGENTS.md`)

- "Todos os exportadores consomem exclusivamente o `ScoreDocument` (mais o SVG renderizado, no caso de PNG e PDF); proibido exportar a partir de `NoteEvent[]`, `QuantizedNote[]` ou de qualquer estado intermédio — o ficheiro exportado tem de corresponder sempre ao que está no ecrã."
- "MusicXML e MIDI são gerados por funções puras em `@/lib/export`; proibido usar `XMLSerializer`, `DOMParser` ou qualquer API do DOM nesses geradores."
- "Todo o texto inserido no MusicXML passa por `escapeXml`; todo o nome de ficheiro passa por `sanitizeFilename`."
- "O SVG leva os estilos embutidos antes de ser serializado para PNG ou PDF; sem isso a imagem sai sem cores nem tipos de letra."
- "O PDF preserva vetores; proibido embutir a pauta como imagem rasterizada."
- "A partilha é decidida por deteção de capacidade (`navigator.canShare`), nunca por _user agent_, com download como alternativa."
- "O MIDI usa 480 _ticks_ por semínima, a mesma unidade interna da quantização — não converter unidades de tempo na exportação."
- "Não instalar bibliotecas para gerar MusicXML ou MIDI; ambos os formatos são escritos à mão neste projeto."
- "Alterações aos exportadores exigem reverificação manual num programa de notação externo — XML bem formado não prova que a música está correta."

## Entregáveis

- Os cinco formatos a exportar corretamente
- MusicXML a abrir no MuseScore com a pauta igual à do ecrã, incluindo armação, ligaduras e andamento
- MIDI a tocar as notas certas nas oitavas certas
- PNG nítido, PDF vetorial e imprimível
- Partilha nativa a funcionar em telefone, download em desktop
- Nomes de ficheiro sempre válidos
- Todos os testes da decisão acima a passar
- `AGENTS.md` atualizado com as regras acima

## Notas / Dependências

- Depende das Tarefas 12 e 13.
- O erro mais provável é de oitava: MIDI 60 é dó central e escreve-se `<octave>4</octave>` em MusicXML. Confirmar num programa externo, porque dentro da app a convenção pode estar consistentemente errada e parecer certa.
- `divisions` no MusicXML deve corresponder aos 480 _ticks_ por semínima usados internamente — mantê-los iguais elimina uma classe inteira de erros de arredondamento.
- Como a exportação é o único backup do utilizador (não há sincronização), vale a pena que as ações estejam visíveis na `ResultView` e não escondidas atrás de um menu.
- Verificar a exportação depois de uma edição manual (Tarefa 17) e depois de uma correção de BPM — são os caminhos onde a decisão 8 é mais fácil de violar sem notar.
