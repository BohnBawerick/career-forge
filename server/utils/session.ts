import type { H3Event } from 'h3'
import { findAccountByAuthUserId } from '~~/core/account'
import type { Account } from '~~/db/schema'
import { authUserIdFromToken, type GoTrueSession } from './gotrue'

/**
 * The session token is an httpOnly cookie set by Nitro, not `localStorage`, so page scripts
 * cannot read it and server-side rendering works (ADR 0007).
 */
export const SESSION_COOKIE = 'cf_session'

export function setSessionCookie(event: H3Event, session: GoTrueSession): void {
  setCookie(event, SESSION_COOKIE, session.access_token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure: !import.meta.dev,
    maxAge: session.expires_in,
  })
}

export function clearSessionCookie(event: H3Event): void {
  deleteCookie(event, SESSION_COOKIE, { path: '/' })
}

/** The signed-in Account, or `undefined` when there is no usable cookie. */
export async function currentAccount(event: H3Event): Promise<Account | undefined> {
  const token = getCookie(event, SESSION_COOKIE)
  if (!token) return undefined
  try {
    return await findAccountByAuthUserId(await authUserIdFromToken(token))
  }
  catch {
    return undefined
  }
}
