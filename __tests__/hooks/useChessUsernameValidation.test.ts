import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useChessUsernameValidation } from '@/hooks/useChessUsernameValidation'

// Mock fetch globally
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('useChessUsernameValidation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should initialize with null validation states', () => {
    const { result } = renderHook(() => useChessUsernameValidation())

    expect(result.current.chessComValidation).toEqual({
      isValidating: false,
      isValid: null
    })
    expect(result.current.lichessValidation).toEqual({
      isValidating: false,
      isValid: null
    })
  })

  it('should validate chess.com username successfully', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ player_id: 12345 })
    })

    const { result } = renderHook(() => useChessUsernameValidation())

    await act(async () => {
      await result.current.validateChessComUsernameAsync('hikaru')
    })

    expect(result.current.chessComValidation).toEqual({
      isValidating: false,
      isValid: true
    })
    expect(mockFetch).toHaveBeenCalledWith('https://api.chess.com/pub/player/hikaru')
  })

  it('should handle invalid chess.com username', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({}) // No player_id
    })

    const { result } = renderHook(() => useChessUsernameValidation())

    await act(async () => {
      await result.current.validateChessComUsernameAsync('nonexistent')
    })

    expect(result.current.chessComValidation).toEqual({
      isValidating: false,
      isValid: false,
      error: 'Chess.com account does not exist.'
    })
  })

  it('should validate lichess username successfully', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 'hikaru' })
    })

    const { result } = renderHook(() => useChessUsernameValidation())

    await act(async () => {
      await result.current.validateLichessUsernameAsync('hikaru')
    })

    expect(result.current.lichessValidation).toEqual({
      isValidating: false,
      isValid: true
    })
    expect(mockFetch).toHaveBeenCalledWith('https://lichess.org/api/user/hikaru')
  })

  it('should handle empty usernames', async () => {
    const { result } = renderHook(() => useChessUsernameValidation())

    await act(async () => {
      await result.current.validateChessComUsernameAsync('')
    })

    expect(result.current.chessComValidation).toEqual({
      isValidating: false,
      isValid: null
    })
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('should clear validation states', async () => {
    // First set some validation states
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ player_id: 12345 })
    })

    const { result } = renderHook(() => useChessUsernameValidation())

    await act(async () => {
      await result.current.validateChessComUsernameAsync('hikaru')
    })

    expect(result.current.chessComValidation.isValid).toBe(true)

    // Now clear validation
    act(() => {
      result.current.clearValidation()
    })

    expect(result.current.chessComValidation).toEqual({
      isValidating: false,
      isValid: null
    })
    expect(result.current.lichessValidation).toEqual({
      isValidating: false,
      isValid: null
    })
  })

  it('should handle network errors', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'))

    const { result } = renderHook(() => useChessUsernameValidation())

    await act(async () => {
      await result.current.validateChessComUsernameAsync('testuser')
    })

    expect(result.current.chessComValidation).toEqual({
      isValidating: false,
      isValid: false,
      error: 'Failed to verify chess.com account.'
    })
  })
})
