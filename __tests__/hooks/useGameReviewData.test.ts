import { act, renderHook, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import { useGameReviewData } from '@/hooks/useGameReviewData'
import { apiGet, apiPost } from '@/lib/auth/api-client'
import { useUserContext } from '@/hooks/useUserContext'

vi.mock('@/lib/auth/api-client', () => ({
  apiGet: vi.fn(),
  apiPost: vi.fn()
}))

vi.mock('@/hooks/useUserContext', () => ({
  useUserContext: vi.fn()
}))

describe('useGameReviewData', () => {
  const mockApiGet = vi.mocked(apiGet)
  const mockApiPost = vi.mocked(apiPost)
  const mockUseUserContext = vi.mocked(useUserContext)

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetches v2 game review insights for the profile with imported games', async () => {
    mockUseUserContext.mockReturnValue({
      user: {
        id: 'user-1',
        email: 'user@example.com',
        registered_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
        last_sign_in_at: '2026-01-01T00:00:00Z',
        chess_profiles: [
          profile({ platform: 'chess.com', username: 'low-volume', games_fetched: 3 }),
          profile({ platform: 'lichess.org', username: 'main-user', games_fetched: 20 })
        ]
      },
      isLoading: false,
      error: null,
      refreshUser: vi.fn(),
      updateChessProfiles: vi.fn()
    })
    mockApiGet.mockImplementation(async (url: string) => okResponse(v2ResponseForUrl(url)))

    const { result } = renderHook(() => useGameReviewData())

    await waitFor(() => {
      expect(result.current.data?.summary?.totalGamesAnalyzed).toBe(12)
    })

    const requestedUrl = new URL(mockApiGet.mock.calls[0][0])
    expect(requestedUrl.pathname).toBe('/api/v2/me/insights/game-review')
    expect(requestedUrl.searchParams.get('platform')).toBe('lichess.org')
    expect(requestedUrl.searchParams.get('username')).toBe('main-user')
    expect(requestedUrl.searchParams.get('group_by')).toBe('week')
    expect(requestedUrl.searchParams.get('include_stats_bundle')).toBe('true')
    expect(result.current.data?.summary?.recognitionRate).toBeCloseTo(60)
    expect(result.current.data?.opponentMistakesMissed3M?.tag_counts).toEqual([
      { tag: 'fork', count: 4 }
    ])
    expect(result.current.data?.opponentMistakesCaught3M?.tag_counts).toEqual([
      { tag: 'fork', count: 6 }
    ])
    expect(result.current.data?.opponentMistakesMissed3M?.game_move_buckets).toEqual([
      { name: 'Early middlegame', min_move: 13, max_move: 20, count: 4 }
    ])
    expect(result.current.data?.opponentMistakesCaught3M?.user_color_counts).toEqual([
      { color: 'black', count: 6 }
    ])
    expect(result.current.data?.opponentMistakesTimeSeries?.nodes).toHaveLength(2)
    expect(result.current.data?.myMistakesTimeSeries?.nodes).toHaveLength(2)
    expect(result.current.data?.summary?.weeklyTrend).toBeCloseTo(25)
    expect(result.current.data?.summary?.mistakesPerGameTrend).toBeCloseTo(1)
    expect(mockApiGet).toHaveBeenCalledTimes(1)
    expect(mockApiGet.mock.calls.some(([url]) => {
      const requestedUrl = new URL(url)
      return requestedUrl.pathname === '/api/v2/me/stats/puzzles'
    })).toBe(false)
  })

  it('surfaces an error when the v2 insights response is missing the required stats bundle', async () => {
    mockUseUserContext.mockReturnValue({
      user: {
        id: 'user-1',
        email: 'user@example.com',
        registered_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
        last_sign_in_at: '2026-01-01T00:00:00Z',
        chess_profiles: [
          profile({ platform: 'lichess.org', username: 'main-user', games_fetched: 20 })
        ]
      },
      isLoading: false,
      error: null,
      refreshUser: vi.fn(),
      updateChessProfiles: vi.fn()
    })
    mockApiGet.mockImplementation(async (url: string) => {
      const requestedUrl = new URL(url)
      if (requestedUrl.pathname === '/api/v2/me/insights/game-review') {
        return okResponse(v2InsightsWithoutStatsBundle())
      }
      return okResponse(v2ResponseForUrl(url))
    })

    const { result } = renderHook(() => useGameReviewData())

    await waitFor(() => {
      expect(result.current.error).toBe('Game review stats bundle is missing from the v2 response')
    })

    expect(mockApiGet).toHaveBeenCalledTimes(1)
    expect(new URL(mockApiGet.mock.calls[0][0]).pathname).toBe('/api/v2/me/insights/game-review')
    expect(result.current.data).toBeNull()
  })

  it('does not fetch when the user has no chess profiles', async () => {
    mockUseUserContext.mockReturnValue({
      user: {
        id: 'user-1',
        email: 'user@example.com',
        registered_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
        last_sign_in_at: '2026-01-01T00:00:00Z',
        chess_profiles: []
      },
      isLoading: false,
      error: null,
      refreshUser: vi.fn(),
      updateChessProfiles: vi.fn()
    })

    const { result } = renderHook(() => useGameReviewData())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })
    expect(mockApiGet).not.toHaveBeenCalled()
    expect(result.current.data).toBeNull()
    expect(result.current.error).toBeNull()
  })

  it('fetches import status when connected profiles have no imported games yet', async () => {
    mockUseUserContext.mockReturnValue({
      user: {
        id: 'user-1',
        email: 'user@example.com',
        registered_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
        last_sign_in_at: '2026-01-01T00:00:00Z',
        chess_profiles: [
          profile({ platform: 'lichess.org', username: 'pending-user', games_fetched: 0 })
        ]
      },
      isLoading: false,
      error: null,
      refreshUser: vi.fn(),
      updateChessProfiles: vi.fn()
    })
    mockApiGet.mockResolvedValue(okResponse(v2ImportStatus('queued')))

    const { result } = renderHook(() => useGameReviewData())

    await waitFor(() => {
      expect(result.current.importStatus?.summary.status).toBe('queued')
    })
    expect(mockApiGet).toHaveBeenCalledTimes(1)
    expect(new URL(mockApiGet.mock.calls[0][0]).pathname).toBe('/api/v2/me/import-status')
    expect(result.current.data).toBeNull()
    expect(result.current.error).toBeNull()
  })

  it('starts a v2 import refresh and refetches import status', async () => {
    mockUseUserContext.mockReturnValue({
      user: {
        id: 'user-1',
        email: 'user@example.com',
        registered_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
        last_sign_in_at: '2026-01-01T00:00:00Z',
        chess_profiles: [
          profile({ platform: 'lichess.org', username: 'pending-user', games_fetched: 0 })
        ]
      },
      isLoading: false,
      error: null,
      refreshUser: vi.fn(),
      updateChessProfiles: vi.fn()
    })
    mockApiGet
      .mockResolvedValueOnce(okResponse(v2ImportStatus('not_started')))
      .mockResolvedValueOnce(okResponse(v2ImportJob()))
      .mockResolvedValueOnce(okResponse(v2ImportStatus('queued')))
    mockApiPost.mockResolvedValue(okResponse({
      job_id: 'job-1',
      status: 'queued',
      task_status: 'pending',
      profile_id: 'lichess.org-pending-user',
      platform: 'lichess.org',
      username: 'pending-user',
      games_imported: 2,
      games_analyzed: 1,
      puzzles_generated: 0,
      created_at: '2026-05-17T10:00:00Z',
      updated_at: '2026-05-17T10:00:00Z'
    }))

    const { result } = renderHook(() => useGameReviewData())

    await waitFor(() => {
      expect(result.current.importStatus?.summary.status).toBe('not_started')
    })

    await act(async () => {
      await result.current.refreshImport()
    })

    expect(mockApiPost).toHaveBeenCalledTimes(1)
    expect(new URL(mockApiPost.mock.calls[0][0]).pathname).toBe('/api/v2/me/chess-profiles/lichess.org-pending-user:refresh')
    expect(mockApiGet).toHaveBeenCalledTimes(3)
    expect(new URL(mockApiGet.mock.calls[1][0]).pathname).toBe('/api/v2/me/import-jobs/job-1')
    expect(result.current.importJob?.games_imported).toBe(2)
    expect(result.current.importJob?.games_analyzed).toBe(1)
    expect(result.current.importJob?.puzzles_generated).toBe(0)
    expect(result.current.importStatus?.summary.status).toBe('queued')
    expect(result.current.isRefreshingImport).toBe(false)
    expect(result.current.error).toBeNull()
  })

  it('keeps the queued import job when the follow-up job read is not available yet', async () => {
    mockUseUserContext.mockReturnValue({
      user: {
        id: 'user-1',
        email: 'user@example.com',
        registered_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
        last_sign_in_at: '2026-01-01T00:00:00Z',
        chess_profiles: [
          profile({ platform: 'lichess.org', username: 'pending-user', games_fetched: 0 })
        ]
      },
      isLoading: false,
      error: null,
      refreshUser: vi.fn(),
      updateChessProfiles: vi.fn()
    })
    mockApiGet
      .mockResolvedValueOnce(okResponse(v2ImportStatus('not_started')))
      .mockRejectedValueOnce(new Error('import job not ready'))
      .mockResolvedValueOnce(okResponse(v2ImportStatus('queued')))
    mockApiPost.mockResolvedValue(okResponse({
      job_id: 'job-1',
      status: 'queued',
      task_status: 'pending',
      profile_id: 'lichess.org-pending-user',
      platform: 'lichess.org',
      username: 'pending-user',
      games_imported: 2,
      games_analyzed: 1,
      puzzles_generated: 0,
      created_at: '2026-05-17T10:00:00Z',
      updated_at: '2026-05-17T10:00:00Z'
    }))

    const { result } = renderHook(() => useGameReviewData())

    await waitFor(() => {
      expect(result.current.importStatus?.summary.status).toBe('not_started')
    })

    await act(async () => {
      await result.current.refreshImport()
    })

    expect(mockApiGet).toHaveBeenCalledTimes(3)
    expect(new URL(mockApiGet.mock.calls[1][0]).pathname).toBe('/api/v2/me/import-jobs/job-1')
    expect(result.current.importJob?.job_id).toBe('job-1')
    expect(result.current.importJob?.games_imported).toBe(2)
    expect(result.current.importStatus?.summary.status).toBe('queued')
    expect(result.current.error).toBeNull()
  })

  it('surfaces v2 request errors', async () => {
    mockUseUserContext.mockReturnValue({
      user: {
        id: 'user-1',
        email: 'user@example.com',
        registered_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
        last_sign_in_at: '2026-01-01T00:00:00Z',
        chess_profiles: [
          profile({ platform: 'lichess.org', username: 'main-user', games_fetched: 20 })
        ]
      },
      isLoading: false,
      error: null,
      refreshUser: vi.fn(),
      updateChessProfiles: vi.fn()
    })
    mockApiGet.mockResolvedValue({
      ok: false,
      status: 500,
      text: vi.fn().mockResolvedValue('server unavailable')
    } as unknown as Response)

    const { result } = renderHook(() => useGameReviewData())

    await waitFor(() => {
      expect(result.current.error).toBe('server unavailable')
    })
    expect(result.current.data).toBeNull()
  })
})

function profile(overrides: {
  platform: string
  username: string
  games_fetched: number
}) {
  return {
    id: `${overrides.platform}-${overrides.username}`,
    user_id: 'user-1',
    last_game_fetched_at: null,
    last_game_played_at: null,
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides
  }
}

function okResponse(body: unknown): Response {
  return {
    ok: true,
    status: 200,
    json: vi.fn().mockResolvedValue(body),
    text: vi.fn().mockResolvedValue('')
  } as unknown as Response
}

function v2ImportJob() {
  return {
    job_id: 'job-1',
    import_id: 'job-1',
    status: 'queued',
    task_status: 'pending',
    profile_id: 'lichess.org-pending-user',
    platform: 'lichess.org',
    username: 'pending-user',
    games_imported: 2,
    games_analyzed: 1,
    puzzles_generated: 0,
    created_at: '2026-05-17T10:00:00Z',
    updated_at: '2026-05-17T10:00:00Z'
  }
}

function v2ImportStatus(status: 'not_started' | 'queued' | 'running' | 'failed' | 'complete') {
  return {
    profiles: [
      {
        profile_id: 'lichess.org-pending-user',
        platform: 'lichess.org',
        username: 'pending-user',
        status,
        games_fetched: 0,
        games_imported: status === 'queued' ? 2 : 0,
        games_analyzed: status === 'queued' ? 1 : null,
        puzzles_generated: status === 'queued' ? 0 : null,
        task_status: status === 'not_started'
          ? undefined
          : status === 'queued'
            ? 'pending'
            : status === 'running'
              ? 'in_progress'
              : status === 'complete'
                ? 'completed'
                : 'failed'
      }
    ],
    summary: {
      status,
      has_profiles: true,
      has_imported_games: false,
      queued_count: status === 'queued' ? 1 : 0,
      running_count: status === 'running' ? 1 : 0,
      failed_count: status === 'failed' ? 1 : 0,
      complete_count: status === 'complete' ? 1 : 0,
      not_started_count: status === 'not_started' ? 1 : 0
    }
  }
}

function v2ResponseForUrl(url: string) {
  const requestedUrl = new URL(url)
  if (requestedUrl.pathname === '/api/v2/me/insights/game-review') {
    return v2Insights()
  }

  const themes = requestedUrl.searchParams.get('themes') || ''
  const isGrouped = requestedUrl.searchParams.get('group_by') === 'week'
  if (isGrouped) {
    if (themes.includes('own_mistake')) return v2MyMistakesSeriesStats()
    return v2OpponentSeriesStats()
  }
  if (themes === 'opponent_mistake_missed,opponent_blunder_missed') {
    return v2PuzzleStats({
      totalPuzzles: 4,
      tags: [{ key: 'fork', count: 4 }],
      colors: [{ key: 'white', count: 4 }],
      gameMoves: [{ key: 'Early middlegame', min_move: 13, max_move: 20, count: 4 }],
      moveLengths: [{ key: 2, count: 4 }]
    })
  }
  if (themes === 'opponent_mistake_caught,opponent_blunder_caught') {
    return v2PuzzleStats({
      totalPuzzles: 6,
      tags: [{ key: 'fork', count: 6 }],
      colors: [{ key: 'black', count: 6 }],
      gameMoves: [{ key: 'Late middlegame', min_move: 21, max_move: 30, count: 6 }],
      moveLengths: [{ key: 3, count: 6 }]
    })
  }
  return v2PuzzleStats({
    totalPuzzles: 6,
    tags: [{ key: 'pin', count: 6 }],
    colors: [{ key: 'white', count: 6 }],
    gameMoves: [{ key: 'Endgame', min_move: 31, max_move: 999, count: 6 }],
    moveLengths: [{ key: 4, count: 6 }]
  })
}

function v2Insights() {
  return {
    filters: {},
    summary: {
      games: 12,
      puzzles: 20,
      missed_opportunities: 3,
      missed_attacks: 1,
      missed_attack_rate: 0.05,
      caught_opportunities: 4,
      caught_attacks: 2,
      own_mistakes: 6,
      average_move_length: 4.5
    },
    blindspots: [
      {
        tag: 'fork',
        missed_count: 4,
        total_count: 10,
        miss_rate: 0.4
      }
    ],
    phase_breakdown: [
      {
        game_phase: 'middlegame',
        missed_count: 4
      }
    ],
    series: [
      {
        start: '2026-05-01T00:00:00Z',
        end: '2026-05-08T00:00:00Z',
        games: 6,
        missed_opportunities: 2,
        missed_attacks: 1,
        missed_attack_rate: 0.1
      },
      {
        start: '2026-05-08T00:00:00Z',
        end: '2026-05-15T00:00:00Z',
        games: 6,
        missed_opportunities: 1,
        missed_attacks: 0,
        missed_attack_rate: 0
      }
    ],
    recommended_review: {
      due_count: 2,
      due_regular_count: 1,
      due_arrow_duel_count: 1,
      total_queued: 3,
      excluded_count: 0
    },
    stats_bundle: {
      opponent_series: v2OpponentSeriesStats(),
      my_mistakes_series: v2MyMistakesSeriesStats(),
      opponent_missed_3m: v2PuzzleStats({
        totalPuzzles: 4,
        tags: [{ key: 'fork', count: 4 }],
        colors: [{ key: 'white', count: 4 }],
        gameMoves: [{ key: 'Early middlegame', min_move: 13, max_move: 20, count: 4 }],
        moveLengths: [{ key: 2, count: 4 }]
      }),
      opponent_caught_3m: v2PuzzleStats({
        totalPuzzles: 6,
        tags: [{ key: 'fork', count: 6 }],
        colors: [{ key: 'black', count: 6 }],
        gameMoves: [{ key: 'Late middlegame', min_move: 21, max_move: 30, count: 6 }],
        moveLengths: [{ key: 3, count: 6 }]
      }),
      opponent_missed_3_to_6m: v2PuzzleStats({
        totalPuzzles: 4,
        tags: [{ key: 'fork', count: 4 }],
        colors: [{ key: 'white', count: 4 }],
        gameMoves: [{ key: 'Early middlegame', min_move: 13, max_move: 20, count: 4 }],
        moveLengths: [{ key: 2, count: 4 }]
      }),
      opponent_caught_3_to_6m: v2PuzzleStats({
        totalPuzzles: 6,
        tags: [{ key: 'fork', count: 6 }],
        colors: [{ key: 'black', count: 6 }],
        gameMoves: [{ key: 'Late middlegame', min_move: 21, max_move: 30, count: 6 }],
        moveLengths: [{ key: 3, count: 6 }]
      }),
      my_mistakes_3m: v2PuzzleStats({
        totalPuzzles: 6,
        tags: [{ key: 'pin', count: 6 }],
        colors: [{ key: 'white', count: 6 }],
        gameMoves: [{ key: 'Endgame', min_move: 31, max_move: 999, count: 6 }],
        moveLengths: [{ key: 4, count: 6 }]
      }),
      opponent_missed_all_time: v2PuzzleStats({
        totalPuzzles: 4,
        tags: [{ key: 'fork', count: 4 }],
        colors: [{ key: 'white', count: 4 }],
        gameMoves: [{ key: 'Early middlegame', min_move: 13, max_move: 20, count: 4 }],
        moveLengths: [{ key: 2, count: 4 }]
      }),
      opponent_caught_all_time: v2PuzzleStats({
        totalPuzzles: 6,
        tags: [{ key: 'fork', count: 6 }],
        colors: [{ key: 'black', count: 6 }],
        gameMoves: [{ key: 'Late middlegame', min_move: 21, max_move: 30, count: 6 }],
        moveLengths: [{ key: 3, count: 6 }]
      }),
      my_mistakes_all_time: v2PuzzleStats({
        totalPuzzles: 6,
        tags: [{ key: 'pin', count: 6 }],
        colors: [{ key: 'white', count: 6 }],
        gameMoves: [{ key: 'Endgame', min_move: 31, max_move: 999, count: 6 }],
        moveLengths: [{ key: 4, count: 6 }]
      })
    }
  }
}

function v2InsightsWithoutStatsBundle() {
  const insights = v2Insights()
  delete insights.stats_bundle
  return insights
}

function v2PuzzleStats({
  totalPuzzles,
  tags,
  colors,
  gameMoves,
  moveLengths
}: {
  totalPuzzles: number
  tags: Array<{ key: string; count: number }>
  colors: Array<{ key: string; count: number }>
  gameMoves: Array<{ key: string; min_move: number; max_move: number; count: number }>
  moveLengths: Array<{ key: number; count: number }>
}) {
  return {
    summary: {
      total_puzzles: totalPuzzles,
      unique_games: 3,
      average_move_length: 3
    },
    buckets: {
      tag: tags,
      user_color: colors,
      game_move_bucket: gameMoves,
      move_length: moveLengths,
      theme: []
    },
    series: []
  }
}

function v2OpponentSeriesStats() {
  return {
    summary: {
      total_puzzles: 10,
      unique_games: 6,
      average_move_length: 3
    },
    buckets: {},
    series: [
      {
        start: '2026-05-01T00:00:00Z',
        end: '2026-05-08T00:00:00Z',
        total_puzzles: 4,
        unique_games: 3,
        average_move_length: 2,
        buckets: {
          theme: [
            { key: 'opponent_mistake_missed', count: 2 },
            { key: 'opponent_mistake_caught', count: 2 }
          ]
        }
      },
      {
        start: '2026-05-08T00:00:00Z',
        end: '2026-05-15T00:00:00Z',
        total_puzzles: 8,
        unique_games: 4,
        average_move_length: 4,
        buckets: {
          theme: [
            { key: 'opponent_mistake_missed', count: 2 },
            { key: 'opponent_mistake_caught', count: 6 }
          ]
        }
      }
    ]
  }
}

function v2MyMistakesSeriesStats() {
  return {
    summary: {
      total_puzzles: 6,
      unique_games: 4,
      average_move_length: 5
    },
    buckets: {},
    series: [
      {
        start: '2026-05-01T00:00:00Z',
        end: '2026-05-08T00:00:00Z',
        total_puzzles: 2,
        unique_games: 2,
        average_move_length: 4,
        buckets: {
          theme: [{ key: 'own_mistake_punished', count: 2 }]
        }
      },
      {
        start: '2026-05-08T00:00:00Z',
        end: '2026-05-15T00:00:00Z',
        total_puzzles: 4,
        unique_games: 2,
        average_move_length: 6,
        buckets: {
          theme: [{ key: 'own_blunder_punished', count: 4 }]
        }
      }
    ]
  }
}
