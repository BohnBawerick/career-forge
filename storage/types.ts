/**
 * Sources and generated Documents are bytes on a volume, not rows (ADR 0005). Everything that
 * reads or writes them goes through this interface, so the filesystem can be swapped for S3
 * without a caller changing.
 */
export interface StorageDriver {
  readonly name: 'filesystem' | 's3'
  put(key: string, data: Uint8Array): Promise<void>
  get(key: string): Promise<Uint8Array>
  exists(key: string): Promise<boolean>
  delete(key: string): Promise<void>
}

export class StorageKeyError extends Error {}

/**
 * Keys are relative posix paths. Anything that could climb out of the root is refused here
 * rather than in each driver, because the S3 driver has no filesystem to catch it later.
 */
export function assertValidKey(key: string): void {
  if (key.length === 0) throw new StorageKeyError('Storage key is empty')
  if (key.startsWith('/')) throw new StorageKeyError(`Storage key must be relative: ${key}`)
  if (key.includes('\\')) throw new StorageKeyError(`Storage key must use forward slashes: ${key}`)
  if (key.includes('\0')) throw new StorageKeyError('Storage key contains a null byte')
  if (key.split('/').some(segment => segment === '..' || segment === '.' || segment === '')) {
    throw new StorageKeyError(`Storage key has an unusable path segment: ${key}`)
  }
}
