import 'dotenv/config'
import { drizzle } from 'drizzle-orm/node-postgres'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { Pool } from 'pg'
import { config } from '../core/config'

/**
 * Applies every migration in `db/migrations`.
 *
 * Migrations connect as their own role (ADR 0006): once row-level security is on, the role the
 * application uses must not own the tables, or the policies would not apply to it. Until that
 * split lands, `MIGRATION_DATABASE_URL` falls back to `DATABASE_URL`.
 */
async function main(): Promise<void> {
  const url = config().MIGRATION_DATABASE_URL ?? config().DATABASE_URL
  const pool = new Pool({ connectionString: url })
  try {
    await migrate(drizzle(pool), { migrationsFolder: './db/migrations' })
    console.log('Migrations applied.')
  }
  finally {
    await pool.end()
  }
}

main().catch((error: unknown) => {
  console.error(error)
  process.exit(1)
})
