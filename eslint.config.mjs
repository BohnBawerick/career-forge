import { createConfigForNuxt } from '@nuxt/eslint-config/flat'

/**
 * The rule that matters here is the last one. `server/` and `worker/` both import `core/`, and
 * `core/` imports neither (ADR 0004). That is what keeps the domain rules in one place with two
 * doors into them, and it is enforced rather than remembered.
 */
export default createConfigForNuxt({
  features: { stylistic: true },
})
  .append({
    name: 'career-forge/ignores',
    ignores: [
      '.data/**',
      '.nuxt/**',
      '.output/**',
      'db/migrations/**',
      'dist/**',
      'node_modules/**',
      'playwright-report/**',
      'test-results/**',
    ],
  })
  .append({
    name: 'career-forge/core-imports-neither-door',
    files: ['core/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/server', '**/server/**', '**/worker', '**/worker/**'],
              message:
                'core/ imports neither server/ nor worker/ (ADR 0004). Both of those import core/, not the other way round.',
            },
            {
              group: ['#imports', '#app', 'h3', 'nuxt', 'nitropack'],
              message:
                'core/ has to run under the worker as well as under Nitro, so it cannot reach for Nuxt or h3.',
            },
          ],
        },
      ],
    },
  })
