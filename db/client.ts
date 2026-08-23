import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import { config } from '../core/config'
import * as schema from './schema'

/**
 * One pool per process, created on first use so that importing this module does not open a
 * connection. Nuxt must be able to render the sign-up page with Postgres down.
 *
 * ADR 0006 requires that nothing reaches the pool directly once row-level security is on: a
 * repository layer will open the transaction and declare which Account is asking. That layer
 * arrives with the accounts work; until then this is the only connection in the app.
 */
let pool: Pool | undefined
let instance: NodePgDatabase<typeof schema> | undefined

export function pgPool(): Pool {
  if (!pool) pool = new Pool({ connectionString: config().DATABASE_URL })
  return pool
}

export function db(): NodePgDatabase<typeof schema> {
  if (!instance) instance = drizzle(pgPool(), { schema })
  return instance
}

export async function closeDb(): Promise<void> {
  const open = pool
  pool = undefined
  instance = undefined
  if (open) await open.end()
}
