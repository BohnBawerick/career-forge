import { pgSchema, text, timestamp, uuid } from 'drizzle-orm/pg-core'

/**
 * GoTrue's schema, declared so career-forge can read tables it did not create (ADR 0005).
 *
 * Nothing here is ever migrated by us. `drizzle.config.ts` points only at `db/schema.ts` and
 * filters to the `public` schema, so drizzle-kit cannot generate against these declarations.
 * Only the columns career-forge actually reads are listed.
 */
export const authSchema = pgSchema('auth')

export const authUsers = authSchema.table('users', {
  id: uuid('id').primaryKey(),
  email: text('email'),
  createdAt: timestamp('created_at', { withTimezone: true }),
})

export type AuthUser = typeof authUsers.$inferSelect
