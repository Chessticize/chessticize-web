import { existsSync } from 'node:fs'

export function resolveProductionStorageState(
  storageStatePath = process.env.PROD_PLAYWRIGHT_STORAGE_STATE,
  fileExists: (path: string) => boolean = existsSync,
) {
  if (!storageStatePath) {
    return undefined
  }

  if (!fileExists(storageStatePath)) {
    throw new Error(
      `PROD_PLAYWRIGHT_STORAGE_STATE points to a missing file: ${storageStatePath}. ` +
      'Create a signed-in storage state first or unset the variable and use PROD_AUTH_TOKEN.',
    )
  }

  return storageStatePath
}
