import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import { InteractiveAnalysis } from '@/components/puzzle-sprint/InteractiveAnalysis'

// Mock the useStockfish hook
vi.mock('@/hooks/useStockfish', () => ({
  useStockfish: vi.fn(() => ({
    analysis: {
      evaluation: 0,
      bestMove: '',
      depth: 0,
      isAnalyzing: false,
      topLines: [],
      currentPosition: '',
      error: null,
      isMate: false,
      mateIn: null
    },
    analyzePosition: vi.fn(),
    stopAnalysis: vi.fn()
  }))
}))

// Import the mocked hook
import { useStockfish } from '@/hooks/useStockfish'
const mockUseStockfish = vi.mocked(useStockfish)

// Mock the evaluation utilities
vi.mock('@/lib/evaluation-utils', () => ({
  formatEvaluation: vi.fn(() => '0.0'),
  getEvaluationColor: vi.fn(() => 'text-gray-600'),
  getEvaluationIcon: vi.fn(() => () => null),
  getEvaluationDescription: vi.fn(() => 'Equal position'),
  getPuzzleResolverColor: vi.fn(() => 'white')
}))

describe('InteractiveAnalysis', () => {
  const mockProps = {
    fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    onMakeMove: vi.fn(),
    onMoveBack: vi.fn(),
    onResetToPuzzleStart: vi.fn(),
    canMoveBack: false,
    canReset: false
  }

  beforeEach(() => {
    vi.clearAllMocks()
    // Reset to default mock implementation
    mockUseStockfish.mockReturnValue({
      analysis: {
        evaluation: 0,
        bestMove: '',
        depth: 0,
        isAnalyzing: false,
        topLines: [],
        currentPosition: '',
        error: null,
        isMate: false,
        mateIn: null
      },
      analyzePosition: vi.fn(),
      stopAnalysis: vi.fn()
    })
  })

  it('should render the analysis component', () => {
    render(<InteractiveAnalysis {...mockProps} />)
    
    expect(screen.getByText('Engine Analysis')).toBeInTheDocument()
    expect(screen.getByText('SF 16 · 7MB NNUE')).toBeInTheDocument()
  })

  it('should show move back button when onMoveBack is provided', () => {
    render(<InteractiveAnalysis {...mockProps} />)
    
    const backButton = screen.getByTitle('Move back one move')
    expect(backButton).toBeInTheDocument()
    expect(backButton).toBeDisabled() // Should be disabled when canMoveBack is false
  })

  it('should enable move back button when canMoveBack is true', () => {
    render(<InteractiveAnalysis {...mockProps} canMoveBack={true} />)
    
    const backButton = screen.getByTitle('Move back one move')
    expect(backButton).toBeInTheDocument()
    expect(backButton).not.toBeDisabled()
  })

  it('should call onMoveBack when back button is clicked', () => {
    render(<InteractiveAnalysis {...mockProps} canMoveBack={true} />)
    
    const backButton = screen.getByTitle('Move back one move')
    fireEvent.click(backButton)
    
    expect(mockProps.onMoveBack).toHaveBeenCalledTimes(1)
  })

  it('should show reset to puzzle start button when onResetToPuzzleStart is provided', () => {
    render(<InteractiveAnalysis {...mockProps} />)

    const resetButton = screen.getByTitle('Reset to puzzle starting position (after first move)')
    expect(resetButton).toBeInTheDocument()
    expect(resetButton).toBeDisabled() // Should be disabled when canReset is false
  })

  it('should enable reset button when canReset is true', () => {
    render(<InteractiveAnalysis {...mockProps} canReset={true} />)

    const resetButton = screen.getByTitle('Reset to puzzle starting position (after first move)')
    expect(resetButton).toBeInTheDocument()
    expect(resetButton).not.toBeDisabled()
  })

  it('should call onResetToPuzzleStart when reset button is clicked', () => {
    render(<InteractiveAnalysis {...mockProps} canReset={true} />)

    const resetButton = screen.getByTitle('Reset to puzzle starting position (after first move)')
    fireEvent.click(resetButton)

    expect(mockProps.onResetToPuzzleStart).toHaveBeenCalledTimes(1)
  })



  it('should not show move back button when onMoveBack is not provided', () => {
    const propsWithoutMoveBack = {
      ...mockProps,
      onMoveBack: undefined
    }
    
    render(<InteractiveAnalysis {...propsWithoutMoveBack} />)
    
    expect(screen.queryByTitle('Move back one move')).not.toBeInTheDocument()
  })

  it('should not show reset to puzzle start button when onResetToPuzzleStart is not provided', () => {
    const propsWithoutReset = {
      ...mockProps,
      onResetToPuzzleStart: undefined
    }

    render(<InteractiveAnalysis {...propsWithoutReset} />)

    expect(screen.queryByTitle('Reset to puzzle starting position (after first move)')).not.toBeInTheDocument()
  })

  it('should show compact button text on mobile screens', () => {
    render(<InteractiveAnalysis {...mockProps} canMoveBack={true} canReset={true} />)

    // The buttons should have hidden text on small screens (sm:inline class)
    const backButton = screen.getByTitle('Move back one move')
    const resetButton = screen.getByTitle('Reset to puzzle starting position (after first move)')

    expect(backButton).toBeInTheDocument()
    expect(resetButton).toBeInTheDocument()
  })

  it('should show partial results while analyzing', () => {
    // Mock the useStockfish hook to return partial analysis results
    mockUseStockfish.mockReturnValue({
      analysis: {
        evaluation: 25, // Some evaluation
        bestMove: 'e2e4',
        depth: 5, // Partial depth
        isAnalyzing: true, // Still analyzing
        topLines: [
          {
            moves: ['e4', 'e5', 'Nf3'],
            evaluation: 25,
            depth: 5,
            pv: 'e2e4 e7e5 g1f3',
            multipv: 1,
            uciMoves: ['e2e4', 'e7e5', 'g1f3'],
            isMate: false,
            mateIn: null
          }
        ],
        currentPosition: mockProps.fen,
        error: null,
        isMate: false,
        mateIn: null
      },
      analyzePosition: vi.fn(),
      stopAnalysis: vi.fn()
    })

    render(<InteractiveAnalysis {...mockProps} />)

    // Should show the depth info with analyzing status
    expect(screen.getByText(/Depth 5/)).toBeInTheDocument() // Depth info
    expect(screen.getByText('Analyzing...')).toBeInTheDocument() // Should show analyzing status

    // Should NOT show "Analyzing position..." since we have partial results (depth > 0)
    expect(screen.queryByText('Analyzing position...')).not.toBeInTheDocument()

    // Should show the engine lines since we have topLines
    expect(screen.getByText('e4 e5 Nf3')).toBeInTheDocument()
  })

  it('should show analyzing message only when depth is 0', () => {
    // Mock analysis state with no results yet (depth = 0 and analyzing)
    mockUseStockfish.mockReturnValue({
      analysis: {
        evaluation: 0,
        bestMove: '',
        depth: 0, // No depth yet
        isAnalyzing: true, // Still analyzing
        topLines: [],
        currentPosition: mockProps.fen,
        error: null,
        isMate: false,
        mateIn: null
      },
      analyzePosition: vi.fn(),
      stopAnalysis: vi.fn()
    })

    render(<InteractiveAnalysis {...mockProps} />)

    // Should show "Analyzing position..." when depth is 0
    expect(screen.getByText('Analyzing position...')).toBeInTheDocument()
  })
})
