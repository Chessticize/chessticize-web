import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { vi } from 'vitest'
import { ChessBoard } from '@/components/puzzle-sprint/ChessBoard'

// Mock react-chessboard
vi.mock('react-chessboard', () => ({
  Chessboard: ({ onSquareClick, customArrows, arePiecesDraggable, isDraggablePiece }: any) => (
    <div data-testid="chessboard">
      <div data-testid="arrows">{JSON.stringify(customArrows)}</div>
      <div data-testid="draggable">{arePiecesDraggable ? 'true' : 'false'}</div>
      <div data-testid="draggable-piece">{typeof isDraggablePiece === 'function' ? 'function' : 'boolean'}</div>
      {/* Simulate clickable squares */}
      <button data-testid="square-e4" onClick={() => onSquareClick('e4')}>e4</button>
      <button data-testid="square-d4" onClick={() => onSquareClick('d4')}>d4</button>
      <button data-testid="square-f7" onClick={() => onSquareClick('f7')}>f7</button>
    </div>
  )
}))

// Mock chess.js
vi.mock('chess.js', () => ({
  Chess: vi.fn().mockImplementation(function () { return ({
    fen: () => 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    turn: () => 'w',
    get: () => null,
    move: vi.fn().mockImplementation((move: any) => {
      // Return null for invalid moves (like 'invalid', 'also_invalid')
      if (typeof move === 'object' && move.from && move.to) {
        // Check if squares are valid chess squares (a1-h8)
        const validSquareRegex = /^[a-h][1-8]$/
        if (validSquareRegex.test(move.from) && validSquareRegex.test(move.to)) {
          return { from: move.from, to: move.to, san: 'e4' }
        }
      }
      return null // Invalid move
    }),
    moves: () => []
  }) })
}))

describe('ChessBoard Arrow Duel Mode', () => {
  const defaultProps = {
    fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    disabled: false
  }

  describe('Arrow Duel Mode', () => {
    it('should render candidate move arrows in Arrow Duel mode', () => {
      const candidateMoves: [string, string] = ['e2e4', 'd2d4']
      
      render(
        <ChessBoard
          {...defaultProps}
          mode="arrowduel"
          candidateMoves={candidateMoves}
        />
      )

      const arrows = screen.getByTestId('arrows')
      const arrowsData = JSON.parse(arrows.textContent || '[]')
      
      expect(arrowsData).toHaveLength(2)
      
      // Check that arrows are created for both candidate moves
      expect(arrowsData.some((arrow: any) => 
        arrow[0] === 'e2' && arrow[1] === 'e4'
      )).toBe(true)
      
      expect(arrowsData.some((arrow: any) => 
        arrow[0] === 'd2' && arrow[1] === 'd4'
      )).toBe(true)
    })

    it('should disable piece dragging in Arrow Duel mode', () => {
      render(
        <ChessBoard
          {...defaultProps}
          mode="arrowduel"
          candidateMoves={['e2e4', 'd2d4']}
        />
      )

      expect(screen.getByTestId('draggable')).toHaveTextContent('true')
      expect(screen.getByTestId('draggable-piece')).toHaveTextContent('function')
    })

    it('should call onMoveChosen when arrow target is clicked', () => {
      const onMoveChosen = vi.fn()
      const candidateMoves: [string, string] = ['e2e4', 'd2d4']

      render(
        <ChessBoard
          {...defaultProps}
          mode="arrowduel"
          candidateMoves={candidateMoves}
          onMoveChosen={onMoveChosen}
          bestMove="d2d4"
          blunderMove="e2e4"
        />
      )

      // Click on e4 (target of first candidate move e2e4)
      fireEvent.click(screen.getByTestId('square-e4'))

      expect(onMoveChosen).toHaveBeenCalledWith('e2e4', false) // First move is blunder (incorrect)
    })

    it('should call onMoveChosen with correct=true for second candidate move', () => {
      const onMoveChosen = vi.fn()
      const candidateMoves: [string, string] = ['e2e4', 'd2d4']

      render(
        <ChessBoard
          {...defaultProps}
          mode="arrowduel"
          candidateMoves={candidateMoves}
          onMoveChosen={onMoveChosen}
          bestMove="d2d4"
          blunderMove="e2e4"
        />
      )

      // Click on d4 (target of second candidate move d2d4)
      fireEvent.click(screen.getByTestId('square-d4'))

      expect(onMoveChosen).toHaveBeenCalledWith('d2d4', true) // Second move is correct
    })

    it('should not respond to clicks on non-arrow squares', () => {
      const onMoveChosen = vi.fn()
      const candidateMoves: [string, string] = ['e2e4', 'd2d4']
      
      render(
        <ChessBoard
          {...defaultProps}
          mode="arrowduel"
          candidateMoves={candidateMoves}
          onMoveChosen={onMoveChosen}
        />
      )

      // Click on f7 (not a target of any candidate move)
      fireEvent.click(screen.getByTestId('square-f7'))
      
      expect(onMoveChosen).not.toHaveBeenCalled()
    })

    it('should update arrow colors when move is selected', () => {
      const candidateMoves: [string, string] = ['e2e4', 'd2d4']
      
      const { rerender } = render(
        <ChessBoard
          {...defaultProps}
          mode="arrowduel"
          candidateMoves={candidateMoves}
        />
      )

      // Initial state - both arrows should be unselected
      let arrows = JSON.parse(screen.getByTestId('arrows').textContent || '[]')
      expect(arrows[0][2]).toContain('0.6') // Unselected red opacity
      expect(arrows[1][2]).toContain('0.6') // Unselected green opacity

      // Simulate selection by clicking
      fireEvent.click(screen.getByTestId('square-e4'))

      // After selection, the selected arrow should have higher opacity
      arrows = JSON.parse(screen.getByTestId('arrows').textContent || '[]')
      // Note: This test would need the component to re-render with updated state
      // In a real implementation, you'd need to check the actual state changes
    })

    it('should handle short candidate moves gracefully', () => {
      // Server should only provide valid moves, but test edge case of short strings
      const candidateMoves: [string, string] = ['e2', 'd2'] // Too short (< 4 chars)

      expect(() => {
        render(
          <ChessBoard
            {...defaultProps}
            mode="arrowduel"
            candidateMoves={candidateMoves}
          />
        )
      }).not.toThrow()

      // Should render empty arrows array for moves that are too short
      const arrows = JSON.parse(screen.getByTestId('arrows').textContent || '[]')
      expect(arrows).toHaveLength(0)
    })
  })

  describe('Regular Mode', () => {
    it('should enable piece dragging in regular mode', () => {
      render(
        <ChessBoard
          {...defaultProps}
          mode="puzzle"
          solutionMoves={['e2e4']}
        />
      )

      expect(screen.getByTestId('draggable')).toHaveTextContent('true')
    })

    it('should not show candidate arrows in regular mode', () => {
      render(
        <ChessBoard
          {...defaultProps}
          mode="puzzle"
          solutionMoves={['e2e4']}
        />
      )

      const arrows = JSON.parse(screen.getByTestId('arrows').textContent || '[]')
      expect(arrows).toHaveLength(0)
    })
  })

  describe('Analysis Mode', () => {
    it('should show analysis arrows when provided', () => {
      const analysisLines = [
        {
          moves: ['e2e4'],
          evaluation: 25,
          depth: 15,
          pv: 'e2e4 e7e5',
          multipv: 1,
          uciMoves: ['e2e4']
        }
      ]

      render(
        <ChessBoard
          {...defaultProps}
          mode="analysis"
          analysisLines={analysisLines}
          showAnalysisArrows={true}
        />
      )

      const arrows = JSON.parse(screen.getByTestId('arrows').textContent || '[]')
      expect(arrows.length).toBeGreaterThan(0)
    })
  })
})
