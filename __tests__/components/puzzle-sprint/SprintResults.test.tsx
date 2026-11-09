import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { SprintResults } from '@/components/puzzle-sprint/SprintResults'

const mockGetSprintPuzzles = vi.hoisted(() => vi.fn())

vi.mock('@/hooks/useSprintApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/hooks/useSprintApi')>()
  return {
    ...actual,
    useSprintPuzzles: () => ({
      getSprintPuzzles: mockGetSprintPuzzles,
      isLoading: false,
      error: null,
    }),
  }
})

vi.mock('@/components/puzzle-sprint/ChessBoard', () => ({
  ChessBoard: React.forwardRef(({ fen }: { fen: string }, ref: React.ForwardedRef<unknown>) => {
    React.useImperativeHandle(ref, () => ({
      getCurrentFen: () => fen,
      makeMove: vi.fn(),
      resetPosition: vi.fn(),
      setPosition: vi.fn(),
    }))

    return <div data-testid="chess-board">Mocked ChessBoard</div>
  }),
}))

vi.mock('chess.js', () => ({
  Chess: vi.fn().mockImplementation((fen) => ({
    fen: () => fen,
    move: vi.fn().mockReturnValue({
      san: 'Nf6',
      from: 'g8',
      to: 'f6',
    }),
  })),
}))

describe('SprintResults', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetSprintPuzzles.mockResolvedValue({
      puzzles: [{
        puzzle_id: 'failed-puzzle-1',
        sequence_in_sprint: 1,
        fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1',
        solution_moves: ['g8f6'],
        themes: ['fork'],
        rating: 1200,
        attempt_status: 'failed',
        user_moves: ['e4'],
        was_correct: false,
        time_taken_ms: 5000,
        attempted_at: '2026-06-20T00:00:00Z',
      }],
      total_count: 1,
      offset: 0,
      limit: 100,
    })
  })

  it('opens mistake review and reads failed sprint attempts from v2-backed hook', async () => {
    render(
      <SprintResults
        results={{
          session_id: 'sprint-1',
          status: 'completed_fail_mistakes',
          puzzles_solved: 4,
          mistakes_made: 1,
          duration_seconds: 120,
        }}
        eloType="mixed 5/20"
        onRestart={vi.fn()}
        onHome={vi.fn()}
      />,
    )

    await userEvent.click(screen.getByRole('button', { name: 'Review Mistakes (1)' }))

    await waitFor(() => {
      expect(mockGetSprintPuzzles).toHaveBeenCalledWith('sprint-1', { status: 'failed' })
    })
    expect(screen.getByRole('heading', { name: 'Review Mistakes' })).toBeInTheDocument()
    expect(screen.getByText('Puzzle 1 of 1')).toBeInTheDocument()
  })
})
