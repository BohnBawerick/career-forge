import { z } from 'zod'
import { createAccount, installIsUnclaimed, normaliseLoginEmail } from '~~/core/account'
import { createGoTrueUser, deleteGoTrueUser, signInWithPassword } from '../../utils/gotrue'
import { setSessionCookie } from '../../utils/session'

const body = z.object({
  email: z.email(),
  password: z.string().min(8),
})

/**
 * The first person to sign up claims the install and becomes the Owner. Sign-up then closes and
 * everyone else arrives by Invite (ADR 0007). Invites are a later ticket, so for now this route
 * answers exactly once.
 */
export default defineEventHandler(async (event) => {
  const input = body.safeParse(await readBody(event))
  if (!input.success) {
    throw createError({ statusCode: 400, statusMessage: 'An email address and a password of at least 8 characters are required' })
  }

  if (!(await installIsUnclaimed())) {
    throw createError({
      statusCode: 403,
      statusMessage: 'This install has an Owner already. Ask them for an Invite.',
    })
  }

  const email = normaliseLoginEmail(input.data.email)
  const user = await createGoTrueUser(email, input.data.password)

  // The write to GoTrue and the write to our tables cannot be one transaction (ADR 0007). Only a
  // failed account write undoes the login; if that undo also fails, the next login repairs the
  // half state by creating the missing account row.
  let account
  try {
    account = await createAccount({ authUserId: user.id, email, isOwner: true })
  }
  catch (error) {
    await deleteGoTrueUser(user.id).catch(() => {})
    throw error
  }

  // The install is claimed by now, so a failed token grant leaves both the Account and the login
  // alone. Deleting them here would brick an install nobody can claim a second time.
  setSessionCookie(event, await signInWithPassword(email, input.data.password))
  return { account: { id: account.id, email: account.email, isOwner: account.isOwner } }
})
