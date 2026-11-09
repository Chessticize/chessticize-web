import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import { SprintSession } from '@/components/puzzle-sprint/SprintSession'
import { getArrowDuelEloType } from '@/lib/sprint-config'

// Mock the sprint API hooks
const mockStartSprint = vi.fn()
const mockGetNextPuzzles = vi.fn()
const mockSubmitResults = vi.fn()
const mockEndSprint = vi.fn()

vi.mock('@/hooks/useSprintApi', () => ({
  useSprintManager: () => ({
    startSprint: mockStartSprint,
    getNextPuzzles: mockGetNextPuzzles,
    submitResults: mockSubmitResults,
    endSprint: mockEndSprint,
    isLoading: false,
    error: null
  })
}))

// ArrowDuelFilter is no longer needed - server-side processing

// Mock ChessBoard component
vi.mock('@/components/puzzle-sprint/ChessBoard', () => ({
  ChessBoard: ({ mode, candidateMoves, onMoveChosen, onPuzzleComplete }: any) => (
    <div data-testid="chess-board">
      <div data-testid="mode">{mode}</div>
      <div data-testid="candidate-moves">{JSON.stringify(candidateMoves)}</div>
      {mode === 'arrowduel' && candidateMoves && (
        <div>
          <button 
            data-testid="choose-blunder"
            onClick={() => onMoveChosen(candidateMoves[0], false)}
          >
            Choose Blunder
          </button>
          <button 
            data-testid="choose-correct"
            onClick={() => onMoveChosen(candidateMoves[1], true)}
          >
            Choose Correct
          </button>
        </div>
      )}
      {mode === 'puzzle' && (
        <div>
          <button 
            data-testid="solve-puzzle"
            onClick={() => onPuzzleComplete(true, ['e2e4'])}
          >
            Solve Puzzle
          </button>
        </div>
      )}
    </div>
  )
}))

// Mock other components
vi.mock('@/components/puzzle-sprint/SprintTimer', () => ({
  SprintTimer: () => <div data-testid="sprint-timer">Timer</div>
}))

vi.mock('@/components/puzzle-sprint/PuzzleLoader', () => ({
  PuzzleLoader: () => <div data-testid="puzzle-loader">Loading...</div>
}))

describe('Arrow Duel Sprint Integration', () => {
  const mockOnExit = vi.fn()
  const mockOnComplete = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Default successful sprint start
    mockStartSprint.mockResolvedValue({
      session_id: 'arrow-duel-session-123',
      time_limit_seconds: 300,
      target_puzzles: 10,
      max_mistakes: 2,
      user_elo: { rating: 1500, rating_deviation: 50, is_provisional: false }
    })

    // Default puzzle response - server returns Arrow Duel puzzles directly
    mockGetNextPuzzles.mockResolvedValue({
      puzzles: [
        {
          puzzle_id: 'arrow-duel-puzzle-1',
          fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/3P1N2/PPP2PPP/RNBQK2R w KQkq - 0 1',
          solution_moves: ['Bxf7+'],
          rating: 1600,
          themes: ['fork'],
          sequence_in_sprint: 1,
          attempt_type: 'arrow_duel',
          best_move: 'Ng5',
          best_move_eval: 100,
          position_eval_after_first_move: -250,
          bestMove: 'Ng5',
          blunderMove: 'Bxf7+',
          evaluationDiff: 350,
          candidateMoves: ['Bxf7+', 'Ng5']
        }
      ]
    })

    // Server now returns Arrow Duel puzzles directly - no client-side filtering needed

    mockSubmitResults.mockResolvedValue({ processed_count: 1 })
  })

  it('should initialize Arrow Duel sprint correctly', async () => {
    render(
      <SprintSession
        eloType={getArrowDuelEloType()}
        onExit={mockOnExit}
        onComplete={mockOnComplete}
      />
    )

    await waitFor(() => {
      expect(mockStartSprint).toHaveBeenCalledWith(getArrowDuelEloType(), expect.any(AbortSignal))
    })

    await waitFor(() => {
      expect(mockGetNextPuzzles).toHaveBeenCalledWith(
        'arrow-duel-session-123',
        expect.any(Number),
        'arrowduel',
        expect.any(AbortSignal)
      )
    })
  })

  it('should display Arrow Duel mode in ChessBoard', async () => {
    render(
      <SprintSession
        eloType={getArrowDuelEloType()}
        onExit={mockOnExit}
        onComplete={mockOnComplete}
      />
    )

    await waitFor(() => {
      expect(screen.getByTestId('mode')).toHaveTextContent('arrowduel')
    })

    await waitFor(() => {
      const candidateMoves = JSON.parse(screen.getByTestId('candidate-moves').textContent || '[]')
      expect(candidateMoves).toEqual(['Bxf7+', 'Ng5'])
    })
  })

  it('should handle correct Arrow Duel move selection', async () => {
    render(
      <SprintSession
        eloType={getArrowDuelEloType()}
        onExit={mockOnExit}
        onComplete={mockOnComplete}
      />
    )

    await waitFor(() => {
      expect(screen.getByTestId('choose-correct')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByTestId('choose-correct'))

    await waitFor(() => {
      expect(mockSubmitResults).toHaveBeenCalledWith(
        'arrow-duel-session-123',
        expect.arrayContaining([
          expect.objectContaining({
            puzzle_id: 'arrow-duel-puzzle-1',
            was_correct: true,
            attempt_type: 'arrow_duel',
            candidate_moves: ['Bxf7+', 'Ng5'],
            chosen_move: 'Ng5',
            user_moves: ['Ng5']
          })
        ]),
        true
      )
    })
  })

  it('should handle incorrect Arrow Duel move selection', async () => {
    render(
      <SprintSession
        eloType={getArrowDuelEloType()}
        onExit={mockOnExit}
        onComplete={mockOnComplete}
      />
    )

    await waitFor(() => {
      expect(screen.getByTestId('choose-blunder')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByTestId('choose-blunder'))

    await waitFor(() => {
      expect(mockSubmitResults).toHaveBeenCalledWith(
        'arrow-duel-session-123',
        expect.arrayContaining([
          expect.objectContaining({
            puzzle_id: 'arrow-duel-puzzle-1',
            was_correct: false,
            attempt_type: 'arrow_duel',
            candidate_moves: ['Bxf7+', 'Ng5'],
            chosen_move: 'Bxf7+',
            user_moves: ['Bxf7+']
          })
        ]),
        true
      )
    })
  })

  // Tests for client-side filtering removed - Arrow Duel now uses server-side processing

  it('should track Arrow Duel specific metrics', async () => {
    render(
      <SprintSession
        eloType={getArrowDuelEloType()}
        onExit={mockOnExit}
        onComplete={mockOnComplete}
      />
    )

    await waitFor(() => {
      expect(screen.getByTestId('choose-correct')).toBeInTheDocument()
    })

    // Make a correct choice
    fireEvent.click(screen.getByTestId('choose-correct'))

    // Verify that the sprint tracks success/mistake counts correctly
    await waitFor(() => {
      expect(mockSubmitResults).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([
          expect.objectContaining({
            was_correct: true,
            attempt_type: 'arrow_duel'
          })
        ]),
        true
      )
    })
  })
})
