import { SignJWT, jwtVerify } from 'jose'
import { config } from './config'

/**
 * The client for GoTrue's HTTP API (ADR 0005). It lives in `core/` because the sign-up screens,
 * the worker and the seed script all have to reach the same service, and only `server/` has h3
 * to throw with.
 *
 * career-forge owns the front door: GoTrue's own public sign-up is off and every
 * account-creating call goes through the admin API from here (ADR 0007).
 */

export class GoTrueError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message)
    this.name = 'GoTrueError'
  }
}

export interface GoTrueUser {
  id: string
  email?: string
}

export interface GoTrueSession {
  access_token: string
  refresh_token: string
  expires_in: number
  user: GoTrueUser
}

function secret(): Uint8Array {
  return new TextEncoder().encode(config().GOTRUE_JWT_SECRET)
}

/**
 * The service key is derived from the shared JWT secret rather than kept as a second variable,
 * so there is one secret to look after and nothing to paste wrongly. It is minted per call,
 * lives for a minute, and never leaves the server.
 */
export async function serviceRoleToken(): Promise<string> {
  return new SignJWT({ role: 'service_role' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuer('career-forge')
    .setSubject('service_role')
    .setAudience('authenticated')
    .setIssuedAt()
    .setExpirationTime('60s')
    .sign(secret())
}

async function call<T>(path: string, init: RequestInit & { admin?: boolean } = {}): Promise<T> {
  const { admin, ...rest } = init
  const headers = new Headers(rest.headers)
  headers.set('Content-Type', 'application/json')
  if (admin) headers.set('Authorization', `Bearer ${await serviceRoleToken()}`)

  let response: Response
  try {
    response = await fetch(`${config().GOTRUE_URL.replace(/\/$/, '')}${path}`, { ...rest, headers })
  }
  catch (cause) {
    throw new GoTrueError(503, `GoTrue is not answering at ${config().GOTRUE_URL}: ${String(cause)}`)
  }

  const body = (await response.json().catch(() => ({}))) as Record<string, unknown>

  if (!response.ok) {
    const described
      = typeof body.error_description === 'string'
        ? body.error_description
        : typeof body.msg === 'string'
          ? body.msg
          : `GoTrue refused ${path} with ${response.status}`
    throw new GoTrueError(response.status, described)
  }
  return body as T
}

/** Creates the login. Called only once career-forge has decided the person may have one. */
export function createGoTrueUser(email: string, password: string): Promise<GoTrueUser> {
  return call<GoTrueUser>('/admin/users', {
    admin: true,
    method: 'POST',
    // There is no mail server, so the address is confirmed on creation (ADR 0007).
    body: JSON.stringify({ email, password, email_confirm: true }),
  })
}

export function deleteGoTrueUser(id: string): Promise<unknown> {
  return call(`/admin/users/${id}`, { admin: true, method: 'DELETE' })
}

export function signInWithPassword(email: string, password: string): Promise<GoTrueSession> {
  return call<GoTrueSession>('/token?grant_type=password', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
}

/** Verifies an access token GoTrue issued and returns the `auth.users` id it carries. */
export async function authUserIdFromToken(token: string): Promise<string> {
  const { payload } = await jwtVerify(token, secret())
  if (typeof payload.sub !== 'string' || payload.sub.length === 0) {
    throw new GoTrueError(401, 'Token carries no subject')
  }
  return payload.sub
}
