import 'dotenv/config'
import { createAccount, findAccountByEmail, installIsUnclaimed, normaliseLoginEmail } from '../core/account'
import { createGoTrueUser, GoTrueError } from '../core/gotrue'
import { closeDb } from '../db/client'

/**
 * Fabricated data only. This repository is public and no real personal data ever lands in it,
 * so everything below is invented and the address is on a domain reserved for examples.
 *
 *   pnpm seed
 *
 * Later tickets add a Bank to this: Roles, Projects and Evidence for the same Account.
 */
const SEED_OWNER = {
  email: 'owner@example.com',
  password: 'forge-a-better-password',
}

async function main(): Promise<void> {
  const email = normaliseLoginEmail(SEED_OWNER.email)

  if (await findAccountByEmail(email)) {
    console.log(`Account ${email} is already seeded. Nothing to do.`)
    return
  }

  // The same gate the sign-up route enforces: the first Account claims the install and sign-up
  // closes behind it (ADR 0007). Seeding past that would leave two Owners.
  if (!(await installIsUnclaimed())) {
    throw new Error('This install has an Owner already, so there is nothing to seed. Drop the volume and start again to seed a fresh one.')
  }

  const user = await createGoTrueUser(email, SEED_OWNER.password).catch((error: unknown) => {
    if (error instanceof GoTrueError && error.status === 422) {
      throw new Error(`GoTrue already holds a login for ${email}, but no Account points at it. Drop the volume and start again.`)
    }
    throw error
  })

  const account = await createAccount({ authUserId: user.id, email, isOwner: true })

  console.log(`Seeded Owner ${account.email} (${account.id}).`)
  console.log(`Password: ${SEED_OWNER.password}`)
}

main()
  .catch((error: unknown) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(() => closeDb())
