# Tarefa 22 — Build e Distribuição

## Objetivo

Publicar a app: build de produção verificado, alojamento estático, cabeçalhos corretos, versionamento e um fluxo de atualização que não quebra instalações existentes.

## Contexto

Depende de todas as tarefas anteriores, em particular da Tarefa 2 (service worker e fluxo de atualização) e da Tarefa 19 (orçamento de bundle). É a última tarefa do plano.

## Decisões adotadas

**1. Alojamento estático puro, sem funções de servidor**
- Um serviço de alojamento estático com HTTPS e cabeçalhos configuráveis (Cloudflare Pages, Netlify, Vercel ou GitHub Pages com um proxy à frente).
- Justificação: a app é ficheiros estáticos e a arquitetura não tem servidor. O critério de escolha é ter HTTPS (obrigatório para service workers e microfone), permitir configurar cabeçalhos (decisão 3) e servir os ficheiros do modelo sem limites de tamanho problemáticos. O custo é praticamente zero em qualquer destes — o que era um dos objetivos declarados do produto.

**2. CSP restritiva, sem `connect-src` para domínios externos**
- `default-src 'self'`, `script-src 'self' 'wasm-unsafe-eval'`, `connect-src 'self'`, `img-src 'self' data: blob:`, `media-src 'self' blob:`, `object-src 'none'`, `frame-ancestors 'none'`.
- Justificação: a política transforma a promessa "o áudio nunca sai do dispositivo" numa garantia imposta pelo browser, não apenas numa regra de código. `wasm-unsafe-eval` é necessário para o TensorFlow.js — é a única concessão, e é explícita. `connect-src 'self'` é a linha que a telemetria (Tarefa 21, decisão 7) teria de fazer mover, o que garante que ligá-la é uma decisão visível.

**3. Cabeçalhos obrigatórios além da CSP**
- `Cross-Origin-Opener-Policy: same-origin` e `Cross-Origin-Embedder-Policy: require-corp` (necessários para WASM com threads na Tarefa 7), `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, `Permissions-Policy` a autorizar `microphone=(self)` e a negar o resto.
- Justificação: os dois primeiros são requisito técnico — sem eles o WASM com threads não ativa e a inferência fica mais lenta sem que nada dê erro. `Permissions-Policy` a negar tudo menos o microfone é a expressão declarativa de que a app não usa câmara, geolocalização nem sensores.
- **Verificar:** COEP `require-corp` obriga a que todos os recursos sejam da própria origem ou tenham cabeçalhos CORS adequados. Como tudo é local, deve funcionar — mas é o cabeçalho que mais provavelmente quebra algo, e o sintoma é recursos que deixam de carregar.

**4. Cache HTTP alinhada com o versionamento por hash**
- Assets com hash no nome: `max-age` longo, `immutable`. `index.html`, `manifest.webmanifest` e o service worker: `no-cache`.
- Justificação: se o service worker fosse servido com cache longa, o browser não veria as atualizações e a app ficaria congelada numa versão antiga — sem forma de a corrigir remotamente. É o erro clássico de publicação de PWA. Os ficheiros do modelo têm hash e podem levar cache longa; a sua persistência offline é tratada pela Cache API (Tarefa 2, decisão 3), não pela cache HTTP.

**5. Versão semântica visível na app e no service worker**
- Versão do `package.json` injetada na build, mostrada no ecrã de diagnóstico (Tarefa 21) e incluída no nome das caches.
- Justificação: sem versão visível é impossível saber o que um utilizador tem instalado quando reporta um problema. Incluí-la no nome das caches é o que faz a limpeza de caches antigas ser correta em vez de heurística.

**6. Caches antigas limpas na ativação, por prefixo e versão**
- Ao ativar, o service worker apaga as caches com o prefixo da app cuja versão não é a atual — **exceto** a cache do modelo, que é preservada entre versões.
- Justificação: sem limpeza, cada publicação deixa uma cópia da shell antiga e o armazenamento cresce até o browser começar a apagar coisas por si (possivelmente as transcrições). A exceção do modelo é a decisão 3 da Tarefa 2 a ser cumprida: uma atualização da app não deve custar ao utilizador um novo download de dezenas de MB.

**7. Verificação manual de publicação antes de cada lançamento**
- Lista explícita: instalar de novo, atualizar de uma versão anterior instalada, transcrever offline, exportar, e confirmar que a biblioteca sobrevive à atualização.
- Justificação: o cenário que quebra de verdade é o da atualização, e nunca aparece nos testes — que correm sempre de estado limpo. A biblioteca sobreviver à atualização é o mais importante de todos, porque é dado do utilizador.

**8. Um só ambiente, sem *staging***
- Publicação direta para produção a partir de `main`, com pré-visualizações automáticas por PR se o serviço as oferecer.
- Justificação: a app não tem base de dados nem estado de servidor; um ambiente de *staging* separado duplicaria configuração para testar o que uma pré-visualização de PR já testa. As pré-visualizações cobrem o risco real (uma alteração quebrar a app) sem infraestrutura adicional.

**9. Sem CI a bloquear publicação nesta fase, mas com verificação automática antes de publicar**
- Um passo que corre `lint`, `typecheck`, `test` e a verificação de orçamento de bundle (Tarefa 19, decisão 8) antes de publicar; falha impede a publicação.
- Justificação: o valor está em não publicar uma build quebrada, o que não exige um pipeline elaborado. A suite unitária corre em segundos (Tarefa 20, decisão 4), portanto o custo é baixo o suficiente para não haver tentação de contornar.

**10. Licenças e atribuições incluídas**
- Ficheiro de licenças de terceiros gerado na build, com atenção particular à do modelo Basic Pitch e à do VexFlow, acessível pelo ecrã de diagnóstico.
- Justificação: a app distribui os pesos de um modelo de terceiros e uma biblioteca de notação — as respetivas licenças exigem atribuição. É pouco trabalho e evita um problema real.

## Âmbito técnico

* Verificar o build de produção: sem avisos, orçamento de bundle respeitado, modelo e VexFlow fora do caminho crítico
* Escolher o serviço de alojamento conforme os critérios da decisão 1 e configurar o domínio com HTTPS
* Configurar todos os cabeçalhos das decisões 2 e 3, e verificá-los no destino publicado (não só na configuração)
* Configurar a cache HTTP da decisão 4 e confirmar que o service worker é servido com `no-cache`
* Injetar a versão na build e mostrá-la no diagnóstico (decisão 5)
* Implementar a limpeza de caches por versão com preservação da cache do modelo (decisão 6)
* Documentar em `docs/deploy.md` o procedimento de publicação e a lista de verificação da decisão 7
* Configurar o passo de verificação automática da decisão 9
* Gerar o ficheiro de licenças e expô-lo no diagnóstico (decisão 10)
* Publicar, e correr a lista de verificação completa num telefone e num desktop
* Testar especificamente a atualização a partir de uma versão instalada, confirmando que a biblioteca sobrevive
* Verificar com Lighthouse: PWA instalável, sem erros, desempenho aceitável

## Guardrails para IA (atualizar `AGENTS.md`)

* "A CSP inclui `connect-src 'self'` e não abre para domínios externos; `wasm-unsafe-eval` é a única concessão em `script-src` (necessária ao TensorFlow.js). Alterar a CSP para permitir um domínio externo é uma mudança de arquitetura e exige atualizar `docs/architecture.md`."
* "`Cross-Origin-Opener-Policy: same-origin` e `Cross-Origin-Embedder-Policy: require-corp` são obrigatórios — sem eles o WASM com threads não ativa e a inferência fica mais lenta sem dar erro."
* "`index.html`, `manifest.webmanifest` e o service worker são servidos com `no-cache`; apenas assets com hash no nome levam cache longa. Um service worker com cache longa congela a app numa versão antiga sem possibilidade de correção remota."
* "A limpeza de caches na ativação preserva sempre a cache do modelo; uma atualização da app nunca provoca um novo download do modelo."
* "A versão do `package.json` é injetada na build, visível no diagnóstico e incluída no nome das caches."
* "Nenhuma publicação acontece sem `lint`, `typecheck`, `test` e verificação de orçamento de bundle a passar."
* "Antes de cada lançamento corre-se a lista de verificação de `docs/deploy.md`, incluindo obrigatoriamente a atualização a partir de uma versão instalada e a confirmação de que a biblioteca do utilizador sobrevive."
* "As licenças de terceiros são geradas na build e acessíveis na app; a atribuição ao modelo Basic Pitch e ao VexFlow é obrigatória."

## Entregáveis

* App publicada e instalável a partir de um URL público com HTTPS
* Todos os cabeçalhos verificados no destino publicado
* Cache HTTP correta, confirmada por inspeção das respostas
* Atualização a partir de versão instalada a funcionar, com a biblioteca preservada
* Transcrição offline a funcionar na app instalada
* Versão visível no diagnóstico
* `docs/deploy.md` com procedimento e lista de verificação
* Verificação automática a bloquear publicações quebradas
* Licenças de terceiros incluídas e acessíveis
* Lighthouse sem erros de PWA
* `AGENTS.md` atualizado com as regras acima

## Notas / Dependências

* Depende de todas as tarefas anteriores, sobretudo das Tarefas 2 e 19.
* A verificação da decisão 7 mais importante é a da atualização: testar sempre a partir de uma instalação da versão anterior, não de um browser limpo. É o único caminho onde é possível perder dados de utilizadores, e é o que nenhum teste automático cobre.
* Se o COEP (decisão 3) quebrar algum recurso, o sintoma é um ficheiro que deixa de carregar sem erro óbvio na consola. Verificar sempre a aba de rede depois de o ativar.
* Confirmar que os ficheiros WASM do TensorFlow.js são servidos com o `Content-Type` correto (`application/wasm`) — servidos como `application/octet-stream`, a instanciação em *streaming* falha e o TensorFlow.js recorre a um caminho mais lento, silenciosamente.
* Concluída esta tarefa, o plano do `base.md` está cumprido. As evoluções seguintes estão em "Melhorias arquiteturais recomendadas" — e a primeira decisão a tomar aí (transcrição polifónica a sério) implica rever a decisão de não ter servidor, que atravessa toda esta arquitetura.
