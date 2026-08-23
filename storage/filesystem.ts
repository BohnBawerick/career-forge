import { mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { assertValidKey, type StorageDriver } from './types'

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
      try {
        await stat(pathFor(key))
        return true
      }
      catch {
        return false
      }
    },

    async delete(key) {
      await rm(pathFor(key), { force: true })
    },
  }
}
