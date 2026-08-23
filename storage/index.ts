import { config } from '../core/config'
import { filesystemDriver } from './filesystem'
import { s3Driver } from './s3'
import type { StorageDriver } from './types'

export { assertValidKey, StorageKeyError } from './types'
export type { StorageDriver } from './types'
export { StorageDriverNotImplementedError } from './s3'
export { filesystemDriver } from './filesystem'
export { s3Driver } from './s3'

let cached: StorageDriver | undefined

/** The driver named by `STORAGE_DRIVER`, built once per process. */
export function storage(): StorageDriver {
  if (!cached) {
    const { STORAGE_DRIVER, STORAGE_FILESYSTEM_ROOT } = config()
    cached = STORAGE_DRIVER === 's3' ? s3Driver() : filesystemDriver(STORAGE_FILESYSTEM_ROOT)
  }
  return cached
}

/** Test-only. Drops the memoised driver so a test can change `STORAGE_DRIVER` under it. */
export function resetStorageForTests(): void {
  cached = undefined
}
