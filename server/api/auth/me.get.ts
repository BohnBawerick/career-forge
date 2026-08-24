import { currentAccount } from '../../utils/session'

export default defineEventHandler(async (event) => {
  const account = await currentAccount(event)
  if (!account) return { account: null }
  return { account: { id: account.id, email: account.email, isOwner: account.isOwner } }
})
