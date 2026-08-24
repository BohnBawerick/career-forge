import { sql } from 'drizzle-orm'
import { boolean, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core'

/**
 * The tables career-forge owns. GoTrue's `auth` schema is declared separately in `db/auth.ts`
 * and is never generated from here.
 */

export const account = pgTable('account', {
  id: uuid('id').primaryKey().defaultRandom(),
  /**
   * The `auth.users` id of the login this Account belongs to. Deliberately not a foreign key:
   * GoTrue owns that schema and migrates it on its own schedule, and a constraint from our side
   * could block an upgrade and lock everyone out (ADR 0007).
   */
  authUserId: uuid('auth_user_id').notNull().unique(),
  /** A login name, not a mailbox. v1 sends no email (ADR 0007). */
  email: text('email').notNull().unique(),
  /** The first Account to sign up claims the install and becomes the Owner (ADR 0007). */
  isOwner: boolean('is_owner').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, table => [
  /**
   * One Owner per install. `installIsUnclaimed()` reads before the insert writes, so two
   * concurrent sign-ups can both pass that check; this index is what stops the second one
   * landing (ADR 0007).
   */
  uniqueIndex('account_one_owner').on(table.isOwner).where(sql`${table.isOwner}`),
])

export type Account = typeof account.$inferSelect
export type NewAccount = typeof account.$inferInsert
