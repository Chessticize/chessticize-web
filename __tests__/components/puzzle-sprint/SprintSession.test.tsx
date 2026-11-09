import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import { SprintSession } from '@/components/puzzle-sprint/SprintSession'
import * as sprintApi from '@/hooks/useSprintApi'


// Mock the hooks
vi.mock('@/hooks/useSprintApi', () => ({
  useSprintManager: () => ({
    startSprint: vi.fn().mockResolvedValue({
      session_id: 'test-session-id',
      time_limit_seconds: 300, // Updated to match new 5-minute default
      target_puzzles: 3, // Small number for testing
      max_mistakes: 2,
      user_elo: { rating: 1200, rating_deviation: 50, is_provisional: false }
    }),
    getNextPuzzles: vi.fn().mockResolvedValue({
      puzzles: [
        {
          puzzle_id: 'puzzle-1',
          fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
          solution_moves: ['e4', 'e5'],
          sequence_in_sprint: 1,
          rating: 1200
        },
        {
          puzzle_id: 'puzzle-2',
          fen: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2',
          solution_moves: ['Nf3', 'Nc6'],
          sequence_in_sprint: 2,
          rating: 1250
        },
        {
          puzzle_id: 'puzzle-3',
          fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3',
          solution_moves: ['Bb5', 'a6'],
          sequence_in_sprint: 3,
          rating: 1300
        }
      ]
    }),
    submitResults: vi.fn().mockResolvedValue({ processed_count: 1 }),
    endSprint: vi.fn().mockResolvedValue({
      session_id: 'test-session-id',
      status: 'completed_success',
      puzzles_solved: 3,
      mistakes_made: 0,
      duration_seconds: 120,
      elo_change: { rating_before: 1200, rating_after: 1220, rating_change: 20 }
    }),
    isLoading: false,
    error: null
  })
}))

// Mock ChessBoard component
vi.mock('@/components/puzzle-sprint/ChessBoard', () => ({
  ChessBoard: ({ onPuzzleComplete, fen, solutionMoves }: any) => {
    const puzzleId = `${fen}-${solutionMoves?.join(',')}`

    return (
      <div data-testid="chess-board" data-puzzle-id={puzzleId}>
        <button
          data-testid="solve-puzzle-success"
          onClick={() => onPuzzleComplete(true, solutionMoves || [])}
        >
          Solve Correctly
        </button>
        <button
          data-testid="solve-puzzle-failure"
          onClick={() => onPuzzleComplete(false, ['wrong', 'move'])}
        >
          Solve Incorrectly
        </button>
      </div>
    )
  }
}))

// Mock other components
vi.mock('@/components/puzzle-sprint/SprintTimer', () => ({
  SprintTimer: ({ timeRemaining }: any) => (
    <div data-testid="sprint-timer">{timeRemaining}s</div>
  )
}))

vi.mock('@/components/puzzle-sprint/PuzzleLoader', () => ({
  PuzzleLoader: ({ message }: any) => (
    <div data-testid="puzzle-loader">{message}</div>
  )
}))

describe('SprintSession', () => {
  const mockProps = {
    eloType: 'mixed 5/20', // Updated to match new default
    onExit: vi.fn(),
    onComplete: vi.fn()
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })


  it('should render loading state initially', async () => {
    render(<SprintSession {...mockProps} />)

    // Should show loading initially
    expect(screen.getByTestId('puzzle-loader')).toBeInTheDocument()
    expect(screen.getByText('Starting your sprint...')).toBeInTheDocument()
  })

  it('should prevent duplicate sprint initialization', async () => {
    const mockStartSprint = vi.fn().mockResolvedValue({
      session_id: 'test-session-id',
      time_limit_seconds: 300,
      target_puzzles: 15,
      max_mistakes: 2,
      user_elo: { rating: 1200, rating_deviation: 50, is_provisional: false }
    })

    // Override the top-level mock to track calls
    vi.spyOn(sprintApi, 'useSprintManager').mockReturnValue({
      startSprint: mockStartSprint,
      getNextPuzzles: vi.fn(),
      submitResults: vi.fn(),
      endSprint: vi.fn(),
      isLoading: false,
      error: null
    } as any)

    // Render and immediately re-render to simulate duplicate effect calls without unmounting
    const { rerender } = render(<SprintSession {...mockProps} />)
    rerender(<SprintSession {...mockProps} />)

    // Wait for any async operations
    await waitFor(() => {
      // startSprint should only be called once despite double mounting
      expect(mockStartSprint).toHaveBeenCalledTimes(1)
    })
  })

  it('should render sprint interface after initialization', async () => {
    render(<SprintSession {...mockProps} />)

    // Wait for sprint to initialize and show the main interface
    await waitFor(() => {
      expect(screen.getByText('Success 0/3')).toBeInTheDocument()
    }, { timeout: 3000 })

    // Should show timer
    expect(screen.getByTestId('sprint-timer')).toBeInTheDocument()

    // Should show abandon button when sprint is active
    expect(screen.getByText('Abandon')).toBeInTheDocument()

    // Wait for the chess board to load (puzzles need to be loaded first)
    await waitFor(() => {
      expect(screen.getByTestId('chess-board')).toBeInTheDocument()
    }, { timeout: 3000 })
  })

  it('should display turn indicator with correct puzzle color', async () => {
    render(<SprintSession {...mockProps} />)

    // Wait for sprint to initialize
    await waitFor(() => {
      expect(screen.getByText('Success 0/3')).toBeInTheDocument()
    }, { timeout: 3000 })

    // Wait for the chess board to load
    await waitFor(() => {
      expect(screen.getByTestId('chess-board')).toBeInTheDocument()
    }, { timeout: 3000 })

    // Should show turn indicator
    await waitFor(() => {
      expect(screen.getByText('Your turn')).toBeInTheDocument()
    }, { timeout: 1000 })

    // Should show the correct puzzle color (black puzzle from starting position FEN where white is active)
    // Since FEN has 'w' (white to move), the puzzle is for black (opposite color)
    expect(screen.getByText('Find the best move for black.')).toBeInTheDocument()
  })

  it('should show consistent puzzle color throughout the puzzle', async () => {
    render(<SprintSession {...mockProps} />)

    // Wait for sprint to initialize and chess board to load
    await waitFor(() => {
      expect(screen.getByTestId('chess-board')).toBeInTheDocument()
    }, { timeout: 3000 })

    // Should show black puzzle (since starting FEN has white to move)
    await waitFor(() => {
      expect(screen.getByText('Find the best move for black.')).toBeInTheDocument()
    }, { timeout: 1000 })

    // The puzzle color should remain consistent and not change during the puzzle
    // (Unlike the previous dynamic turn indicator, this is static for the puzzle)
    expect(screen.getByText('Find the best move for black.')).toBeInTheDocument()
  })
})
