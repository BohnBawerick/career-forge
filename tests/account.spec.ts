import { describe, expect, it } from 'vitest'
import { normaliseLoginEmail } from '../core/account'

describe('normaliseLoginEmail', () => {
  it('folds case and trims, so one person cannot hold two Accounts', () => {
    expect(normaliseLoginEmail('  Owner@Example.COM ')).toBe('owner@example.com')
  })

  it('leaves an already normal address alone', () => {
    expect(normaliseLoginEmail('member@example.com')).toBe('member@example.com')
  })
})
