import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import tseslint from 'typescript-eslint'
import prettier from 'eslint-config-prettier'

/**
 * Allowlist de rede — ver prompts/tasks/00-preparacao-do-projeto.md (decisão 4).
 *
 * A app não comunica com a rede em runtime: o áudio nunca sai do dispositivo.
 * Esta lista começa vazia e cresce de forma controlada — a Tarefa 7 acrescenta
 * aqui (e só aqui) o módulo que carrega o modelo de `/public/models`.
 * Cada adição é uma decisão consciente, não um ajuste de conveniência.
 *
 * `transcribe.worker.ts` (Tarefa 7) carrega o modelo e os binários WASM de
 * `/models/` — sempre da própria origem, nunca de CDN (decisão 3). Nem
 * `tf.loadGraphModel` nem `setWasmPaths` escrevem `fetch` no código deste
 * ficheiro (fica dentro do TensorFlow.js), por isso as regras abaixo não
 * disparariam de qualquer forma — a entrada fica aqui para o registo ficar
 * explícito e fácil de encontrar, não porque o lint precise dela para passar.
 */
const NETWORK_ALLOWLIST = ['src/workers/transcribe.worker.ts']

/** Mensagem única para as regras de rede, para não divergirem entre si. */
const NO_NETWORK =
  'A app não comunica com a rede em runtime (o áudio nunca sai do dispositivo). ' +
  'Se precisas mesmo disto, acrescenta o ficheiro a NETWORK_ALLOWLIST em eslint.config.js e justifica na tarefa.'

/**
 * `no-restricted-globals` só apanha referências globais nuas (`fetch(...)`).
 * Estes seletores cobrem as formas qualificadas, que passariam ao lado.
 */
const networkSyntaxSelectors = ['window', 'globalThis', 'self'].flatMap((host) =>
  ['fetch', 'XMLHttpRequest', 'WebSocket', 'EventSource'].map((api) => ({
    selector: `MemberExpression[object.name='${host}'][property.name='${api}']`,
    message: NO_NETWORK,
  })),
)

export default tseslint.config(
  {
    ignores: [
      'dist/**',
      'coverage/**',
      'node_modules/**',
      'playwright-report/**',
      'test-results/**',
      'public/models/**',
      'dev-dist/**',
    ],
  },

  js.configs.recommended,
  tseslint.configs.strict,

  {
    files: ['**/*.{ts,tsx,js}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.worker,
      },
    },
    rules: {
      /* O TypeScript já resolve identificadores não definidos, e melhor. */
      'no-undef': 'off',

      /* Alias @/ obrigatório — ver AGENTS.md.
         `no-restricted-imports` não suporta regex, daí a enumeração de níveis. */
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['../*', '../../*', '../../../*', '../../../../*'],
              message: 'Usa o alias @/... em vez de imports relativos ascendentes.',
            },
          ],
        },
      ],

      /* A app não fala com a rede — ver NETWORK_ALLOWLIST acima. */
      'no-restricted-globals': [
        'error',
        { name: 'fetch', message: NO_NETWORK },
        { name: 'XMLHttpRequest', message: NO_NETWORK },
        { name: 'WebSocket', message: NO_NETWORK },
        { name: 'EventSource', message: NO_NETWORK },
      ],
      'no-restricted-syntax': [
        'error',
        ...networkSyntaxSelectors,
        {
          selector: "MemberExpression[object.name='navigator'][property.name='sendBeacon']",
          message: NO_NETWORK,
        },
        {
          selector: "NewExpression[callee.name='WebSocket']",
          message: NO_NETWORK,
        },
      ],

      /* `any` proibido — ver AGENTS.md e decisão 3 da Tarefa 0. */
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],

      'no-console': ['warn', { allow: ['warn', 'error'] }],
      eqeqeq: ['error', 'always'],
      'prefer-const': 'error',
      'object-shorthand': 'error',
    },
  },

  reactHooks.configs.flat.recommended,

  /**
   * Pureza de `@/lib` — ver AGENTS.md e Tarefa 1, decisão 5.
   *
   * O pipeline de transcrição é uma cadeia de funções puras. Essa pureza é o
   * que permite testá-lo em Node, sem jsdom, sem áudio e sem modelo — e é a
   * condição para os testes de regressão da Tarefa 20 serem rápidos e
   * determinísticos. Escrita apenas como regra em prosa, erodia na primeira
   * vez que alguém precisasse de `Date.now()`; aqui o linter recusa.
   */
  {
    files: ['src/lib/**/*.ts'],
    ignores: ['src/lib/**/*.{test,spec}.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['../*', '../../*', '../../../*', '../../../../*'],
              message: 'Usa o alias @/... em vez de imports relativos ascendentes.',
            },
            {
              group: ['@/features/*', '@/components/*', '@/workers/*'],
              message:
                '@/lib não depende de features, componentes ou workers — a dependência é sempre no sentido oposto.',
            },
          ],
          paths: [
            {
              name: 'react',
              message: '@/lib é lógica pura: não importa React.',
            },
            {
              name: 'react-dom',
              message: '@/lib é lógica pura: não importa React.',
            },
          ],
        },
      ],
      'no-restricted-globals': [
        'error',
        { name: 'window', message: '@/lib é puro: sem DOM, sem window.' },
        { name: 'document', message: '@/lib é puro: sem DOM.' },
        { name: 'navigator', message: '@/lib é puro: sem navigator.' },
        { name: 'localStorage', message: '@/lib é puro: sem armazenamento.' },
        { name: 'sessionStorage', message: '@/lib é puro: sem armazenamento.' },
        { name: 'indexedDB', message: '@/lib é puro: a persistência é da feature library.' },
        { name: 'fetch', message: '@/lib é puro: sem I/O.' },
        { name: 'XMLHttpRequest', message: '@/lib é puro: sem I/O.' },
        { name: 'AudioContext', message: '@/lib é puro: o Web Audio vive nas features.' },
        {
          name: 'OfflineAudioContext',
          message: '@/lib é puro: o Web Audio vive nas features.',
        },
      ],
    },
  },

  /* Ficheiros de configuração correm em Node, não no browser. */
  {
    files: ['*.config.{ts,js}', 'eslint.config.js'],
    languageOptions: {
      globals: { ...globals.node },
    },
    rules: {
      'no-restricted-globals': 'off',
      'no-restricted-syntax': 'off',
    },
  },

  /* Scripts de linha de comandos (`pnpm copy-model-assets`, Tarefa 7) — Node,
     não browser; `console.log` é a própria razão de existir do script. */
  {
    files: ['scripts/**/*.js'],
    languageOptions: {
      globals: { ...globals.node },
    },
    rules: {
      'no-restricted-globals': 'off',
      'no-restricted-syntax': 'off',
      'no-console': 'off',
    },
  },

  ...(NETWORK_ALLOWLIST.length > 0
    ? [
        {
          files: NETWORK_ALLOWLIST,
          rules: {
            'no-restricted-globals': 'off',
            'no-restricted-syntax': 'off',
          },
        },
      ]
    : []),

  /* Formatação é exclusivamente do Prettier — tem de ficar no fim. */
  prettier,
)
