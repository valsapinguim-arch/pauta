import js from '@eslint/js'
import globals from 'globals'
import tseslint from 'typescript-eslint'
import prettier from 'eslint-config-prettier'

/**
 * Allowlist de rede — ver prompts/tasks/00-preparacao-do-projeto.md (decisão 4).
 *
 * A app não comunica com a rede em runtime: o áudio nunca sai do dispositivo.
 * Esta lista começa vazia e cresce de forma controlada — a Tarefa 7 acrescenta
 * aqui (e só aqui) o módulo que carrega o modelo de `/public/models`.
 * Cada adição é uma decisão consciente, não um ajuste de conveniência.
 */
const NETWORK_ALLOWLIST = []

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
