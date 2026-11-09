import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { 
  validateChessComUsername, 
  validateLichessUsername, 
  validateChessUsernames 
} from '@/lib/utils/chess-validation'

// Mock fetch globally
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('chess-validation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('validateChessComUsername', () => {
    it('should return valid for empty username', async () => {
      const result = await validateChessComUsername('')
      expect(result.isValid).toBe(true)
    })

    it('should return valid for existing chess.com user', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ player_id: 12345 })
      })

      const result = await validateChessComUsername('hikaru')
      expect(result.isValid).toBe(true)
      expect(mockFetch).toHaveBeenCalledWith('https://api.chess.com/pub/player/hikaru')
    })

    it('should return invalid for non-existent chess.com user', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}) // No player_id
      })

      const result = await validateChessComUsername('nonexistent')
      expect(result.isValid).toBe(false)
      expect(result.error).toBe('Chess.com account does not exist.')
    })

    it('should return invalid for API error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false
      })

      const result = await validateChessComUsername('testuser')
      expect(result.isValid).toBe(false)
      expect(result.error).toBe('Failed to verify chess.com account.')
    })

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const result = await validateChessComUsername('testuser')
      expect(result.isValid).toBe(false)
      expect(result.error).toBe('Failed to verify chess.com account.')
    })
  })

  describe('validateLichessUsername', () => {
    it('should return valid for empty username', async () => {
      const result = await validateLichessUsername('')
      expect(result.isValid).toBe(true)
    })

    it('should return valid for existing lichess user', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'hikaru' })
      })

      const result = await validateLichessUsername('hikaru')
      expect(result.isValid).toBe(true)
      expect(mockFetch).toHaveBeenCalledWith('https://lichess.org/api/user/hikaru')
    })

    it('should return invalid for non-existent lichess user', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}) // No id
      })

      const result = await validateLichessUsername('nonexistent')
      expect(result.isValid).toBe(false)
      expect(result.error).toBe('Lichess account does not exist.')
    })

    it('should return invalid for API error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false
      })

      const result = await validateLichessUsername('testuser')
      expect(result.isValid).toBe(false)
      expect(result.error).toBe('Failed to verify lichess account.')
    })
  })

  describe('validateChessUsernames', () => {
    it('should return valid for both empty usernames', async () => {
      const result = await validateChessUsernames('', '')
      expect(result.isValid).toBe(true)
    })

    it('should validate both usernames when provided', async () => {
      // Mock chess.com response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ player_id: 12345 })
      })

      // Mock lichess response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'testuser' })
      })

      const result = await validateChessUsernames('testuser', 'testuser')
      expect(result.isValid).toBe(true)
      expect(mockFetch).toHaveBeenCalledTimes(2)
    })

    it('should return error if chess.com validation fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false
      })

      const result = await validateChessUsernames('invalid', 'validlichess')
      expect(result.isValid).toBe(false)
      expect(result.error).toBe('Failed to verify chess.com account.')
    })

    it('should return error if lichess validation fails', async () => {
      // Mock successful chess.com response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ player_id: 12345 })
      })

      // Mock failed lichess response
      mockFetch.mockResolvedValueOnce({
        ok: false
      })

      const result = await validateChessUsernames('validchess', 'invalid')
      expect(result.isValid).toBe(false)
      expect(result.error).toBe('Failed to verify lichess account.')
    })
  })
})
