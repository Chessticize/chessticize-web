import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const workflowText = readFileSync('.github/workflows/playwright-smoke.yml', 'utf8')

describe('Playwright smoke workflow triggers', () => {
  it('runs when migrated auth, v2 API, or Playwright config surfaces change', () => {
    for (const path of [
      'app/auth/**',
      'app/settings/**',
      'app/dashboard/**',
      'app/game-review/**',
      'app/games/**',
      'app/puzzles/**',
      'app/puzzle-sprint/**',
      'app/review-queue/**',
      '.codex/skills/**',
      '__tests__/ci/**',
      '__tests__/e2e/**',
      'components/auth/**',
      'lib/config.ts',
      'lib/env.ts',
      'lib/api/**',
      'lib/auth/**',
      'lib/firebase/**',
      'playwright.config.ts',
      'playwright.production.config.ts',
    ]) {
      expect(workflowText.match(new RegExp(`- '${escapeRegExp(path)}'`, 'g'))).toHaveLength(2)
    }
    expect(workflowText).toContain('pnpm exec vitest __tests__/ci --run')
    expect(workflowText).toContain('pnpm test:prod-validation-guards')
  })
})

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
