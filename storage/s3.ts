import { assertValidKey, type StorageDriver } from './types'

export class StorageDriverNotImplementedError extends Error {
  constructor() {
    super(
      'The S3 storage driver is not implemented yet. Set STORAGE_DRIVER=filesystem, or send a patch.',
    )
  }
}

/**
 * The switch ADR 0005 asks for, in the same shape as the provider layer's server-key mode: the
 * seam exists from the first commit so that hosting can be added without moving callers, and it
 * refuses loudly rather than pretending to work.
 */
export function s3Driver(): StorageDriver {
  const refuse = async (key?: string): Promise<never> => {
    if (key !== undefined) assertValidKey(key)
    throw new StorageDriverNotImplementedError()
  }

  return {
    name: 's3',
    put: key => refuse(key),
    get: key => refuse(key),
    exists: key => refuse(key),
    delete: key => refuse(key),
  }
}
