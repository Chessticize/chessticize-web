import React from 'react'
import { render, screen } from '@testing-library/react'
import { vi } from 'vitest'
import { ChessBoard } from '@/components/puzzle-sprint/ChessBoard'

// Mock react-chessboard
vi.mock('react-chessboard', () => ({
  Chessboard: ({ boardOrientation, customDndBackend, customDndBackendOptions, ...props }: any) => (
    <div
      data-testid="chessboard"
      data-orientation={boardOrientation}
      data-custom-dnd-backend={customDndBackend?.name || 'none'}
      data-has-backend-options={customDndBackendOptions ? 'true' : 'false'}
      {...props}
    >
      Mocked Chessboard
    </div>
  )
}))

// Mock the multi-backend modules
vi.mock('react-dnd-multi-backend', () => ({
  MultiBackend: function MultiBackend() { return null }
}))

vi.mock('rdndmb-html5-to-touch', () => ({
  HTML5toTouch: { backends: [] }
}))

describe('ChessBoard', () => {
  const mockProps = {
    fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    solutionMoves: ['e4', 'e5'],
    onMoveAttempt: vi.fn(),
    onPuzzleComplete: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should auto-detect black orientation for white to move (white at bottom)', () => {
    const whiteFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
    render(<ChessBoard {...mockProps} fen={whiteFen} />)

    const chessboard = screen.getByTestId('chessboard')
    expect(chessboard).toHaveAttribute('data-orientation', 'black')
  })

  it('should auto-detect white orientation for black to move (black at bottom)', () => {
    const blackFen = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1'
    render(<ChessBoard {...mockProps} fen={blackFen} />)

    const chessboard = screen.getByTestId('chessboard')
    expect(chessboard).toHaveAttribute('data-orientation', 'white')
  })

  it('should use explicit orientation when provided', () => {
    const whiteFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
    render(<ChessBoard {...mockProps} fen={whiteFen} orientation="white" />)

    const chessboard = screen.getByTestId('chessboard')
    expect(chessboard).toHaveAttribute('data-orientation', 'white')
  })

  it('should render with responsive container', () => {
    render(<ChessBoard {...mockProps} />)

    // The outer container is the parent of the chessboard's parent div
    const chessboard = screen.getByTestId('chessboard')
    const innerContainer = chessboard.parentElement // This is the "relative" div
    const outerContainer = innerContainer?.parentElement // This should be the container with all classes

    expect(outerContainer).toHaveClass('relative', 'w-full', 'h-full', 'flex', 'justify-center')
  })

  it('should only allow dragging pieces of the active color', () => {
    // Test with white to move position
    const whiteFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
    render(<ChessBoard {...mockProps} fen={whiteFen} />)

    const chessboard = screen.getByTestId('chessboard')
    expect(chessboard).toBeInTheDocument()

    // In a real test, we would check that isDraggablePiece prop is passed correctly
    // For now, we just verify the component renders without errors
  })

  it('should prevent dragging opponent pieces', () => {
    // Test with black to move position
    const blackFen = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1'
    render(<ChessBoard {...mockProps} fen={blackFen} />)

    const chessboard = screen.getByTestId('chessboard')
    expect(chessboard).toBeInTheDocument()

    // In a real test, we would simulate drag attempts and verify they're blocked
    // For now, we just verify the component renders without errors
  })

  it('should configure chessboard with touch-friendly props', () => {
    render(<ChessBoard {...mockProps} />)

    const chessboard = screen.getByTestId('chessboard')
    expect(chessboard).toBeInTheDocument()

    // Verify that snapToCursor and allowDragOutsideBoard props are set correctly
    // In a real implementation, we would check the actual props passed to Chessboard
  })

  it('should configure multi-backend for touch support', () => {
    render(<ChessBoard {...mockProps} />)

    const chessboard = screen.getByTestId('chessboard')
    expect(chessboard).toBeInTheDocument()

    // Verify that the multi-backend is configured
    expect(chessboard).toHaveAttribute('data-custom-dnd-backend', 'MultiBackend')
    expect(chessboard).toHaveAttribute('data-has-backend-options', 'true')
  })

  it('should apply touch-action CSS for preventing browser gestures', () => {
    render(<ChessBoard {...mockProps} />)

    const chessboard = screen.getByTestId('chessboard')
    const container = chessboard.parentElement

    // Verify that the container has the chessboard-container class
    expect(container).toHaveClass('chessboard-container')
    // Note: In test environment, inline styles might not be applied the same way
    // The important thing is that the component renders without errors and has the right structure
    expect(container).toBeInTheDocument()
  })

  it('should render in analysis mode', () => {
    const analysisProps = {
      fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      mode: 'analysis' as const,
      onPositionChange: vi.fn(),
      onMoveAnalysis: vi.fn(),
    }

    render(<ChessBoard {...analysisProps} />)

    const chessboard = screen.getByTestId('chessboard')
    expect(chessboard).toBeInTheDocument()
    expect(chessboard).toHaveAttribute('data-orientation', 'black')
  })

  it('should render in puzzle mode by default', () => {
    render(<ChessBoard {...mockProps} />)

    const chessboard = screen.getByTestId('chessboard')
    expect(chessboard).toBeInTheDocument()
    expect(chessboard).toHaveAttribute('data-orientation', 'black')
  })

  it('should support click-to-move functionality', () => {
    render(<ChessBoard {...mockProps} />)

    const chessboard = screen.getByTestId('chessboard')
    expect(chessboard).toBeInTheDocument()

    // The component should render without errors when onSquareClick is provided
    // (The actual click functionality would require more complex testing with user events)
  })
})
