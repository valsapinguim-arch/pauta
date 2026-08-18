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
// ---------------------------------------------------------------------------
export const MODEL_CACHE_NAME = 'pauta-model-v1'

registerRoute(
  ({ url }) => url.pathname.startsWith('/models/'),
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
