import { DrizzleQueryError } from 'drizzle-orm/errors'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { findOrCreateAccountForLogin, isOwnerAlreadyTaken, normaliseLoginEmail } from '../core/account'

interface AccountRow {
  id: string
  authUserId: string
  email: string
  isOwner: boolean
}

/**
 * The database stands in for the races these functions exist to answer: `selects` is what each
 * read returns in order, `inserts` is what each write does. Both are queues, so a test spells
 * out the exact interleaving it is reproducing.
 */
const fake = vi.hoisted(() => ({
  selects: [] as unknown[][],
  inserts: [] as Array<() => unknown[]>,
  written: [] as Array<Record<string, unknown>>,
}))

vi.mock('../db/client', () => {
  const read = {
    from: () => read,
    where: () => read,
    limit: () => Promise.resolve(fake.selects.shift() ?? []),
  }
  return {
    db: () => ({
      select: () => read,
      insert: () => ({
        values: (values: Record<string, unknown>) => ({
          returning: () => {
            fake.written.push(values)
            const next = fake.inserts.shift()
            if (!next) throw new Error('The code under test wrote more times than the test expected')
            return Promise.resolve(next())
          },
        }),
      }),
    }),
  }
})

/** What Postgres raises on a duplicate, as drizzle hands it on: wrapped, with the pg error inside. */
function uniqueViolation(constraint: string): Error {
  const pg = Object.assign(new Error(`duplicate key value violates unique constraint "${constraint}"`), {
    code: '23505',
    constraint,
  })
  return new DrizzleQueryError('insert into "account" ...', [], pg)
}

const ROW: AccountRow = {
  id: '11111111-1111-1111-1111-111111111111',
  authUserId: '22222222-2222-2222-2222-222222222222',
  email: 'owner@example.com',
  isOwner: true,
}

beforeEach(() => {
  fake.selects.length = 0
  fake.inserts.length = 0
  fake.written.length = 0
})

describe('normaliseLoginEmail', () => {
  it('folds case and trims, so one person cannot hold two Accounts', () => {
    expect(normaliseLoginEmail('  Owner@Example.COM ')).toBe('owner@example.com')
  })

  it('leaves an already normal address alone', () => {
    expect(normaliseLoginEmail('member@example.com')).toBe('member@example.com')
  })
})

describe('isOwnerAlreadyTaken', () => {
  it('reads through the wrapper drizzle puts around the error Postgres raised', () => {
    expect(isOwnerAlreadyTaken(uniqueViolation('account_one_owner'))).toBe(true)
  })

  it('is false for a duplicate on some other index', () => {
    expect(isOwnerAlreadyTaken(uniqueViolation('account_email_unique'))).toBe(false)
  })

  it('is false for an error that is not a duplicate at all', () => {
    expect(isOwnerAlreadyTaken(new Error('the connection went away'))).toBe(false)
  })
})

describe('findOrCreateAccountForLogin', () => {
  it('returns the row that is already there without writing', async () => {
    fake.selects.push([ROW])

    expect(await findOrCreateAccountForLogin(ROW.authUserId, ROW.email)).toEqual(ROW)
    expect(fake.written).toEqual([])
  })

  it('claims the install when the sign-up that should have written the Account did not', async () => {
    fake.selects.push([], [])
    fake.inserts.push(() => [ROW])

    expect(await findOrCreateAccountForLogin(ROW.authUserId, ROW.email)).toEqual(ROW)
    expect(fake.written[0]).toMatchObject({ isOwner: true })
  })

  it('returns the winner row when another repair wrote the Account first', async () => {
    fake.selects.push([], [], [ROW])
    fake.inserts.push(() => {
      throw uniqueViolation('account_auth_user_id_unique')
    })

    expect(await findOrCreateAccountForLogin(ROW.authUserId, ROW.email)).toEqual(ROW)
  })

  it('retries as a non-Owner when another repair claimed the install first', async () => {
    const member = { ...ROW, isOwner: false }
    fake.selects.push([], [], [], [{ id: 'someone-else' }])
    fake.inserts.push(
      () => {
        throw uniqueViolation('account_one_owner')
      },
      () => [member],
    )

    expect(await findOrCreateAccountForLogin(ROW.authUserId, ROW.email)).toEqual(member)
    expect(fake.written[0]).toMatchObject({ isOwner: true })
    expect(fake.written[1]).toMatchObject({ isOwner: false })
  })

  it('gives up rather than looping when the duplicate never resolves', async () => {
    fake.selects.push([], [], [], [], [], [])
    fake.inserts.push(
      () => {
        throw uniqueViolation('account_auth_user_id_unique')
      },
      () => {
        throw uniqueViolation('account_auth_user_id_unique')
      },
      () => {
        throw uniqueViolation('account_auth_user_id_unique')
      },
    )

    await expect(findOrCreateAccountForLogin(ROW.authUserId, ROW.email)).rejects.toThrow(/Could not create the Account/)
  })

  it('lets an error that is not a duplicate travel', async () => {
    fake.selects.push([], [])
    fake.inserts.push(() => {
      throw new Error('the connection went away')
    })

    await expect(findOrCreateAccountForLogin(ROW.authUserId, ROW.email)).rejects.toThrow('the connection went away')
  })
})
