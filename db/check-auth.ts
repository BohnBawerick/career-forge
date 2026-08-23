import 'dotenv/config'
import { sql } from 'drizzle-orm'
import { authUsers } from './auth'
import { closeDb, db } from './client'

/**
 * Proves that career-forge can read the schema GoTrue owns (ADR 0005).
 *
 * This is the check that would have caught a Prisma-shaped mistake: the application has to read
 * tables it did not create, and it must never try to own them.
 */
async function main(): Promise<void> {
  const [schemaRow] = await db()
    .execute<{ present: boolean }>(
      sql`select exists (select 1 from information_schema.schemata where schema_name = 'auth') as present`,
    )
    .then(result => result.rows)

  if (!schemaRow?.present) {
    throw new Error('No `auth` schema in the database. Is GoTrue running against it?')
  }

  const users = await db().select({ id: authUsers.id, email: authUsers.email }).from(authUsers)

  console.log(`auth schema present, auth.users readable, ${users.length} login(s) in it.`)
  for (const user of users) console.log(`  ${user.id}  ${user.email ?? '(no address)'}`)
}

main()
  .catch((error: unknown) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(() => closeDb())
