import { act, renderHook } from '@testing-library/react'
import { vi } from 'vitest'
import {
  useEndSprint,
  useNextPuzzles,
  useSprintPuzzles,
  useStartSprint,
  useSubmitResults
} from '@/hooks/useSprintApi'
import { apiGet, apiPost } from '@/lib/auth/api-client'

vi.mock('@/lib/auth/api-client', () => ({
  apiGet: vi.fn(),
  apiPost: vi.fn()
}))

describe('useSprintApi v2 adapter', () => {
  const mockApiGet = vi.mocked(apiGet)
  const mockApiPost = vi.mocked(apiPost)

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('starts sprints through v2 and preserves the legacy hook response shape', async () => {
    mockApiPost.mockResolvedValue(okResponse(v2SprintResponse({
      sprint_id: 'sprint-1',
      elo: {
        rating_before: 1210,
        rating_deviation: 82,
        is_provisional: true
      }
    })))

    const { result } = renderHook(() => useStartSprint())
    let started = null

    await act(async () => {
      started = await result.current.startSprint('mixed 5/20')
    })

    expect(new URL(mockApiPost.mock.calls[0][0]).pathname).toBe('/api/v2/me/sprints')
    expect(mockApiPost.mock.calls[0][1]).toEqual({ elo_type: 'mixed 5/20' })
    expect(started).toEqual({
      session_id: 'sprint-1',
      user_elo: {
        rating: 1210,
        rating_deviation: 82,
        is_provisional: true
      },
      target_puzzles: 15,
      time_limit_seconds: 300,
      max_mistakes: 3
    })
  })

  it('draws v2 sprint puzzles and maps regular puzzle fields for existing sprint UI', async () => {
    mockApiPost.mockResolvedValue(okResponse({
      puzzles: [
        {
          sprint_puzzle_id: 'sp-1',
          sequence: 2,
          puzzle_source: 'lichess',
          puzzle_id: 'lichess-1',
          mode: 'regular',
          fen: 'fen',
          solution_moves: ['e2e4', 'e7e5'],
          rating: 1400,
          themes: ['fork']
        }
      ]
    }))

    const { result } = renderHook(() => useNextPuzzles())
    let drawn = null

    await act(async () => {
      drawn = await result.current.getNextPuzzles('sprint-1', 5)
    })

    expect(new URL(mockApiPost.mock.calls[0][0]).pathname).toBe('/api/v2/me/sprints/sprint-1/puzzles:draw')
    expect(mockApiPost.mock.calls[0][1]).toEqual({ count: 5 })
    expect(drawn).toEqual({
      puzzles: [
        {
          puzzle_id: 'lichess-1',
          fen: 'fen',
          solution_moves: ['e2e4', 'e7e5'],
          rating: 1400,
          themes: ['fork'],
          sequence_in_sprint: 2,
          attempt_type: 'regular',
          best_move_eval: undefined,
          best_move: undefined,
          blunder_move: undefined,
          position_eval_after_first_move: undefined
        }
      ]
    })
  })

  it('keeps arrow duel puzzle compatibility fields when drawing from v2', async () => {
    mockApiPost.mockResolvedValue(okResponse({
      puzzles: [
        {
          sprint_puzzle_id: 'sp-2',
          sequence: 1,
          puzzle_source: 'lichess',
          puzzle_id: 'lichess-arrow',
          mode: 'arrow_duel',
          fen: 'fen',
          solution_moves: ['legacy-blunder'],
          rating: 1900,
          themes: ['advantage'],
          candidate_moves: [
            { move: 'd4e5', kind: 'blunder', eval_after: -2.1 },
            { move: 'd4d8', kind: 'best', eval_after: 3.2 }
          ],
          correct_move: 'd4d8',
          best_move: 'd4d8',
          best_move_eval: 3.2,
          position_eval_after_first_move: -2.1
        }
      ]
    }))

    const { result } = renderHook(() => useNextPuzzles())
    let drawn = null

    await act(async () => {
      drawn = await result.current.getNextPuzzles('sprint-1', 1, 'arrowduel')
    })

    expect(drawn?.puzzles).toEqual([
      expect.objectContaining({
        puzzle_id: 'lichess-arrow',
        attempt_type: 'arrow_duel',
        bestMove: 'd4d8',
        blunderMove: 'd4e5',
        candidateMoves: ['d4e5', 'd4d8'],
        bestMoveEval: 3.2,
        blunderMoveEval: -2.1
      })
    ])
  })

  it('submits accumulated sprint attempts to v2 attempts', async () => {
    mockApiPost.mockResolvedValue(okResponse({
      processed_count: 1,
      ignored_duplicate_count: 0,
      sprint_status: 'active',
      puzzles_solved: 1,
      mistakes_made: 0,
      max_mistakes: 3
    }))

    const { result } = renderHook(() => useSubmitResults())
    let submitted = null

    await act(async () => {
      submitted = await result.current.submitResults('sprint-1', [
        {
          puzzle_id: 'lichess-1',
          sequence_in_sprint: 1,
          user_moves: ['e2e4'],
          was_correct: true,
          time_taken_ms: 1200,
          attempted_at: '2026-06-20T10:00:00Z',
          attempt_type: 'regular'
        }
      ])
    })

    expect(new URL(mockApiPost.mock.calls[0][0]).pathname).toBe('/api/v2/me/sprints/sprint-1/attempts')
    expect(mockApiPost.mock.calls[0][1]).toEqual({
      attempts: [
        {
          puzzle_source: 'lichess',
          puzzle_id: 'lichess-1',
          sequence: 1,
          mode: 'regular',
          user_moves: ['e2e4'],
          candidate_moves: undefined,
          chosen_move: undefined,
          was_correct: true,
          time_taken_ms: 1200,
          attempted_at: '2026-06-20T10:00:00Z'
        }
      ]
    })
    expect(submitted).toEqual({
      processed_count: 1,
      session_status: 'active',
      mistakes_count: 0
    })
  })

  it('finishes sprints through the v2 finish action with client counts', async () => {
    mockApiPost.mockResolvedValue(okResponse(v2SprintResponse({
      status: 'completed_success',
      puzzles_solved: 15,
      mistakes_made: 1,
      duration_seconds: 287,
      elo: {
        rating_before: 1210,
        rating_after: 1224,
        rating_change: 14
      }
    })))

    const { result } = renderHook(() => useEndSprint())
    let ended = null

    await act(async () => {
      ended = await result.current.endSprint('sprint-1', { puzzles_solved: 15, mistakes_made: 1 })
    })

    expect(new URL(mockApiPost.mock.calls[0][0]).pathname).toBe('/api/v2/me/sprints/sprint-1:finish')
    expect(mockApiPost.mock.calls[0][1]).toEqual({
      client_final_counts: {
        puzzles_solved: 15,
        mistakes_made: 1
      }
    })
    expect(ended).toEqual({
      session_id: 'sprint-1',
      status: 'completed_success',
      puzzles_solved: 15,
      mistakes_made: 1,
      duration_seconds: 287,
      elo_change: {
        rating_before: 1210,
        rating_after: 1224,
        rating_change: 14
      }
    })
  })

  it('loads failed sprint attempts from v2 for mistake review', async () => {
    mockApiGet.mockResolvedValue(okResponse({
      total_count: 7,
      offset: 10,
      limit: 5,
      attempts: [
        {
          sprint_puzzle_id: 'sp-1',
          sequence: 3,
          status: 'failed',
          mode: 'arrow_duel',
          puzzle_source: 'lichess',
          puzzle_id: 'lichess-1',
          fen: 'fen',
          solution_moves: ['d4e5'],
          rating: 1800,
          themes: ['pin'],
          moves: ['d4e5'],
          candidate_moves: ['d4e5', 'd4d8'],
          chosen_move: 'd4e5',
          best_move: 'd4d8',
          blunder_move: 'd4e5',
          time_taken_ms: 2200,
          attempted_at: '2026-06-20T10:00:00Z'
        }
      ]
    }))

    const { result } = renderHook(() => useSprintPuzzles())
    let attempts = null

    await act(async () => {
      attempts = await result.current.getSprintPuzzles('sprint-1', { status: 'failed', offset: 10, limit: 5 })
    })

    const requestedURL = new URL(mockApiGet.mock.calls[0][0])
    expect(requestedURL.pathname).toBe('/api/v2/me/sprints/sprint-1/attempts')
    expect(requestedURL.searchParams.get('status')).toBe('failed')
    expect(requestedURL.searchParams.get('offset')).toBe('10')
    expect(requestedURL.searchParams.get('limit')).toBe('5')
    expect(requestedURL.searchParams.get('include_puzzle')).toBe('true')
    expect(attempts).toEqual({
      puzzles: [
        {
          puzzle_id: 'lichess-1',
          sequence_in_sprint: 3,
          fen: 'fen',
          solution_moves: ['d4e5'],
          rating: 1800,
          themes: ['pin'],
          attempt_status: 'failed',
          user_moves: ['d4e5'],
          was_correct: false,
          time_taken_ms: 2200,
          attempted_at: '2026-06-20T10:00:00Z',
          attempt_type: 'arrow_duel',
          candidate_moves: ['d4e5', 'd4d8'],
          chosen_move: 'd4e5',
          best_move: 'd4d8',
          blunder_move: 'd4e5'
        }
      ],
      total_count: 7,
      offset: 10,
      limit: 5
    })
  })

  it('preserves unattempted sprint puzzle filtering and pagination metadata', async () => {
    mockApiGet.mockResolvedValue(okResponse({
      total_count: 12,
      offset: 5,
      limit: 5,
      attempts: [
        {
          sprint_puzzle_id: 'sp-2',
          sequence: 6,
          status: 'unattempted',
          mode: 'regular',
          puzzle_source: 'lichess',
          puzzle_id: 'lichess-2',
          fen: 'fen',
          solution_moves: ['e2e4'],
          rating: 1200,
          themes: ['skewer']
        }
      ]
    }))

    const { result } = renderHook(() => useSprintPuzzles())
    let attempts = null

    await act(async () => {
      attempts = await result.current.getSprintPuzzles('sprint-1', {
        status: 'unattempted',
        offset: 5,
        limit: 5,
        sequence_min: 6,
        sequence_max: 10
      })
    })

    const requestedURL = new URL(mockApiGet.mock.calls[0][0])
    expect(requestedURL.pathname).toBe('/api/v2/me/sprints/sprint-1/attempts')
    expect(requestedURL.searchParams.get('status')).toBe('unattempted')
    expect(requestedURL.searchParams.get('offset')).toBe('5')
    expect(requestedURL.searchParams.get('limit')).toBe('5')
    expect(requestedURL.searchParams.get('sequence_min')).toBe('6')
    expect(requestedURL.searchParams.get('sequence_max')).toBe('10')
    expect(attempts).toEqual({
      puzzles: [
        {
          puzzle_id: 'lichess-2',
          sequence_in_sprint: 6,
          fen: 'fen',
          solution_moves: ['e2e4'],
          rating: 1200,
          themes: ['skewer'],
          attempt_status: 'unattempted',
          user_moves: undefined,
          was_correct: false,
          time_taken_ms: undefined,
          attempted_at: undefined,
          attempt_type: 'regular',
          candidate_moves: undefined,
          chosen_move: undefined,
          best_move: undefined,
          blunder_move: undefined
        }
      ],
      total_count: 12,
      offset: 5,
      limit: 5
    })
  })
})

function okResponse(body: unknown): Response {
  return {
    ok: true,
    json: async () => body
  } as Response
}

function v2SprintResponse(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    sprint_id: 'sprint-1',
    status: 'active',
    mode: 'regular',
    theme: 'mixed',
    target_puzzles: 15,
    time_limit_seconds: 300,
    max_mistakes: 3,
    mistakes_made: 0,
    puzzles_solved: 0,
    time_remaining_seconds: 299,
    started_at: '2026-06-20T10:00:00Z',
    ended_at: null,
    duration_seconds: null,
    elo: {
      elo_type: 'mixed 5/20',
      rating_before: 1200,
      rating_after: null,
      rating_change: null,
      rating_deviation: 75,
      is_provisional: false
    },
    ...overrides
  }
}
