import { renderHook } from '@testing-library/react'
import { useStockfish } from '@/hooks/useStockfish'
import { vi } from 'vitest'

// Mock the Worker constructor for testing
global.Worker = vi.fn().mockImplementation(() => ({
  postMessage: vi.fn(),
  onmessage: null,
  terminate: vi.fn(),
}))

describe('useStockfish', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should initialize with default analysis state', () => {
    const { result } = renderHook(() => useStockfish())

    expect(result.current.analysis).toEqual({
      evaluation: 0,
      bestMove: '',
      depth: 0,
      isAnalyzing: false,
      topLines: [],
      currentPosition: ''
    })
  })

  it('should provide analysis functions', () => {
    const { result } = renderHook(() => useStockfish())

    expect(typeof result.current.analyzePosition).toBe('function')
    expect(typeof result.current.stopAnalysis).toBe('function')
    expect(typeof result.current.initEngine).toBe('function')
    expect(typeof result.current.isEngineReady).toBe('boolean')
  })

  it('should handle stop analysis call', () => {
    const { result } = renderHook(() => useStockfish())

    // Should not throw when calling stopAnalysis
    expect(() => {
      result.current.stopAnalysis()
    }).not.toThrow()

    expect(result.current.analysis.isAnalyzing).toBe(false)
  })

  it('should provide engine ready status', () => {
    const { result } = renderHook(() => useStockfish())

    // Should provide a boolean value for engine ready status
    expect(typeof result.current.isEngineReady).toBe('boolean')
  })

  it('should handle race condition gracefully', () => {
    const { result } = renderHook(() => useStockfish())

    // Test that the hook doesn't crash when rapid position changes occur
    // This simulates the race condition scenario where UCI moves from
    // an old position are processed after the position has changed
    expect(() => {
      // Multiple rapid calls should not cause issues
      result.current.analyzePosition('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', 10)
      result.current.analyzePosition('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1', 10)
      result.current.analyzePosition('rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 2', 10)
    }).not.toThrow()

    // The analysis state should be consistent
    expect(result.current.analysis).toBeDefined()
    expect(typeof result.current.analysis.isAnalyzing).toBe('boolean')
  })
})
