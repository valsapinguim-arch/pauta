/// <reference lib="webworker" />

import { clientsClaim } from 'workbox-core'
import { ExpirationPlugin } from 'workbox-expiration'
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching'
import { registerRoute } from 'workbox-routing'
import { StaleWhileRevalidate } from 'workbox-strategies'

declare const self: ServiceWorkerGlobalScope

/**
 * Service worker escrito à mão (`injectManifest`) — ver Tarefa 2, decisão 1.
 *
 * `generateSW` seria mais simples, mas esta app precisa de controlo real sobre
 * duas coisas que `generateSW` não expõe com a mesma clareza: a política de
 * cache do modelo (decisão 3) e o fluxo de atualização (decisão 5).
 */

// ---------------------------------------------------------------------------
// Shell da aplicação — decisão 2: precache, cache-first.
//
// `self.__WB_MANIFEST` é substituído no build pela lista de ficheiros e hashes
// gerada pelo Vite. Como o build é versionado por hash, servir sempre da cache
// nunca arrisca devolver um ficheiro obsoleto.
// ---------------------------------------------------------------------------
precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()

// ---------------------------------------------------------------------------
// Modelo de ML — decisão 3: cache dedicada, FORA do precache manifest.
//
// Se o modelo entrasse no precache, cada atualização da app obrigaria a
// descarregar de novo dezenas de MB antes de a shell sequer aparecer. Com uma
// rota própria, a shell instala depressa e o modelo fica em cache assim que é
// pedido pela primeira vez — e lá permanece entre atualizações da app (ver
// decisão 6 da Tarefa 22: a limpeza de caches antigas preserva esta).
//
// Esta rota só passa a ser exercitada a sério na Tarefa 7, quando existirem
// ficheiros em `/models/`; fica pronta agora porque a Tarefa 7 depende desta
// infraestrutura, não o contrário (ver Contexto desta tarefa).
//
// O próprio chunk do worker de transcrição (Tarefa 7) entra na mesma rota,
// pela mesma razão: `transcribe.worker.ts` importa o TensorFlow.js inteiro
// (~2 MB depois de compilado — TensorFlow.js sozinho, sem contar o modelo),
// e isso ultrapassa o limite por omissão do Workbox para o precache manifest
// (2 MiB), fazendo o build falhar. Mesmo que coubesse, precachá-lo com a
// shell obrigaria a descarregar ~2 MB de TensorFlow.js na primeira visita,
// mesmo para quem nunca chega a gravar nada — exatamente o que a rota do
// modelo já evita para os pesos. `globIgnores` em `vite.config.ts` tira este
// chunk do manifest; esta rota é o que o deixa em cache assim que a primeira
// transcrição o pede.
// ---------------------------------------------------------------------------
export const MODEL_CACHE_NAME = 'pauta-model-v1'

const TRANSCRIBE_WORKER_PATTERN = /\/assets\/transcribe\.worker-.*\.js$/

registerRoute(
  ({ url }) => url.pathname.startsWith('/models/') || TRANSCRIBE_WORKER_PATTERN.test(url.pathname),
  new StaleWhileRevalidate({
    cacheName: MODEL_CACHE_NAME,
    plugins: [
      new ExpirationPlugin({
        maxEntries: 30,
        maxAgeSeconds: 60 * 60 * 24 * 365,
      }),
    ],
  }),
)

// ---------------------------------------------------------------------------
// Atualizações — decisão 5: nunca trocar de versão sem o utilizador decidir.
//
// De propósito NÃO há `self.skipWaiting()` automático em `install`. O novo
// service worker fica em `waiting` até a app (via `useAppUpdate`, que por sua
// vez só age depois de o utilizador clicar em "Atualizar" E a sessão estar
// `idle`) enviar esta mensagem exata — é o mesmo formato que
// `workbox-window`'s `messageSkipWaiting()` envia.
// ---------------------------------------------------------------------------
self.addEventListener('message', (event: ExtendableMessageEvent) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})

/* `clients.claim()` faz o novo service worker assumir controlo assim que
   ativa, sem exigir uma segunda navegação — a app já trata do reload (ver
   useAppUpdate), isto só evita um passo extra depois disso. */
clientsClaim()
