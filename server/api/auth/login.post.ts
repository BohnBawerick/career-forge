import { z } from 'zod'
import { createAccount, findAccountByAuthUserId, installHasOwner, normaliseLoginEmail } from '~~/core/account'
import { signInWithPassword } from '../../utils/gotrue'
import { setSessionCookie } from '../../utils/session'

const body = z.object({
  email: z.email(),
  password: z.string().min(1),
})

export default defineEventHandler(async (event) => {
  const input = body.safeParse(await readBody(event))
  if (!input.success) {
    throw createError({ statusCode: 400, statusMessage: 'An email address and a password are required' })
  }

  const email = normaliseLoginEmail(input.data.email)
  const session = await signInWithPassword(email, input.data.password)

  // A login with no account row means "not set up yet", so the login path creates it. That is
  // the whole of the cleanup story for a half-finished sign-up (ADR 0007). If that sign-up was
  // the one meant to claim the install, the repaired Account claims it, so a repair never leaves
  // the install without an Owner.
  let account = await findAccountByAuthUserId(session.user.id)
  if (!account) {
    account = await createAccount({
      authUserId: session.user.id,
      email,
      isOwner: !(await installHasOwner()),
    })
  }

  setSessionCookie(event, session)
  return { account: { id: account.id, email: account.email, isOwner: account.isOwner } }
})
