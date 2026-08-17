# Tarefa 21 — Erros e Telemetria

## Objetivo

Tratar as falhas de forma útil ao utilizador e diagnosticável por quem mantém a app: mensagens acionáveis, registo local de erros, ecrã de diagnóstico e telemetria opcional.

## Contexto

Depende de todas as tarefas que produzem erros (4, 5, 6, 7, 12, 15, 16, 17) e da Tarefa 1 (`AppErrorBoundary`, criado ali como rede de segurança mínima). Numa app sem servidor, não há logs de servidor para consultar — o que torna esta tarefa a única fonte de informação sobre o que falha em produção.

## Decisões adotadas

**1. Catálogo único de erros nomeados**

- Todos os erros da app vivem num só sítio (`@/lib/errors.ts`), cada um com código, mensagem para o utilizador, ação sugerida e se é recuperável.
- Justificação: as tarefas anteriores criaram os seus erros nomeados de forma independente (`permission-denied`, `unsupported-format`, `decode-failed`, `too-quiet`…). Sem um catálogo, as mensagens divergem em tom e algumas ficam sem tradução. Centralizar também garante que nenhum erro chega ao utilizador sem uma ação sugerida.

**2. Toda a mensagem de erro diz o que fazer a seguir**

- Cada entrada do catálogo tem obrigatoriamente uma ação: um botão, uma instrução, ou uma alternativa.
- Justificação: numa app que corre inteiramente no dispositivo, quase todos os erros são acionáveis pelo utilizador — autorizar o microfone, escolher outro ficheiro, libertar espaço, aproximar-se da fonte de som. Um erro sem ação sugerida é um beco sem saída que o utilizador resolve fechando a app.

**3. Nunca expor detalhes técnicos na interface; guardá-los sempre no registo local**

- O utilizador vê a mensagem do catálogo; a mensagem original, o _stack trace_ e o contexto vão para o registo local.
- Justificação: um `TypeError: Cannot read properties of undefined` não ajuda ninguém a resolver nada e faz a app parecer estragada. Mas descartar a informação impede o diagnóstico — daí ficar guardada e acessível pelo ecrã de diagnóstico (decisão 4).

**4. Registo local em anel, com ecrã de diagnóstico**

- Últimas ~50 entradas em IndexedDB (código, momento, contexto, detalhes técnicos), com um ecrã que as mostra e permite copiar ou exportar como ficheiro de texto.
- Justificação: é o substituto dos logs de servidor. Quando um utilizador reportar um problema, poder pedir-lhe o diagnóstico exportado é a diferença entre corrigir e adivinhar. Em anel para não crescer sem limite e não competir com as transcrições pela quota (Tarefa 16, decisão 8).

**5. Erros de worker propagados com contexto, não silenciados**

- Os workers (Tarefas 6 e 7) enviam erros estruturados com código; `onerror` e `onmessageerror` também são tratados.
- Justificação: um worker que morre sem enviar mensagem deixa a app em `processing` para sempre — o modo de falha mais frustrante possível, porque parece que está a trabalhar. `onerror` cobre a morte inesperada, que a mensagem estruturada não cobre.

**6. Tempo máximo para qualquer operação assíncrona**

- Pré-processamento, inferência, exportação e escrita em IndexedDB têm limite de tempo; ao esgotar, erro recuperável com opção de tentar de novo.
- Justificação: complementa a decisão 5 — cobre o caso em que o worker não morre mas fica pendurado (memória esgotada, contexto WebGL perdido). O estado `processing` nunca deve ser um beco sem saída.

**7. Telemetria opt-in, desligada por omissão, sem serviço de terceiros nesta fase**

- Nada é enviado. A infraestrutura de eventos é preparada e o consentimento existe, mas não há destino configurado.
- Justificação: (a) a app promete que nada sai do dispositivo, e introduzir um SDK de terceiros contradiz isso — mesmo que só enviasse métricas, passaria a haver tráfego para um domínio externo e a CSP teria de abrir; (b) não há decisão tomada sobre que serviço usar. Preparar a estrutura e não a ligar mantém a promessa intacta e deixa o caminho aberto.
- **Quando ligar:** exige escolher um serviço, abrir a CSP explicitamente para esse domínio, atualizar `docs/architecture.md` e `README.md`, e verificar que a lista de eventos permitidos (decisão 8) é respeitada.

**8. Lista fechada de eventos permitidos, verificada em código**

- Apenas: código de erro, duração do áudio em intervalos, tipo de entrada (microfone ou ficheiro), nível de dispositivo, versão da app, tempos de processamento em intervalos. A função de registo rejeita qualquer campo fora da lista.
- Justificação: proibir por regra escrita não impede um evento com o nome do ficheiro de aparecer numa alteração futura. Uma lista aplicada em código impede-o. Nunca: áudio, notas, alturas, títulos, nomes de ficheiro, identificadores de utilizador.

**9. Sem identificador persistente de utilizador ou de instalação**

- Nenhum ID gerado, nem anónimo.
- Justificação: um ID de instalação permite reconstruir o histórico de uma pessoa, o que é rastreamento independentemente de o ID ser aleatório. Para as perguntas que a telemetria desta app poderia responder ("que erros acontecem?", "quanto tempo demora?"), eventos sem correlação bastam.

**10. `AppErrorBoundary` refinado com recuperação e preservação do resultado**

- O fallback mostra mensagem, oferece recarregar e — se havia um `ScoreDocument` — indica que ficou guardado na biblioteca.
- Justificação: um erro de renderização depois de uma transcrição bem-sucedida não deve fazer o utilizador achar que perdeu o trabalho. Como a gravação é automática (Tarefa 16, decisão 5), na maioria dos casos não perdeu — basta dizer-lho.

## Âmbito técnico

- Criar `@/lib/errors.ts`: catálogo tipado com código, mensagem, ação e recuperabilidade; auditar todas as tarefas anteriores e migrar os erros existentes para lá
- Implementar `@/features/diagnostics/errorLog.ts`: registo em anel em IndexedDB, com limite de entradas
- Implementar `DiagnosticsView`: lista de erros, informação do dispositivo e da app, botões de copiar e exportar, limpar registo
- Adicionar o acesso ao diagnóstico de forma discreta (não no fluxo principal)
- Implementar o tratamento de erros de worker da decisão 5, incluindo `onerror` e `onmessageerror`
- Implementar os limites de tempo da decisão 6, com opção de tentar de novo
- Implementar `@/lib/telemetry.ts`: fila de eventos, verificação contra a lista permitida (decisão 8), sem destino configurado; consentimento persistido, desligado por omissão
- Adicionar o controlo de consentimento no diagnóstico, com explicação clara de que nada é enviado atualmente
- Refinar `AppErrorBoundary` conforme decisão 10
- Verificar que nenhum erro do catálogo chega ao utilizador sem ação sugerida
- Testes: cada código do catálogo tem mensagem e ação; a telemetria rejeita campos fora da lista permitida; o registo em anel não excede o limite; erro de worker transita para `error` e não deixa a app em `processing`; limite de tempo dispara e permite tentar de novo

## Guardrails para IA (atualizar `AGENTS.md`)

- "Todos os erros vivem no catálogo `@/lib/errors.ts`, cada um com código, mensagem em pt-PT, ação sugerida e recuperabilidade; proibido criar erros ad-hoc numa feature ou mostrar ao utilizador um erro sem ação sugerida."
- "Detalhes técnicos (mensagem original, _stack trace_) nunca aparecem na interface e são sempre guardados no registo local."
- "Todo o erro de worker é propagado com código; `onerror` e `onmessageerror` são sempre tratados. A app nunca pode ficar presa em `processing` — todas as operações assíncronas têm limite de tempo."
- "Telemetria é opt-in, desligada por omissão, e atualmente sem destino configurado. Ligar um destino exige escolher o serviço, abrir a CSP para esse domínio e atualizar `docs/architecture.md` e `README.md` — não é uma alteração de configuração."
- "Eventos de telemetria são restritos à lista permitida, verificada em código: código de erro, duração em intervalos, tipo de entrada, nível de dispositivo, versão, tempos em intervalos. NUNCA áudio, notas, alturas, títulos, nomes de ficheiro."
- "Proibido gerar ou persistir qualquer identificador de utilizador ou de instalação, mesmo anónimo."
- "O registo local de erros é um anel de tamanho fixo e nunca compete com as transcrições pela quota de armazenamento."
- "O ecrã de diagnóstico é acessível mas fica fora do fluxo principal."

## Entregáveis

- Catálogo de erros completo, com todos os erros das tarefas anteriores migrados
- Todas as mensagens com ação sugerida, verificado por teste
- Registo local a funcionar, com exportação
- `DiagnosticsView` implementada e acessível
- Nenhum caminho deixa a app presa em `processing`, verificado incluindo morte de worker
- Telemetria preparada, sem destino, com consentimento desligado e lista permitida aplicada em código
- `AppErrorBoundary` a preservar e a comunicar o resultado guardado
- Testes da decisão acima a passar
- `AGENTS.md` atualizado com as regras acima

## Notas / Dependências

- Depende das Tarefas 4, 5, 6, 7, 12, 15, 16 e 17.
- A falha mais provável em produção é memória esgotada em iOS durante a inferência — e manifesta-se como worker morto sem mensagem. A decisão 5 é o que a torna diagnosticável em vez de misteriosa.
- Resistir a ligar um serviço de telemetria "só para ver": é a alteração que quebra a promessa central do produto, e uma vez feita é difícil de justificar a retirada.
- O ecrã de diagnóstico é também útil em desenvolvimento — ver os erros acumulados de uma sessão de testes num telefone é bastante mais prático do que ligar um depurador remoto.
