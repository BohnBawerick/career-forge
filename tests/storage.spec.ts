import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { filesystemDriver } from '../storage/filesystem'
import { s3Driver } from '../storage/s3'
import { assertValidKey, StorageKeyError } from '../storage/types'

describe('the filesystem driver', () => {
  let root: string

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'career-forge-storage-'))
  })

  afterEach(async () => {
    await rm(root, { recursive: true, force: true })
  })

  it('round-trips bytes under a nested key', async () => {
    const driver = filesystemDriver(root)
    const bytes = new TextEncoder().encode('a fabricated Source')

    await driver.put('sources/2026/one.txt', bytes)

    expect(await driver.exists('sources/2026/one.txt')).toBe(true)
    expect(await driver.get('sources/2026/one.txt')).toEqual(bytes)
    expect(await readFile(join(root, 'sources/2026/one.txt'), 'utf8')).toBe('a fabricated Source')
  })

  it('reports a missing key as absent and deletes without complaint', async () => {
    const driver = filesystemDriver(root)

    expect(await driver.exists('nothing/here')).toBe(false)
    await expect(driver.delete('nothing/here')).resolves.toBeUndefined()
  })

  it('does not report the directory a key sits in as a stored object', async () => {
    const driver = filesystemDriver(root)

    await driver.put('sources/2026/one.txt', new TextEncoder().encode('a fabricated Source'))

    expect(await driver.exists('sources')).toBe(false)
    expect(await driver.exists('sources/2026')).toBe(false)
    await expect(driver.delete('sources')).resolves.toBeUndefined()
    expect(await driver.exists('sources/2026/one.txt')).toBe(true)
  })

  it('reports a failure that is not a missing key rather than answering false', async () => {
    const driver = filesystemDriver(root)

    await driver.put('sources/one.txt', new TextEncoder().encode('a fabricated Source'))

    await expect(driver.exists('sources/one.txt/child')).rejects.toThrow(/ENOTDIR/)
    await expect(driver.delete('sources/one.txt/child')).rejects.toThrow(/ENOTDIR/)
  })

  it('refuses a key that would climb out of the root', async () => {
    const driver = filesystemDriver(root)

    await expect(driver.put('../escaped', new Uint8Array())).rejects.toBeInstanceOf(StorageKeyError)
  })
})

describe('key validation', () => {
  it.each(['', '/absolute', 'up/../out', 'back\\slash', 'double//slash', 'trailing/'])(
    'rejects %j',
    (key) => {
      expect(() => assertValidKey(key)).toThrow(StorageKeyError)
    },
  )

  it('accepts an ordinary relative key', () => {
    expect(() => assertValidKey('sources/2026/one.txt')).not.toThrow()
  })
})

describe('the s3 driver', () => {
  it('is a declared switch that is not implemented yet', async () => {
    await expect(s3Driver().get('sources/one.txt')).rejects.toThrow(/not implemented yet/)
  })
})
