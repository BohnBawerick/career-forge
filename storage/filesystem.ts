import type { Stats } from 'node:fs'
import { mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { assertValidKey, type StorageDriver } from './types'

/**
 * The stats of a stored object, or undefined when nothing is stored under the key.
 *
 * Keys name objects, not folders. `put('sources/one.txt', ...)` leaves a `sources` directory
 * behind, but nobody stored anything at the key `sources`, and S3 would answer that key with
 * nothing, so neither does this driver.
 */
async function statObject(path: string): Promise<Stats | undefined> {
  try {
    const stats = await stat(path)
    return stats.isFile() ? stats : undefined
  }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
    return undefined
  }
}

/**
 * The default driver. One volume on disk, which makes a backup two things: a database dump and
 * a folder (ADR 0005).
 */
export function filesystemDriver(root: string): StorageDriver {
  const base = resolve(root)

  const pathFor = (key: string): string => {
    assertValidKey(key)
    return join(base, key)
  }

  return {
    name: 'filesystem',

    async put(key, data) {
      const path = pathFor(key)
      await mkdir(dirname(path), { recursive: true })
      await writeFile(path, data)
    },

    async get(key) {
      return new Uint8Array(await readFile(pathFor(key)))
    },

    async exists(key) {
      return (await statObject(pathFor(key))) !== undefined
    },

    async delete(key) {
      const path = pathFor(key)
      if (await statObject(path)) await rm(path, { force: true })
    },
  }
}
