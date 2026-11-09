import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { MistakeReview } from '@/components/puzzle-sprint/MistakeReview'

// Mock the hooks
vi.mock('@/hooks/useSprintApi', () => ({
  useSprintPuzzles: () => ({
    getSprintPuzzles: vi.fn().mockResolvedValue({
      puzzles: [
        {
          puzzle_id: 'test-puzzle-1',
          sequence_in_sprint: 1,
          fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1',
          solution_moves: ['Nf6', 'Nc3'],
          themes: ['fork'],
          rating: 1200,
          attempt_status: 'failed',
          user_moves: ['e4'],
          was_correct: false,
          time_taken_ms: 5000,
          attempted_at: '2024-01-01T12:00:00Z'
        }
      ]
    }),
    isLoading: false,
    error: null
  })
}))

// Mock the ChessBoard component
vi.mock('@/components/puzzle-sprint/ChessBoard', () => ({
  ChessBoard: React.forwardRef(({ fen, onPositionChange, ...props }: any, ref: any) => {
    React.useImperativeHandle(ref, () => ({
      getCurrentFen: () => fen,
      makeMove: vi.fn(),
      resetPosition: vi.fn(),
      setPosition: vi.fn()
    }))
    
    return (
      <div data-testid="chess-board" data-fen={fen}>
        Mocked ChessBoard
      </div>
    )
  })
}))



// Mock chess.js
vi.mock('chess.js', () => ({
  Chess: vi.fn().mockImplementation((fen) => ({
    fen: () => fen || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    move: vi.fn().mockReturnValue({
      san: 'Nf6',
      from: 'g8',
      to: 'f6'
    })
  }))
}))

describe('MistakeReview', () => {
  const mockProps = {
    sessionId: 'test-session-123',
    onClose: vi.fn()
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render the mistake review component', async () => {
    render(<MistakeReview {...mockProps} />)

    await waitFor(() => {
      expect(screen.getByText('Review Mistakes')).toBeInTheDocument()
    })
  })

  it('should render a Copy FEN button and copy the FEN on click', async () => {
    render(<MistakeReview {...mockProps} />)

    await waitFor(() => {
      // Button has title/aria-label "Copy FEN"
      expect(screen.getByTitle('Copy FEN')).toBeInTheDocument()
    })

    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.assign(navigator, { clipboard: { writeText } })

    const btn = screen.getByTitle('Copy FEN')
    btn.click()

    expect(writeText).toHaveBeenCalledWith(
      'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1'
    )
  })






})
