import { installIsUnclaimed } from '~~/core/account'

/** Tells the sign-in page whether the install still has an Owner to claim. */
export default defineEventHandler(async () => {
  return { unclaimed: await installIsUnclaimed() }
})
