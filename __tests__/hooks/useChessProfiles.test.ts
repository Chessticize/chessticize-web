import { renderHook, act } from '@testing-library/react'
import { useChessProfiles } from '@/hooks/useChessProfiles'
import { vi } from 'vitest'
import { createChessProfile } from '@/lib/api/auth'

// Mock the auth API functions
vi.mock('@/lib/api/auth', () => ({
  createChessProfile: vi.fn()
}))

// Mock setTimeout
vi.useFakeTimers()

describe('useChessProfiles', () => {
  const mockCreateChessProfile = vi.mocked(createChessProfile)

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.runOnlyPendingTimers()
  })

  it('should initialize with default values', () => {
    const { result } = renderHook(() => useChessProfiles())

    expect(result.current.isCreatingProfile).toBe(false)
    expect(result.current.profileError).toBeNull()
    expect(result.current.successMessage).toBeNull()
    expect(typeof result.current.createChessProfile).toBe('function')
    expect(typeof result.current.clearMessages).toBe('function')
  })

  it('should create chess profile successfully', async () => {
    const mockProfile = {
      id: '1',
      user_id: 'user1',
      platform: 'lichess.org',
      username: 'testuser',
      games_fetched: 0,
      last_game_fetched_at: null,
      last_game_played_at: null,
      updated_at: '2023-01-01T00:00:00Z'
    }

    mockCreateChessProfile.mockResolvedValue(mockProfile)

    const { result } = renderHook(() => useChessProfiles())

    let createdProfile
    await act(async () => {
      createdProfile = await result.current.createChessProfile('lichess.org', 'testuser')
    })

    expect(createdProfile).toEqual(mockProfile)
    expect(result.current.successMessage).toBe('Successfully created lichess.org profile for testuser!')
    expect(result.current.profileError).toBeNull()
    expect(result.current.isCreatingProfile).toBe(false)

    // Test that success message clears after timeout
    act(() => {
      vi.advanceTimersByTime(5000)
    })

    expect(result.current.successMessage).toBeNull()
  })

  it('should handle profile creation error', async () => {
    const mockError = new Error('Username not found')
    mockCreateChessProfile.mockRejectedValue(mockError)

    const { result } = renderHook(() => useChessProfiles())

    await act(async () => {
      try {
        await result.current.createChessProfile('lichess.org', 'invaliduser')
      } catch (error) {
        // Expected to throw
      }
    })

    expect(result.current.profileError).toBe('Username not found')
    expect(result.current.successMessage).toBeNull()
    expect(result.current.isCreatingProfile).toBe(false)
  })

  it('should clear messages', () => {
    const { result } = renderHook(() => useChessProfiles())

    act(() => {
      result.current.clearMessages()
    })

    expect(result.current.profileError).toBeNull()
    expect(result.current.successMessage).toBeNull()
  })
})
