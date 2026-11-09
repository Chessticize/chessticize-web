import { describe, expect, it } from 'vitest'
import { resolveProductionStorageState } from '@/e2e/production-v2-config'

describe('production v2 Playwright config', () => {
  it('does not configure storage state when the operator uses token auth', () => {
    expect(resolveProductionStorageState('', () => false)).toBeUndefined()
    expect(resolveProductionStorageState(undefined, () => false)).toBeUndefined()
  })

  it('uses the configured signed-in storage state when it exists', () => {
    expect(resolveProductionStorageState('/tmp/signed-in-storage-state.json', () => true))
      .toBe('/tmp/signed-in-storage-state.json')
  })

  it('fails fast when the configured signed-in storage state is missing', () => {
    expect(() => resolveProductionStorageState('/tmp/missing-storage-state.json', () => false))
      .toThrow('PROD_PLAYWRIGHT_STORAGE_STATE points to a missing file')
  })
})
