# Tarefa 2 — PWA

## Objetivo

Transformar a aplicação numa PWA instalável e verdadeiramente offline: manifest, ícones, service worker, estratégias de cache e fluxo de atualização de versão.

## Contexto

Depende da Tarefa 1 (app a arrancar, build de produção a funcionar). Esta tarefa configura a infraestrutura de cache **antes** de existir o modelo de ML (Tarefa 7), porque é a Tarefa 7 que vai depender destas regras para ficar disponível offline — e não o contrário.

## Decisões adotadas

**1. `vite-plugin-pwa` com Workbox, em modo `injectManifest`**

- Não `generateSW`: o service worker é escrito à mão (`src/sw.ts`) e o plugin injeta-lhe a lista de ficheiros a precachear.
- Justificação: `generateSW` é mais simples, mas esta app precisa de controlo real sobre o cache do modelo (dezenas de MB, política diferente da shell) e sobre o fluxo de atualização (decisão 5). Com `injectManifest` esse controlo é explícito e legível em vez de espalhado por opções de configuração.

**2. Shell da aplicação: precache, cache-first**

- HTML, JS, CSS, fontes e ícones entram no precache manifest e servem-se sempre da cache.
- Justificação: é o que garante arranque instantâneo e funcionamento em modo avião. Sendo o build versionado por hash, não há risco de servir um ficheiro obsoleto.

**3. Modelo de ML: cache própria, política _stale-while-revalidate_ com expiração longa**

- Cache dedicada (`pauta-model-v1`), fora do precache manifest da shell.
- Justificação: se o modelo entrasse no precache, cada atualização da app forçaria o utilizador a descarregar de novo dezenas de MB, e a primeira visita ficaria bloqueada num download enorme antes de a app aparecer. Com cache própria, a shell instala depressa e o modelo é buscado quando é preciso (e fica lá para sempre).
- **Consequência a tratar na Tarefa 7:** a primeira transcrição pode ter de esperar pelo download do modelo. Esse estado precisa de interface própria ("a preparar pela primeira vez…"), não pode parecer que a app está pendurada.

**4. Sem cache de runtime para nada externo**

- Não há regras de cache para APIs, fontes de CDN ou imagens remotas.
- Justificação: a app não faz pedidos de rede em runtime (ver `AGENTS.md`). Fontes e assets são todos locais. Uma regra de cache para algo que não existe é convite a que passe a existir.

**5. Atualizações explícitas: nunca recarregar sem o utilizador saber**

- `registerType: 'prompt'`. Quando há nova versão, mostra-se um aviso discreto com um botão "Atualizar".
- O aviso **não aparece** enquanto o estado da sessão for `recording` ou `processing`; fica pendente até a sessão voltar a `idle`.
- Justificação: `autoUpdate` pode trocar o service worker e recarregar a página a meio de uma transcrição, perdendo trabalho que levou tempo real a produzir no dispositivo do utilizador. Aqui o custo de uma atualização mal calendarizada é alto, portanto a atualização é sempre uma decisão do utilizador.

**6. Manifest: `display: standalone`, orientação livre**

- `standalone`, `orientation: 'any'`, `theme_color`/`background_color` alinhados com os tokens da Tarefa 1.
- Justificação: `standalone` dá a sensação de app nativa sem esconder gestos do sistema. A orientação fica livre porque a pauta beneficia muito de paisagem em telefones (uma pauta é larga), e forçar retrato tornaria o resultado quase ilegível.

**7. Ícones gerados a partir de um único SVG, incluindo `maskable`**

- 192, 512 e 1024 px em PNG, mais uma variante `maskable` com margem de segurança, mais `apple-touch-icon`.
- Justificação: sem variante `maskable`, o Android recorta o ícone e o resultado é feio ou ilegível. É um detalhe pequeno que se nota imediatamente no ecrã inicial.

**8. Sem notificações push, sem background sync**

- Justificação: não há servidor para enviar notificações nem nada para sincronizar. Pedir permissão de notificações numa app que não as usa é dos comportamentos que mais depressa faz um utilizador desinstalar.

## Âmbito técnico

- Instalar e configurar `vite-plugin-pwa` em modo `injectManifest`
- Escrever `src/sw.ts`: precache da shell (decisão 2), rota de cache do modelo (decisão 3), `skipWaiting` controlado por mensagem da app (decisão 5)
- Criar `manifest.webmanifest` conforme decisão 6 (nome, `short_name`, descrição, `start_url`, `scope`, cores, categorias)
- Criar o SVG base do ícone e gerar todos os tamanhos, incluindo `maskable` e `apple-touch-icon`
- Adicionar meta tags de iOS (`apple-mobile-web-app-capable`, `status-bar-style`, viewport com `viewport-fit=cover`)
- Implementar `useInstallPrompt()`: captura `beforeinstallprompt`, expõe `canInstall` e `promptInstall()`; nunca mostra o convite na primeira visita nem durante uma transcrição
- Implementar `useAppUpdate()`: deteta nova versão, respeita o estado da sessão (decisão 5), aplica a atualização a pedido
- Verificar offline a sério: build, `pnpm preview`, carregar, desligar a rede, recarregar
- Verificar instalação em Android (Chrome) e iOS (Safari, "Adicionar ao ecrã principal")

## Guardrails para IA (atualizar `AGENTS.md`)

- "O service worker é escrito à mão em `src/sw.ts` (modo `injectManifest`); proibido mudar para `generateSW` — a política de cache do modelo e o fluxo de atualização dependem de controlo explícito."
- "O modelo de ML vive numa cache dedicada, nunca no precache manifest da shell; uma atualização da app nunca deve obrigar a descarregar o modelo outra vez."
- "Proibido `registerType: 'autoUpdate'` e proibido chamar `skipWaiting()`/recarregar a página sem confirmação do utilizador. Uma atualização nunca é aplicada com a sessão em `recording` ou `processing`."
- "Não adicionar regras de cache de runtime para domínios externos, nem carregar fontes, scripts ou imagens de CDN — todos os assets são locais e a app não faz pedidos de rede."
- "Não pedir permissão de notificações nem registar background sync/push: a app não tem servidor e não usa estas capacidades."
- "O convite de instalação nunca é mostrado na primeira visita nem a meio de uma transcrição."

## Entregáveis

- App instalável em Android e iOS, com ícone correto (incluindo `maskable`)
- Depois da primeira visita, a app arranca e navega sem rede
- Nova versão gera aviso com botão "Atualizar"; a atualização não ocorre sem clique
- Aviso de atualização confirmadamente suprimido durante `recording`/`processing`
- Lighthouse: PWA instalável, sem erros de manifest ou service worker
- `AGENTS.md` atualizado com as regras acima

## Notas / Dependências

- Depende da Tarefa 1.
- A rota de cache do modelo (decisão 3) é criada aqui mas só passa a ser exercitada na Tarefa 7. Confirmar nessa tarefa que o modelo fica mesmo em cache e que a segunda transcrição não repete o download.
- Service workers só funcionam em `https` ou `localhost` — testar sempre com `pnpm preview`, nunca com o `pnpm dev` a partir de um IP da rede local, ou o comportamento observado não é o real.
- iOS tem limitações conhecidas em PWAs (quota de armazenamento mais apertada, sem `beforeinstallprompt`). O convite de instalação deve degradar-se para instruções manuais em Safari, não desaparecer sem explicação.

### Registado durante a implementação

- **`workbox-core` teve de ser instalado como dependência direta.** `src/sw.ts` importa `clientsClaim` de `workbox-core`, mas o pnpm (estrito de propósito) só liga ao `node_modules` de topo os pacotes listados no `package.json` — `workbox-core` só existia como transitivo de `workbox-precaching`, invisível a um import direto. Sintoma seria um erro de resolução de módulo só na build da service worker. Regra geral para o resto do projeto: qualquer pacote importado diretamente em código tem de estar listado como dependência própria, nunca confiar em hoisting transitivo.
- **`exactOptionalPropertyTypes` desativado só em `tsconfig.worker.json`.** Os tipos do `workbox-expiration` (`ExpirationPlugin`) não são escritos para essa restrição — `pnpm typecheck` falhava com um erro de compatibilidade estrutural em `cacheDidUpdate` que não é um bug do projeto, é fricção entre TS muito estrito e tipos de terceiros. Mantido `true` no `tsconfig.json` principal (onde protege as estruturas do pipeline musical, a razão de existir); relaxado só onde o ficheiro é sobretudo cola para o Workbox.
- **Ícone gerado por `@vite-pwa/assets-generator`, não à mão.** Um único SVG fonte (`public/pwa-icon.svg`, pauta simplificada de três linhas + uma nota) com fundo de bordo a bordo e conteúdo desenhado dentro da zona segura de um maskable (círculo de raio ~410 em torno do centro, numa tela de 1024). Com o conteúdo já respeitando essa zona na origem, `padding: 0` em todos os tipos gerados (`transparent`, `maskable`, `apple`) — sem isso, a geradora aplicaria padding extra por cima e desperdiçaria zona segura já contabilizada.
- **Limite real de verificação neste ambiente: o painel de browser embutido corre em Electron (`Electron/42.7.0`), não Chrome nativo, e falha a registar QUALQUER service worker — confirmado com um SW de uma linha, servido do mesmo `dist/`, que falhou com o mesmo erro genérico ("An unknown error occurred when fetching the script") que `src/sw.ts`.** Não é um bug do projeto: `dist/sw.js` foi validado como JavaScript sintaticamente correto (`node --check`), o manifest é servido com o conteúdo e os cabeçalhos certos, e a app trata o erro de registo graciosamente (`onRegisterError`, sem rebentar o ecrã). A tentativa de usar Chrome real via integração externa também não teve sucesso nesta sessão (extensão não ligada). **Verificação por fazer, em Chrome ou Edge a sério**, antes de considerar os entregáveis "App instalável" e "Lighthouse: PWA instalável" cumpridos: registo do service worker, offline a sério (desligar a rede depois da primeira visita), instalação em Android/iOS, e o fluxo de atualização ponta a ponta (publicar uma alteração, ver o aviso aparecer, confirmar que só atualiza ao clicar).
