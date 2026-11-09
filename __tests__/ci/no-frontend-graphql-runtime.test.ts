import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const runtimeArtifactPaths = [
  'lib/api/graphql.ts',
  'hooks/useGameReviewStats.ts',
  '__tests__/integration/graphql.test.ts',
  'docs/graphql',
  'docs/graphql-examples.md',
  'docs/GRAPHQL_EXAMPLES.md',
  'game-review-graphql-analysis.md',
]

const runtimeSearchRoots = [
  'app',
  'components',
  'hooks',
  'lib',
]

describe('frontend GraphQL runtime retirement', () => {
  it('does not ship retired GraphQL runtime artifacts', () => {
    for (const path of runtimeArtifactPaths) {
      expect(existsSync(path), `${path} should stay retired`).toBe(false)
    }
  })

  it('does not reintroduce frontend GraphQL client imports or endpoint config', () => {
    const offenders: string[] = []

    for (const filePath of listSourceFiles(runtimeSearchRoots)) {
      const text = readFileSync(filePath, 'utf8')
      if (
        /graphqlRequest|GRAPHQL_ENDPOINT|ENDPOINTS\.GRAPHQL|\/graphql\/query|from ['"].*graphql/.test(text)
      ) {
        offenders.push(filePath)
      }
    }

    expect(offenders).toEqual([])
  })
})

function listSourceFiles(roots: string[]): string[] {
  const files: string[] = []

  for (const root of roots) {
    collect(root, files)
  }

  return files
}

function collect(path: string, files: string[]) {
  if (!existsSync(path)) return

  const stat = statSync(path)
  if (stat.isFile()) {
    if (/\.(ts|tsx)$/.test(path)) files.push(path)
    return
  }

  if (!stat.isDirectory()) return

  for (const entry of readdirSync(path)) {
    if (entry === 'node_modules' || entry === '.next') continue
    collect(join(path, entry), files)
  }
}
