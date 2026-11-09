/**
 * Tests for token management utilities
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import Cookies from 'js-cookie'
import {
  storeTokens,
  getAuthToken,
  getTokenExpiry,
  needsTokenRefresh,
  hasValidAuth,
  clearTokens,
  updateAuthToken,
  getTokenData,
} from '@/lib/auth/tokens'
import { TOKEN_CONFIG } from '@/lib/config'

// Mock js-cookie
vi.mock('js-cookie', () => ({
  default: {
    set: vi.fn(),
    get: vi.fn(),
    remove: vi.fn(),
  },
}))

const mockCookies = vi.mocked(Cookies)

describe('Token Management', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('storeTokens', () => {
    it('should store auth token and expiry', () => {
      const authToken = 'test-auth-token'

      storeTokens(authToken, 60)

      expect(mockCookies.set).toHaveBeenCalledWith(
        TOKEN_CONFIG.AUTH_TOKEN_COOKIE,
        authToken,
        TOKEN_CONFIG.COOKIE_OPTIONS
      )

      expect(mockCookies.set).toHaveBeenCalledWith(
        TOKEN_CONFIG.TOKEN_EXPIRY_COOKIE,
        expect.any(String),
        TOKEN_CONFIG.COOKIE_OPTIONS
      )
    })

    it('should store auth token with default expiry when not specified', () => {
      const authToken = 'test-auth-token'

      storeTokens(authToken)

      expect(mockCookies.set).toHaveBeenCalledWith(
        TOKEN_CONFIG.AUTH_TOKEN_COOKIE,
        authToken,
        TOKEN_CONFIG.COOKIE_OPTIONS
      )
    })
  })

  describe('getAuthToken', () => {
    it('should return auth token from cookies', () => {
      const token = 'test-auth-token'
      mockCookies.get.mockReturnValue(token)
      
      const result = getAuthToken()
      
      expect(mockCookies.get).toHaveBeenCalledWith(TOKEN_CONFIG.AUTH_TOKEN_COOKIE)
      expect(result).toBe(token)
    })

    it('should return null if no token exists', () => {
      mockCookies.get.mockReturnValue(undefined)
      
      const result = getAuthToken()
      
      expect(result).toBeNull()
    })
  })

  describe('needsTokenRefresh', () => {
    it('should return true if no expiry time exists', () => {
      mockCookies.get.mockReturnValue(undefined)
      
      const result = needsTokenRefresh()
      
      expect(result).toBe(true)
    })

    it('should return true if token expires within buffer time', () => {
      const nearExpiry = new Date(Date.now() + 2 * 60 * 1000) // 2 minutes from now
      mockCookies.get.mockReturnValue(nearExpiry.toISOString())
      
      const result = needsTokenRefresh()
      
      expect(result).toBe(true)
    })

    it('should return false if token has plenty of time left', () => {
      const farExpiry = new Date(Date.now() + 30 * 60 * 1000) // 30 minutes from now
      mockCookies.get.mockReturnValue(farExpiry.toISOString())
      
      const result = needsTokenRefresh()
      
      expect(result).toBe(false)
    })
  })

  describe('hasValidAuth', () => {
    it('should return true if auth token exists', () => {
      mockCookies.get.mockImplementation((key) => {
        if (key === TOKEN_CONFIG.AUTH_TOKEN_COOKIE) return 'auth-token'
        return undefined
      })

      const result = hasValidAuth()

      expect(result).toBe(true)
    })

    it('should return false if no tokens exist', () => {
      mockCookies.get.mockReturnValue(undefined)
      
      const result = hasValidAuth()
      
      expect(result).toBe(false)
    })
  })

  describe('clearTokens', () => {
    it('should remove all tokens', () => {
      clearTokens()

      expect(mockCookies.remove).toHaveBeenCalledWith(TOKEN_CONFIG.AUTH_TOKEN_COOKIE)
      expect(mockCookies.remove).toHaveBeenCalledWith(TOKEN_CONFIG.TOKEN_EXPIRY_COOKIE)
    })
  })
})
