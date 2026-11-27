import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { MistakeReview } from '@/components/puzzle-sprint/MistakeReview'

vi.mock('@/components/navigation', () => ({
  default: () => <nav data-testid="mock-navigation" />,
}))

vi.mock('@/hooks/useSprintApi', () => ({
  useSprintPuzzles: () => ({
    getSprintPuzzles: vi.fn().mockResolvedValue({
      puzzles: [
        {
          puzzle_id: 'test-puzzle-1',
          sequence_in_sprint: 1,
          fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1',
          solution_moves: ['g8f6', 'b1c3'],
          themes: ['fork'],
          rating: 1200,
          attempt_status: 'failed',
          user_moves: ['e4'],
          was_correct: false,
          time_taken_ms: 5000,
          attempted_at: '2024-01-01T12:00:00Z',
        },
      ],
    }),
    isLoading: false,
    error: null,
  }),
}))

vi.mock('@/components/puzzle-sprint/ChessBoard', () => ({
  ChessBoard: React.forwardRef(({ fen }: { fen: string }, ref: React.ForwardedRef<unknown>) => {
    React.useImperativeHandle(ref, () => ({
      getCurrentFen: () => fen,
      makeMove: vi.fn(),
      resetPosition: vi.fn(),
      setPosition: vi.fn(),
      highlightMove: vi.fn(),
    }))

    return (
      <div data-testid="chess-board" data-fen={fen}>
        Mocked ChessBoard
      </div>
    )
  }),
}))

vi.mock('@/components/chess/PositionAnalyzerPanel', () => ({
  PositionAnalyzerPanel: ({ fen, onClose }: { fen: string; onClose?: () => void }) => (
    <div data-testid="position-analyzer-panel" data-fen={fen}>
      Mocked Stockfish Analyzer
      {onClose && <button onClick={onClose}>Close Analysis</button>}
    </div>
  ),
}))

describe('MistakeReview', () => {
  const mockProps = {
    sessionId: 'test-session-123',
    onClose: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders unified mistake review without Lichess or Explore buttons', async () => {
    render(<MistakeReview {...mockProps} />)

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Review Mistakes' })).toBeInTheDocument()
    })

    expect(screen.getByText('Puzzle 1 of 1')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Analyze/i })).toBeInTheDocument()
    expect(screen.queryByText(/Analysis in Lichess/i)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Explore/i })).not.toBeInTheDocument()
  })

  it('switches into built-in Stockfish PositionAnalyzerPanel when Analyze is clicked', async () => {
    render(<MistakeReview {...mockProps} />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Analyze/i })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /Analyze/i }))

    expect(screen.getByTestId('position-analyzer-panel')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Back to Practice/i })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /Back to Practice/i }))
    expect(screen.queryByTestId('position-analyzer-panel')).not.toBeInTheDocument()
  })

  it('renders a Copy FEN button and copies the FEN on click', async () => {
    render(<MistakeReview {...mockProps} />)

    await waitFor(() => {
      expect(screen.getByTitle('Copy FEN')).toBeInTheDocument()
    })

    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.assign(navigator, { clipboard: { writeText } })

    fireEvent.click(screen.getByTitle('Copy FEN'))

    expect(writeText).toHaveBeenCalledWith(
      'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1',
    )
  })
})
