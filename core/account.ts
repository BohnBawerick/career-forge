import { eq } from 'drizzle-orm'
import { db } from '../db/client'
import { account, type Account, type NewAccount } from '../db/schema'

/**
 * An email address is a login name, not a mailbox: v1 never sends to it (ADR 0007). Case is
 * folded so the same person cannot end up with two Accounts by capitalising differently.
 */
export function normaliseLoginEmail(email: string): string {
  return email.trim().toLowerCase()
}

export async function findAccountByAuthUserId(authUserId: string): Promise<Account | undefined> {
  const rows = await db().select().from(account).where(eq(account.authUserId, authUserId)).limit(1)
  return rows[0]
}

export async function findAccountByEmail(email: string): Promise<Account | undefined> {
  const rows = await db()
    .select()
    .from(account)
    .where(eq(account.email, normaliseLoginEmail(email)))
    .limit(1)
  return rows[0]
}

/**
 * True while nobody has claimed the install. The first Account to sign up becomes the Owner
 * and sign-up then closes (ADR 0007).
 */
export async function installIsUnclaimed(): Promise<boolean> {
  const rows = await db().select({ id: account.id }).from(account).limit(1)
  return rows.length === 0
}

/** True once some Account holds the Owner flag (ADR 0007). */
export async function installHasOwner(): Promise<boolean> {
  const rows = await db()
    .select({ id: account.id })
    .from(account)
    .where(eq(account.isOwner, true))
    .limit(1)
  return rows.length > 0
}

export async function createAccount(input: NewAccount): Promise<Account> {
  const rows = await db()
    .insert(account)
    .values({ ...input, email: normaliseLoginEmail(input.email) })
    .returning()
  const created = rows[0]
  if (!created) throw new Error('Insert of account returned no row')
  return created
}

/**
 * Drizzle wraps a failed query in an error of its own and keeps the one Postgres sent as the
 * cause, so `code` and `constraint` are never on the error a caller catches. Walk the chain.
 */
function violates(error: unknown, constraint: string): boolean {
  let cursor = error
  for (let depth = 0; cursor != null && depth < 8; depth++) {
    const pg = cursor as { code?: unknown, constraint?: unknown, cause?: unknown }
    if (pg.code === '23505' && pg.constraint === constraint) return true
    cursor = pg.cause
  }
  return false
}

/**
 * True when a write lost the race for the install's one Owner. `installIsUnclaimed()` reads
 * before the insert writes, so the `account_one_owner` index is what actually decides (ADR 0007).
 */
export function isOwnerAlreadyTaken(error: unknown): boolean {
  return violates(error, 'account_one_owner')
}

/** True when some other write already created the Account for this login. */
function isAccountAlreadyCreated(error: unknown): boolean {
  return violates(error, 'account_auth_user_id_unique')
}

/**
 * The login repair path: return the Account behind a login, creating it when the sign-up that
 * should have written it did not finish (ADR 0007). The repaired Account claims the install if
 * nobody holds it, so a repair never leaves the install without an Owner.
 *
 * Two logins can reach this at the same moment. Either unique violation means the other side
 * won, so this re-reads what that side wrote instead of failing a repair that already happened.
 */
export async function findOrCreateAccountForLogin(authUserId: string, email: string): Promise<Account> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const existing = await findAccountByAuthUserId(authUserId)
    if (existing) return existing

    try {
      return await createAccount({ authUserId, email, isOwner: !(await installHasOwner()) })
    }
    catch (error) {
      if (!isAccountAlreadyCreated(error) && !isOwnerAlreadyTaken(error)) throw error
    }
  }
  throw new Error(`Could not create the Account for login ${authUserId}`)
}
