/**
 * Tests for authenticated API client
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { apiRequest, apiGet, apiPost, refreshAuthToken } from '@/lib/auth/api-client'
import * as tokens from '@/lib/auth/tokens'
import * as firebaseAuth from '@/lib/firebase/auth'

// Mock the tokens module (Firebase-first auth)
vi.mock('@/lib/auth/tokens', () => ({
  getAuthToken: vi.fn(),
  updateAuthToken: vi.fn(),
  clearTokens: vi.fn(),
  getAuthMethod: vi.fn(() => 'firebase'),
  getFirebaseUser: vi.fn(() => ({ uid: 'user-123', email: 'test@example.com' })),
  getFirebaseProvider: vi.fn(() => 'google'),
  hasFirebaseAuth: vi.fn(() => true),
}))

// Mock Firebase auth/helpers used by refreshAuthToken
vi.mock('@/lib/firebase/auth', () => ({
  getCurrentFirebaseUser: vi.fn(() => ({ uid: 'user-123', email: 'test@example.com' })),
  getCurrentUserIdToken: vi.fn(async () => 'firebase-id-token'),
  isFirebaseAvailable: vi.fn(() => true),
}))

// Hoistable mocks for token exchange to avoid hoisting pitfalls
const hoisted = vi.hoisted(() => ({
  mockRefreshFirebaseTokens: vi.fn(async () => 'new-token')
}))
vi.mock('@/lib/firebase/token-exchange', () => ({
  refreshFirebaseTokens: hoisted.mockRefreshFirebaseTokens,
  handleTokenExchangeError: vi.fn((e: any) => String(e)),
}))

// Mock fetch
global.fetch = vi.fn()

const mockTokens = vi.mocked(tokens)
const mockFetch = vi.mocked(fetch)


describe('API Client', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('apiRequest', () => {
    it('should make request without auth when skipAuth is true', async () => {
      const mockResponse = new Response('{"success": true}', { status: 200 })
      mockFetch.mockResolvedValue(mockResponse)

      await apiRequest('/test', {}, true)

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v2/test'),
        expect.objectContaining({
          headers: expect.not.objectContaining({
            Authorization: expect.any(String)
          })
        })
      )
    })

    it('should add auth header when auth token exists', async () => {
      const mockResponse = new Response('{"success": true}', { status: 200 })
      mockFetch.mockResolvedValue(mockResponse)
      mockTokens.getAuthToken.mockReturnValue('test-token')

      await apiRequest('/test')

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v2/test'),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token'
          })
        })
      )
    })

    it('should handle 401 error and attempt token refresh (Firebase flow)', async () => {
      const unauthorizedResponse = new Response('Unauthorized', { status: 401 })
      const successResponse = new Response('{"success": true}', { status: 200 })

      mockFetch
        .mockResolvedValueOnce(unauthorizedResponse) // First request fails with 401
        .mockResolvedValueOnce(successResponse)      // Retry request succeeds after refresh

      mockTokens.getAuthToken.mockReturnValue('old-token')

      const result = await apiRequest('/test')

      expect(result.status).toBe(200)
      // Ensure Firebase refresh path was called
      expect(hoisted.mockRefreshFirebaseTokens).toHaveBeenCalled()
    })
  })

  describe('refreshAuthToken', () => {
    it('should refresh token successfully (Firebase)', async () => {
      const result = await refreshAuthToken()

      expect(result).toBe(true)
      expect(hoisted.mockRefreshFirebaseTokens).toHaveBeenCalled()
    })

    it('should return false when Firebase is not available', async () => {
      // Set mocked isFirebaseAvailable to false
      vi.mocked(firebaseAuth).isFirebaseAvailable.mockReturnValue(false as any)

      const result = await refreshAuthToken()

      expect(result).toBe(false)

      // Restore default true for other tests
      vi.mocked(firebaseAuth).isFirebaseAvailable.mockReturnValue(true as any)
    })

    it('should return false when refresh request fails (Firebase)', async () => {

      hoisted.mockRefreshFirebaseTokens.mockRejectedValueOnce(new Error('exchange failed'))

      const result = await refreshAuthToken()

      expect(result).toBe(false)
    })
  })

  describe('convenience methods', () => {
    beforeEach(() => {
      const mockResponse = new Response('{"success": true}', { status: 200 })
      mockFetch.mockResolvedValue(mockResponse)
    })

    it('should make GET request', async () => {
      await apiGet('/test')

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v2/test'),
        expect.objectContaining({
          method: 'GET'
        })
      )
    })

    it('should make POST request with data', async () => {
      const data = { test: 'data' }
      await apiPost('/test', data)

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v2/test'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(data)
        })
      )
    })
  })
})
