# Tarefa 5 — Importação de Ficheiro

## Objetivo

Permitir transcrever um ficheiro de áudio já existente: seleção, drag & drop, validação e descodificação para PCM. É o segundo (e último) ponto de entrada de áudio na app.

## Contexto

Depende da Tarefa 3 (*slot* `onPickFile` e zona de *drop*) e da Tarefa 1 (máquina de estados). Entrega, tal como a Tarefa 4, um `Float32Array` + `sampleRate` para a Tarefa 6 — as duas entradas convergem no mesmo formato.

## Decisões adotadas

**1. Descodificação com `AudioContext.decodeAudioData`, não com uma biblioteca**
- O ficheiro é lido como `ArrayBuffer` e descodificado pelo browser.
- Justificação: o browser já tem descodificadores nativos para todos os formatos que interessam, otimizados e sem custo de bundle. Trazer `ffmpeg.wasm` acrescentaria dezenas de MB ao download para suportar formatos que quase ninguém vai usar — num projeto onde o orçamento de bytes já está comprometido com o modelo de ML.
- **Consequência a assumir:** o conjunto de formatos suportados varia com o browser (notoriamente, suporte a FLAC e a variantes de M4A não é uniforme). Trata-se como erro de formato não suportado (decisão 5), não como bug.

**2. `decodeAudioData` corre na thread principal, deliberadamente**
- Justificação: é uma API que só existe no contexto de janela e não está disponível dentro de um worker padrão. Como devolve uma promessa e a descodificação em si é nativa, não bloqueia a UI de forma perceptível para ficheiros dentro dos limites da decisão 4. O trabalho pesado que **tem** de ir para worker é a reamostragem e a inferência (Tarefas 6 e 7).

**3. Formatos aceites: por tentativa de descodificação, não por extensão**
- O input aceita `audio/*`; a validação real é o `decodeAudioData` conseguir ou não.
- Justificação: validar por extensão dá dois falsos resultados — rejeita ficheiros válidos com extensão invulgar e aceita ficheiros corrompidos com a extensão certa. A única pergunta que interessa é "o browser consegue descodificar isto?", e a forma de saber é tentar. A extensão serve apenas para a sugestão inicial no seletor de ficheiros.

**4. Limites: 30 MB e 60 segundos**
- Tamanho verificado antes de ler; duração verificada depois de descodificar. Se exceder a duração, oferece-se usar os primeiros 60 segundos em vez de rejeitar.
- Justificação: o limite de duração é o mesmo da gravação (Tarefa 4, decisão 3) e pela mesma razão — tempo de inferência e memória. O limite de tamanho é uma barreira anterior e mais barata, que evita ler um ficheiro de 300 MB para memória só para descobrir que é longo demais. Truncar em vez de rejeitar porque quem larga uma música inteira quer quase sempre transcrever o início, e forçá-lo a cortar o ficheiro noutra app para depois voltar é fricção desnecessária.

**5. Erros nomeados, alinhados com a Tarefa 4**
- `file-too-large`, `unsupported-format`, `decode-failed`, `no-audio-track`, `too-quiet`, `too-long` (informativo, com truncagem).
- Justificação: mesma lógica da Tarefa 4, decisão 9 — cada erro corresponde a uma ação diferente. `too-quiet` é reutilizado tal e qual: um ficheiro em silêncio produziria uma pauta vazia e a app deve dizer porquê.

**6. Drag & drop apenas onde existe, com deteção por capacidade**
- Zona de *drop* renderizada só quando há um dispositivo apontador fino (`@media (pointer: fine)`); o botão de seleção está sempre presente.
- Justificação: uma zona a dizer "arraste um ficheiro para aqui" num telefone é instrução impossível de cumprir. O botão cobre os dois casos, e a zona acrescenta-se onde o gesto existe (já decidido na Tarefa 3, decisão 5).

**7. O ficheiro original é descartado depois de descodificado**
- Guarda-se apenas o PCM e o nome do ficheiro (para nomear a exportação, Tarefa 15). O `File`/`ArrayBuffer` original é libertado.
- Justificação: manter o ficheiro comprimido em memória a par do PCM descodificado duplica o consumo sem utilidade — nada no pipeline volta a ler o original. Também é coerente com a promessa de privacidade: não se retém o ficheiro do utilizador mais tempo do que o necessário.

**8. Sem extração de áudio de vídeo**
- `.mp4`/`.mov` não são oferecidos como entrada, mesmo quando o browser os consegue descodificar.
- Justificação: um vídeo é quase sempre uma cena com várias fontes sonoras — exatamente o caso em que a transcrição falha (ver `README.md`). Aceitá-lo convidaria ao pior resultado possível. Fica de fora até haver separação de fontes (ver "Melhorias" no `base.md`).

## Âmbito técnico

* Implementar `@/features/capture/useFilePicker()`: `pickFile()`, `handleDrop(event)`, expõe `error` e estado de descodificação
* `<input type="file" accept="audio/*">` escondido, acionado pelo botão da Tarefa 3
* Implementar a zona de *drop* com deteção da decisão 6, incluindo estado visual de "a largar aqui"
* Validar tamanho antes de ler (decisão 4)
* Descodificar com `decodeAudioData`, tratando a rejeição como `unsupported-format`/`decode-failed`
* Verificar duração e implementar a truncagem com confirmação (decisão 4)
* Verificar RMS e devolver `too-quiet` se aplicável (decisão 5)
* Libertar referências ao ficheiro original (decisão 7)
* Guardar o nome do ficheiro no estado da sessão para uso na Tarefa 15
* Transitar para `processing` com `Float32Array` + `sampleRate`, no mesmo formato da Tarefa 4
* Mapear todos os erros para `@/strings/errors.ts`
* Testar com WAV, MP3, M4A, OGG, um ficheiro corrompido, um ficheiro de texto renomeado para `.mp3`, um ficheiro longo e um ficheiro em silêncio

## Guardrails para IA (atualizar `AGENTS.md`)

* "A descodificação de áudio usa exclusivamente `AudioContext.decodeAudioData`; proibido introduzir `ffmpeg.wasm` ou qualquer descodificador em JavaScript — o custo de bundle não é justificável neste projeto."
* "Formatos são validados por tentativa de descodificação, nunca por extensão ou MIME type; a extensão só serve para o filtro do seletor de ficheiros."
* "Ficheiros de vídeo não são aceites como entrada, mesmo que o browser os descodifique."
* "As Tarefas 4 e 5 convergem no mesmo formato de saída (`Float32Array` + `sampleRate`); proibido que o resto do pipeline saiba se o áudio veio do microfone ou de um ficheiro."
* "O `File` e o `ArrayBuffer` originais são libertados imediatamente após a descodificação; apenas o PCM e o nome do ficheiro sobrevivem."
* "Áudio que exceda a duração máxima é truncado com confirmação do utilizador, nunca rejeitado silenciosamente nem processado por inteiro."
* "Erros de importação são estados nomeados partilhando o vocabulário da Tarefa 4; `too-quiet` é o mesmo erro nos dois caminhos de entrada."

## Entregáveis

* Importação funcional por botão em telefone e desktop, e por drag & drop em desktop
* Ficheiros WAV, MP3, M4A e OGG a descodificar corretamente
* Ficheiro corrompido, formato não suportado e ficheiro em silêncio a dar mensagens distintas e úteis
* Ficheiro longo a oferecer truncagem em vez de falhar
* Saída idêntica em forma à da Tarefa 4
* `AGENTS.md` atualizado com as regras acima

## Notas / Dependências

* Depende das Tarefas 1 e 3. Entrega para a Tarefa 6.
* Confirmar que a promessa de `decodeAudioData` rejeita mesmo (e não fica pendente) com entrada inválida em Safari — historicamente é o browser com o comportamento menos previsível nesta API.
* O nome do ficheiro é a única informação do original que se retém, e é usado na Tarefa 15 para nomear a exportação. Sanitizá-lo antes de o usar como nome de ficheiro de saída.
* Não confundir "o browser descodificou" com "isto é transcrevível": um MP3 de uma música de rádio descodifica perfeitamente e vai dar uma pauta má. O aviso da Tarefa 3 (decisão 6) continua a ser a única defesa contra essa expectativa.
