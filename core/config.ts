import { z } from 'zod'

/**
 * Every environment variable career-forge reads, in one place.
 *
 * `core/` is the only place that touches `process.env`, so `server/` and `worker/` cannot
 * drift apart on what a variable is called or what its default is. See `.env.example` for
 * the full list with comments.
 */
const schema = z.object({
  DATABASE_URL: z.string().min(1),
  MIGRATION_DATABASE_URL: z.string().min(1).optional(),

  GOTRUE_URL: z.string().min(1),
  GOTRUE_JWT_SECRET: z.string().min(32),

  QUEUE_SCHEMA: z.string().min(1).default('pgboss'),

  STORAGE_DRIVER: z.enum(['filesystem', 's3']).default('filesystem'),
  STORAGE_FILESYSTEM_ROOT: z.string().min(1).default('./.data/storage'),
  STORAGE_S3_BUCKET: z.string().optional(),
  STORAGE_S3_REGION: z.string().optional(),
  STORAGE_S3_ENDPOINT: z.string().optional(),
  STORAGE_S3_ACCESS_KEY_ID: z.string().optional(),
  STORAGE_S3_SECRET_ACCESS_KEY: z.string().optional(),
})

export type Config = z.infer<typeof schema>

let cached: Config | undefined

/**
 * Parsed once per process. Throws on the first read if anything required is missing, so a
 * misconfigured install fails at the first request rather than halfway through a write.
 */
export function config(): Config {
  if (!cached) {
    const parsed = schema.safeParse(process.env)
    if (!parsed.success) {
      const problems = parsed.error.issues
        .map(issue => `  ${issue.path.join('.')}: ${issue.message}`)
        .join('\n')
      throw new Error(`Environment is not configured. Copy .env.example to .env.\n${problems}`)
    }
    cached = parsed.data
  }
  return cached
}

/** Test-only. Drops the memoised config so a test can change the environment under it. */
export function resetConfigForTests(): void {
  cached = undefined
}
