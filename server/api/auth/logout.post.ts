import { clearSessionCookie } from '../../utils/session'

export default defineEventHandler((event) => {
  clearSessionCookie(event)
  return { ok: true }
})
