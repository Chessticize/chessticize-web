export type ImportStatusPayload = {
  summary?: {
    has_imported_games?: boolean
  }
  profiles?: Array<{
    profile_id?: string
    status?: string
    games_fetched?: number
    games_imported?: number
    games_analyzed?: number
    puzzles_generated?: number
  }>
}

export function assertSafeImportRefreshCandidate(statusPayload: ImportStatusPayload) {
  if (statusPayload.summary?.has_imported_games) {
    throw new Error('Game Review import refresh validation requires a dedicated profile with no imported games.')
  }
  const profiles = statusPayload.profiles || []
  if (profiles.length !== 1) {
    throw new Error('Game Review import refresh validation requires exactly one connected validation profile.')
  }
  const profile = profiles[0]
  if (!profile.profile_id) {
    throw new Error('Game Review import refresh validation requires a profile_id.')
  }
  if (!['not_started', 'failed'].includes(profile.status || '')) {
    throw new Error('Game Review import refresh validation requires a not_started or failed import status.')
  }
  if (
    Number(profile.games_fetched || 0) > 0
    || Number(profile.games_imported || 0) > 0
    || Number(profile.games_analyzed || 0) > 0
    || Number(profile.puzzles_generated || 0) > 0
  ) {
    throw new Error('Game Review import refresh validation requires a profile with zero import progress.')
  }
}

export function findRefreshableProfile(statusPayload: ImportStatusPayload) {
  return statusPayload.profiles?.[0]
}
