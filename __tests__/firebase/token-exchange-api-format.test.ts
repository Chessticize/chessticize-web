/**
 * Test for Firebase token exchange API format
 * Verifies that the request format matches the expected backend API
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { checkTokenExchangeEndpoint, exchangeFirebaseToken } from '@/lib/firebase/token-exchange'
import { FirebaseTokenExchangeRequest } from '@/lib/firebase/types'

// Mock Firebase auth
vi.mock('@/lib/firebase/auth', () => ({
  getCurrentUserIdToken: vi.fn(),
}))

// Mock config
vi.mock('@/lib/config', () => ({
  API_CONFIG: {
    BASE_URL: 'http://localhost:8080/api/v2',
  },
  debugLog: vi.fn(),
}))

// Mock fetch
global.fetch = vi.fn()

const mockFetch = vi.mocked(fetch)
const mockGetCurrentUserIdToken = vi.mocked(
  await import('@/lib/firebase/auth')
).getCurrentUserIdToken

describe('Firebase Token Exchange API Format', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should send request with only firebase_token parameter', async () => {
    // Mock Firebase ID token
    const mockFirebaseToken = 'eyJhbGciOiJSUzI1NiIs...'
    mockGetCurrentUserIdToken.mockResolvedValue(mockFirebaseToken)

    // Mock successful API response
    const mockResponse = {
      ok: true,
      status: 201,
      json: vi.fn().mockResolvedValue({
        token: 'custom-api-token',
        user: {
          id: 'user-123',
          email: 'test@example.com',
          firebase_uid: 'test-uid',
        },
      }),
    }
    mockFetch.mockResolvedValue(mockResponse as any)

    // Mock Firebase user
    const mockFirebaseUser = {
      uid: 'test-uid',
      email: 'test@example.com',
      displayName: 'Test User',
      photoURL: 'https://example.com/photo.jpg',
    } as any

    // Call the function
    const response = await exchangeFirebaseToken(mockFirebaseUser, 'google')

    expect(response).toEqual({
      token: 'custom-api-token',
      user_id: 'user-123',
      email: 'test@example.com',
      is_new_user: true,
    })

    // Verify fetch was called with correct parameters
    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:8080/api/v2/auth/firebase-exchange',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          firebase_token: mockFirebaseToken,
        }),
      }
    )
  })

  it('should match the expected request type structure', () => {
    // Verify the TypeScript interface matches expected format
    const expectedRequest: FirebaseTokenExchangeRequest = {
      firebase_token: 'test-token',
    }

    // This test will fail at compile time if the interface doesn't match
    expect(expectedRequest).toHaveProperty('firebase_token')
    expect(Object.keys(expectedRequest)).toEqual(['firebase_token'])
  })

  it('should not include provider or user data in request', async () => {
    // Mock Firebase ID token
    const mockFirebaseToken = 'eyJhbGciOiJSUzI1NiIs...'
    mockGetCurrentUserIdToken.mockResolvedValue(mockFirebaseToken)

    // Mock successful API response
    const mockResponse = {
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({
        token: 'custom-api-token',
        user: {
          id: 'user-123',
          email: 'test@example.com',
          firebase_uid: 'test-uid',
        },
      }),
    }
    mockFetch.mockResolvedValue(mockResponse as any)

    // Mock Firebase user with various properties
    const mockFirebaseUser = {
      uid: 'test-uid',
      email: 'test@example.com',
      displayName: 'Test User',
      photoURL: 'https://example.com/photo.jpg',
    } as any

    // Call the function
    await exchangeFirebaseToken(mockFirebaseUser, 'google')

    // Get the request body that was sent
    const fetchCall = mockFetch.mock.calls[0]
    const requestBody = JSON.parse(fetchCall[1].body as string)

    // Verify only firebase_token is included
    expect(requestBody).toEqual({
      firebase_token: mockFirebaseToken,
    })

    // Verify these fields are NOT included
    expect(requestBody).not.toHaveProperty('provider')
    expect(requestBody).not.toHaveProperty('email')
    expect(requestBody).not.toHaveProperty('display_name')
    expect(requestBody).not.toHaveProperty('photo_url')
    expect(requestBody).not.toHaveProperty('firebase_id_token')
  })

  it('should fail closed without v1 fallback when v2 is not deployed', async () => {
    const mockFirebaseToken = 'eyJhbGciOiJSUzI1NiIs...'
    mockGetCurrentUserIdToken.mockResolvedValue(mockFirebaseToken)

    mockFetch.mockResolvedValue({
      ok: false,
      status: 404,
      text: vi.fn().mockResolvedValue('not found'),
    } as any)

    const mockFirebaseUser = {
      uid: 'test-uid',
      email: 'test@example.com',
    } as any

    await expect(exchangeFirebaseToken(mockFirebaseUser, 'google')).rejects.toThrow(
      'Token exchange failed (404)'
    )

    expect(mockFetch).toHaveBeenCalledTimes(1)
    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:8080/api/v2/auth/firebase-exchange',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ firebase_token: mockFirebaseToken }),
      })
    )
  })

  it('should fail closed without v1 fallback when v2 rejects the method', async () => {
    const mockFirebaseToken = 'eyJhbGciOiJSUzI1NiIs...'
    mockGetCurrentUserIdToken.mockResolvedValue(mockFirebaseToken)

    mockFetch.mockResolvedValue({
      ok: false,
      status: 405,
      text: vi.fn().mockResolvedValue('method not allowed'),
    } as any)

    const mockFirebaseUser = {
      uid: 'test-uid',
      email: 'test@example.com',
    } as any

    await expect(exchangeFirebaseToken(mockFirebaseUser, 'google')).rejects.toThrow(
      'Token exchange failed (405)'
    )

    expect(mockFetch).toHaveBeenCalledTimes(1)
    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:8080/api/v2/auth/firebase-exchange',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ firebase_token: mockFirebaseToken }),
      })
    )
  })

  it('should check only the v2 token exchange endpoint for availability', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 204,
    } as any)

    await expect(checkTokenExchangeEndpoint()).resolves.toBe(true)

    expect(mockFetch).toHaveBeenCalledTimes(1)
    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:8080/api/v2/auth/firebase-exchange',
      {
        method: 'OPTIONS',
      }
    )
  })

  it('should report unavailable without v1 fallback when the v2 token exchange endpoint is missing', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 404,
    } as any)

    await expect(checkTokenExchangeEndpoint()).resolves.toBe(false)

    expect(mockFetch).toHaveBeenCalledTimes(1)
    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:8080/api/v2/auth/firebase-exchange',
      {
        method: 'OPTIONS',
      }
    )
  })

  it('should reject malformed server-shaped token exchange responses', async () => {
    const mockFirebaseToken = 'eyJhbGciOiJSUzI1NiIs...'
    mockGetCurrentUserIdToken.mockResolvedValue(mockFirebaseToken)

    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({
        token: 'custom-api-token',
        user: {
          email: 'test@example.com',
        },
      }),
    } as any)

    const mockFirebaseUser = {
      uid: 'test-uid',
      email: 'test@example.com',
    } as any

    await expect(exchangeFirebaseToken(mockFirebaseUser, 'google')).rejects.toThrow(
      'Invalid token exchange response'
    )
  })
})
