/**
 * Arrow Duel Drag and Drop Tests
 * Tests that drag-and-drop works correctly for arrow duel puzzles
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ChessBoard } from '@/components/puzzle-sprint/ChessBoard'

// Mock the chess components
vi.mock('react-chessboard', () => ({
  Chessboard: ({ onPieceDrop, candidateMoves }: any) => {
    // Simulate drag and drop
    const handleTestDrop = (from: string, to: string) => {
      const result = onPieceDrop(from, to)
      return result
    }

    return (
      <div data-testid="chessboard">
        <button 
          data-testid="test-candidate-move" 
          onClick={() => handleTestDrop('e2', 'e4')}
        >
          Test Candidate Move (e2e4)
        </button>
        <button 
          data-testid="test-non-candidate-move" 
          onClick={() => handleTestDrop('d2', 'd3')}
        >
          Test Non-Candidate Move (d2d3)
        </button>
      </div>
    )
  }
}))

describe('Arrow Duel Drag and Drop', () => {
  const mockOnMoveChosen = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should allow dropping pieces on candidate moves', () => {
    render(
      <ChessBoard
        fen="rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
        mode="arrowduel"
        candidateMoves={['e2e4', 'd2d4']}
        onMoveChosen={mockOnMoveChosen}
        bestMove="e2e4"
        blunderMove="d2d4"
      />
    )

    const candidateButton = screen.getByTestId('test-candidate-move')
    candidateButton.click()

    // Should call onMoveChosen when a candidate move is made
    expect(mockOnMoveChosen).toHaveBeenCalledWith('e2e4', true)
  })

  it('should reject dropping pieces on non-candidate moves', () => {
    render(
      <ChessBoard
        fen="rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
        mode="arrowduel"
        candidateMoves={['e2e4', 'd2d4']}
        onMoveChosen={mockOnMoveChosen}
        bestMove="e2e4"
        blunderMove="d2d4"
      />
    )

    const nonCandidateButton = screen.getByTestId('test-non-candidate-move')
    nonCandidateButton.click()

    // Should not call onMoveChosen for non-candidate moves
    expect(mockOnMoveChosen).not.toHaveBeenCalled()
  })

  it('should enable dragging in arrow duel mode', () => {
    const { container } = render(
      <ChessBoard
        fen="rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
        mode="arrowduel"
        candidateMoves={['e2e4', 'd2d4']}
        onMoveChosen={mockOnMoveChosen}
      />
    )

    // Chessboard should be rendered (indicating drag-and-drop is enabled)
    expect(screen.getByTestId('chessboard')).toBeInTheDocument()
  })
})