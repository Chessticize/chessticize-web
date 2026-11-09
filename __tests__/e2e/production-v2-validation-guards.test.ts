import { describe, expect, it } from 'vitest'
import { assertSafeImportRefreshCandidate, findRefreshableProfile, type ImportStatusPayload } from '@/e2e/production-v2-validation-guards'

function payload(profile: ImportStatusPayload['profiles'][number]): ImportStatusPayload {
  return {
    summary: {
      has_imported_games: false,
    },
    profiles: [profile],
  }
}

describe('production v2 validation guards', () => {
  it('accepts a single not-started profile with zero import progress', () => {
    const status = payload({
      profile_id: 'profile-safe',
      status: 'not_started',
      games_fetched: 0,
      games_imported: 0,
      games_analyzed: 0,
      puzzles_generated: 0,
    })

    expect(() => assertSafeImportRefreshCandidate(status)).not.toThrow()
    expect(findRefreshableProfile(status)?.profile_id).toBe('profile-safe')
  })

  it('accepts a single failed profile with zero import progress', () => {
    expect(() => assertSafeImportRefreshCandidate(payload({
      profile_id: 'profile-safe',
      status: 'failed',
    }))).not.toThrow()
  })

  it('rejects accounts that already have imported games', () => {
    expect(() => assertSafeImportRefreshCandidate({
      summary: {
        has_imported_games: true,
      },
      profiles: [
        {
          profile_id: 'profile-imported',
          status: 'not_started',
        },
      ],
    })).toThrow('no imported games')
  })

  it('rejects missing, multiple, or unidentified profiles', () => {
    expect(() => assertSafeImportRefreshCandidate({ profiles: [] })).toThrow('exactly one connected')
    expect(() => assertSafeImportRefreshCandidate({
      profiles: [
        { profile_id: 'profile-one', status: 'not_started' },
        { profile_id: 'profile-two', status: 'not_started' },
      ],
    })).toThrow('exactly one connected')
    expect(() => assertSafeImportRefreshCandidate(payload({ status: 'not_started' }))).toThrow('profile_id')
  })

  it('rejects active, complete, and unknown import statuses', () => {
    for (const status of ['queued', 'running', 'complete', undefined]) {
      expect(() => assertSafeImportRefreshCandidate(payload({
        profile_id: `profile-${status || 'missing'}`,
        status,
      }))).toThrow('not_started or failed')
    }
  })

  it('rejects any nonzero import progress counter', () => {
    for (const counter of ['games_fetched', 'games_imported', 'games_analyzed', 'puzzles_generated'] as const) {
      expect(() => assertSafeImportRefreshCandidate(payload({
        profile_id: `profile-${counter}`,
        status: 'not_started',
        [counter]: 1,
      }))).toThrow('zero import progress')
    }
  })
})
