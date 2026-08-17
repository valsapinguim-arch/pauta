import { defineConfig } from '@vite-pwa/assets-generator/config'

/**
 * Gera os PNGs da PWA a partir de public/pwa-icon.svg — ver Tarefa 2, decisão 7.
 *
 * Corre-se uma vez, à mão (`pnpm generate-pwa-assets`), e os ficheiros gerados
 * ficam versionados em `public/`. Não é regenerado a cada build: assim o que
 * está no repositório é exatamente o que se vê, sem surpresas de um passo de
 * build a produzir bytes diferentes.
 *
 * A cor de fundo (`ACCENT`) tem de coincidir com `--color-accent` em
 * `src/styles/tokens.css` (tema claro) — os PNGs são estáticos e não podem
 * seguir uma variável CSS.
 */
const ACCENT = '#1c5d4a'

export default defineConfig({
  images: ['public/pwa-icon.svg'],
  preset: {
    /*
     * O SVG de origem já é de bordo a bordo e o conteúdo já respeita a zona
     * segura de um maskable (ver comentário no SVG) — por isso `padding: 0`
     * em todos os tipos. `resizeOptions.background` só entra em jogo se o
     * fit alguma vez precisar de letterbox; como a origem é quadrada 1:1,
     * na prática não é usado, mas fica correto por construção.
     */
    transparent: {
      sizes: [192, 512, 1024],
      padding: 0,
      resizeOptions: { fit: 'contain', background: ACCENT },
      favicons: [[48, 'favicon.ico']],
    },
    maskable: {
      sizes: [512],
      padding: 0,
      resizeOptions: { fit: 'contain', background: ACCENT },
    },
    apple: {
      /* Pequena margem: o iOS aplica o seu próprio arredondamento e o ícone
         fica mais equilibrado com uma respiração mínima nas pontas. */
      sizes: [180],
      padding: 0.1,
      resizeOptions: { fit: 'contain', background: ACCENT },
    },
  },
})
