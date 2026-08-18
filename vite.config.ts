import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

/** Tem de coincidir com `--color-accent`/`--color-bg` em src/styles/tokens.css
 *  (tema claro) — ver Tarefa 2, decisão 6. O manifest é estático e não pode
 *  seguir uma variável CSS. */
const THEME_COLOR = '#1c5d4a'
const BACKGROUND_COLOR = '#fbfbfa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      /* Ver Tarefa 2, decisão 1: sw.ts escrito à mão, não `generateSW`. */
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      injectManifest: {
        // Ficheiros do modelo (Tarefa 7) vivem em rota própria fora do
        // precache — ver src/sw.ts. Nada a listar aqui ainda.
      },

      /* Ver Tarefa 2, decisão 5. `injectRegister: 'auto'` deteta que o código
         importa `virtual:pwa-register/react` (useAppUpdate) e não injeta um
         segundo registo por cima — o registo e o fluxo de skipWaiting ficam
         inteiramente sob controlo do hook. */
      registerType: 'prompt',
      injectRegister: 'auto',

      /* Nunca correr o service worker "a fingir" no `vite dev` — só teria
         semântica diferente do build real e contradiria a nota da Tarefa 2:
         "testar sempre com pnpm preview". */
      devOptions: { enabled: false },

      /* Gerados por `pnpm generate-pwa-assets` (pwa-assets.config.ts) e
         versionados em public/. */
      includeAssets: ['favicon.ico', 'apple-touch-icon-180x180.png', 'pwa-icon.svg'],

      manifest: {
        id: '/',
        name: 'pauta',
        short_name: 'pauta',
        description:
          'Ouve uma voz ou um instrumento e escreve a pauta — no teu dispositivo, sem internet.',
        lang: 'pt-PT',
        dir: 'ltr',
        start_url: '/',
        scope: '/',
        /* Ver Tarefa 2, decisão 6: standalone dá sensação de app nativa sem
           esconder gestos do sistema; orientação livre porque a pauta
           beneficia de paisagem em telefones. */
        display: 'standalone',
        orientation: 'any',
        background_color: BACKGROUND_COLOR,
        theme_color: THEME_COLOR,
        categories: ['music', 'productivity', 'utilities'],
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'pwa-1024x1024.png', sizes: '1024x1024', type: 'image/png', purpose: 'any' },
          {
            src: 'maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
    }),
  ],
  resolve: {
    /* Tem de ficar em sincronia com `paths` no tsconfig.json e com o alias do
       vitest.config.ts — três sítios, mesma verdade. */
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    /* Ainda sem orçamento de bundle a sério: isso é da Tarefa 19, com medições.
       Este aviso serve só para não deixar o tamanho crescer sem se notar. */
    chunkSizeWarningLimit: 600,
  },
})
