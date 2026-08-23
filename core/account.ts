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

export async function createAccount(input: NewAccount): Promise<Account> {
  const rows = await db()
    .insert(account)
    .values({ ...input, email: normaliseLoginEmail(input.email) })
    .returning()
  const created = rows[0]
  if (!created) throw new Error('Insert of account returned no row')
  return created
}
