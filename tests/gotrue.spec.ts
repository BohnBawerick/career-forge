import { SignJWT } from 'jose'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { resetConfigForTests } from '../core/config'
import { authUserIdFromToken, serviceRoleToken } from '../core/gotrue'

const SECRET = 'a-fabricated-secret-long-enough-for-the-schema'
const before = { ...process.env }

beforeAll(() => {
  process.env.DATABASE_URL = 'postgres://nobody@127.0.0.1:5432/nothing'
  process.env.GOTRUE_URL = 'http://127.0.0.1:9999'
  process.env.GOTRUE_JWT_SECRET = SECRET
  resetConfigForTests()
})

afterAll(() => {
  process.env = { ...before }
  resetConfigForTests()
})

function sessionToken(subject: string, claims: Record<string, string> = {}) {
  return new SignJWT({ role: 'authenticated', ...claims })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuer('http://127.0.0.1:9999')
    .setSubject(subject)
    .setAudience('authenticated')
    .setIssuedAt()
    .setExpirationTime('60s')
    .sign(new TextEncoder().encode(SECRET))
}

describe('authUserIdFromToken', () => {
  it('accepts a login token and returns the auth.users id', async () => {
    const id = '00000000-0000-4000-8000-000000000001'
    await expect(authUserIdFromToken(await sessionToken(id))).resolves.toBe(id)
  })

  it('refuses the service key, which shares the same signing secret', async () => {
    await expect(authUserIdFromToken(await serviceRoleToken())).rejects.toThrow(
      'A service key is not a session',
    )
  })

  it('refuses a token minted for another audience', async () => {
    const wrongAudience = await new SignJWT({ role: 'authenticated' })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuer('http://127.0.0.1:9999')
      .setSubject('00000000-0000-4000-8000-000000000002')
      .setAudience('somewhere-else')
      .setIssuedAt()
      .setExpirationTime('60s')
      .sign(new TextEncoder().encode(SECRET))

    await expect(authUserIdFromToken(wrongAudience)).rejects.toThrow()
  })
})
