/**
 * Arrow Duel Color Coding Tests
 * Tests that color coding works correctly for both drag-and-drop and button clicks
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ArrowDuelMoveSelector } from '@/components/puzzle-sprint/ArrowDuelMoveSelector'

describe('Arrow Duel Color Coding', () => {
  const mockOnMoveChosen = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should call onMoveChosen with correct parameters for correct move', () => {
    render(
      <ArrowDuelMoveSelector
        candidateMoves={['e2e4', 'd2d4']}
        onMoveChosen={mockOnMoveChosen}
        bestMove="e2e4"
        blunderMove="d2d4"
      />
    )

    // Find the button with the correct move (e2e4) and click it
    const buttonA = screen.getByText('A').closest('button')
    const buttonB = screen.getByText('B').closest('button')
    
    // Determine which button has the correct move based on the display text
    let correctButton: HTMLElement | null = null
    if (buttonA && buttonA.textContent?.includes('e2-e4')) {
      correctButton = buttonA
    } else if (buttonB && buttonB.textContent?.includes('e2-e4')) {
      correctButton = buttonB
    }

    expect(correctButton).toBeTruthy()
    
    if (correctButton) {
      fireEvent.click(correctButton)
      
      // Should call onMoveChosen with the correct move and isCorrect=true
      expect(mockOnMoveChosen).toHaveBeenCalledWith('e2e4', true)
    }
  })

  it('should call onMoveChosen with correct parameters for incorrect move', () => {
    render(
      <ArrowDuelMoveSelector
        candidateMoves={['e2e4', 'd2d4']}
        onMoveChosen={mockOnMoveChosen}
        bestMove="e2e4"
        blunderMove="d2d4"
      />
    )

    // Find the button with the incorrect move (d2d4) and click it
    const buttonA = screen.getByText('A').closest('button')
    const buttonB = screen.getByText('B').closest('button')
    
    // Determine which button has the incorrect move based on the display text
    let incorrectButton: HTMLElement | null = null
    if (buttonA && buttonA.textContent?.includes('d2-d4')) {
      incorrectButton = buttonA
    } else if (buttonB && buttonB.textContent?.includes('d2-d4')) {
      incorrectButton = buttonB
    }

    expect(incorrectButton).toBeTruthy()
    
    if (incorrectButton) {
      fireEvent.click(incorrectButton)
      
      // Should call onMoveChosen with the incorrect move and isCorrect=false
      expect(mockOnMoveChosen).toHaveBeenCalledWith('d2d4', false)
    }
  })

  it('should show visual feedback after move selection', () => {
    render(
      <ArrowDuelMoveSelector
        candidateMoves={['e2e4', 'd2d4']}
        onMoveChosen={mockOnMoveChosen}
        bestMove="e2e4"
        blunderMove="d2d4"
        selectedMove="e2e4"
      />
    )

    // Should show success feedback for correct move
    expect(screen.getByText('✅ Correct!')).toBeInTheDocument()
  })

  it('should show error feedback for incorrect move selection', () => {
    render(
      <ArrowDuelMoveSelector
        candidateMoves={['e2e4', 'd2d4']}
        onMoveChosen={mockOnMoveChosen}
        bestMove="e2e4"
        blunderMove="d2d4"
        selectedMove="d2d4"
      />
    )

    // Should show error feedback for incorrect move
    expect(screen.getByText('❌ Not quite')).toBeInTheDocument()
  })

  it('should disable buttons after move selection', () => {
    render(
      <ArrowDuelMoveSelector
        candidateMoves={['e2e4', 'd2d4']}
        onMoveChosen={mockOnMoveChosen}
        bestMove="e2e4"
        blunderMove="d2d4"
        selectedMove="e2e4"
      />
    )

    const buttons = screen.getAllByRole('button')
    
    // All buttons should be disabled after selection
    buttons.forEach(button => {
      expect(button).toBeDisabled()
    })
  })
})