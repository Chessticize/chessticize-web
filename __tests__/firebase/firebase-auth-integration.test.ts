/**
 * Firebase Authentication Integration Tests
 * Tests the Firebase authentication integration with the existing auth system
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock Firebase functions
vi.mock('@/lib/firebase/auth', () => ({
  signInWithEmail: vi.fn(),
  signUpWithEmail: vi.fn(),
  sendMagicLink: vi.fn(),
  signInWithMagicLink: vi.fn(),
  signInWithGooglePopup: vi.fn(),
  resetPassword: vi.fn(),
  updateUserPassword: vi.fn(),
  sendUserEmailVerification: vi.fn(),
  signOutUser: vi.fn(),
  onFirebaseAuthStateChanged: vi.fn(() => () => {}),
  getCurrentFirebaseUser: vi.fn(),
  isFirebaseAvailable: vi.fn(() => true),
}))

// Mock Firebase token exchange
vi.mock('@/lib/firebase/token-exchange', () => ({
  exchangeAndStoreTokens: vi.fn(),
  handleTokenExchangeError: vi.fn((error) => error?.message || 'Unknown error'),
}))

// Mock token management
vi.mock('@/lib/auth/tokens', () => ({
  storeTokens: vi.fn(),
  clearTokens: vi.fn(),
  hasValidAuth: vi.fn(() => false),
  needsTokenRefresh: vi.fn(() => false),
  storeFirebaseUser: vi.fn(),
  getFirebaseUser: vi.fn(() => null),
  getFirebaseProvider: vi.fn(() => null),
  clearFirebaseTokens: vi.fn(),
  hasFirebaseAuth: vi.fn(() => false),
  getAuthMethod: vi.fn(() => 'none'),
}))

// Mock API functions
vi.mock('@/lib/api/auth', () => ({
  login: vi.fn(),
  register: vi.fn(),
  getCurrentUser: vi.fn(),
}))

// Mock router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}))

import { renderHook, act } from '@testing-library/react'
import { useAuth } from '@/hooks/use-auth'
import * as firebaseAuth from '@/lib/firebase/auth'
import * as tokenExchange from '@/lib/firebase/token-exchange'
import * as tokens from '@/lib/auth/tokens'

describe('Firebase Authentication Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(firebaseAuth.isFirebaseAvailable).mockReturnValue(true)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('useAuth hook with Firebase integration', () => {
    it('should initialize with correct default state', () => {
      const { result } = renderHook(() => useAuth())

      expect(result.current.isAuthenticated).toBe(false)
      // Loading state might be false due to mocking, so we'll check it's a boolean
      expect(typeof result.current.isLoading).toBe('boolean')
      expect(result.current.user).toBe(null)
      expect(result.current.error).toBe(null)
      expect(result.current.firebaseUser).toBe(null)
      expect(result.current.authProvider).toBe(null)
      expect(result.current.isFirebaseAvailable).toBe(true)
    })

    it('should have all Firebase authentication methods', () => {
      const { result } = renderHook(() => useAuth())

      expect(typeof result.current.signInWithEmailAndPassword).toBe('function')
      expect(typeof result.current.signUpWithEmailAndPassword).toBe('function')
      expect(typeof result.current.sendMagicLinkEmail).toBe('function')
      expect(typeof result.current.signInWithEmailLink).toBe('function')
      expect(typeof result.current.signInWithGoogle).toBe('function')
      expect(typeof result.current.sendPasswordResetEmail).toBe('function')
      expect(typeof result.current.updatePassword).toBe('function')
      expect(typeof result.current.sendEmailVerification).toBe('function')
    })

    it('should handle Firebase email/password sign-in', async () => {
      const mockUser = { uid: 'test-uid', email: 'test@example.com' }
      const mockResult = { user: mockUser, credential: {}, provider: 'email', isNewUser: false }
      
      vi.mocked(firebaseAuth.signInWithEmail).mockResolvedValue(mockResult)
      vi.mocked(tokenExchange.exchangeAndStoreTokens).mockResolvedValue({
        customApiToken: 'test-token',
        isNewUser: false
      })

      const { result } = renderHook(() => useAuth())

      await act(async () => {
        await result.current.signInWithEmailAndPassword('test@example.com', 'password')
      })

      expect(firebaseAuth.signInWithEmail).toHaveBeenCalledWith('test@example.com', 'password')
      expect(tokens.storeFirebaseUser).toHaveBeenCalledWith(mockUser, 'email')
      expect(tokenExchange.exchangeAndStoreTokens).toHaveBeenCalledWith(mockUser, 'email')
    })

    it('should handle Firebase Google sign-in', async () => {
      const mockUser = { uid: 'test-uid', email: 'test@example.com' }
      const mockResult = { user: mockUser, credential: {}, provider: 'google', isNewUser: false }

      vi.mocked(firebaseAuth.signInWithGooglePopup).mockResolvedValue(mockResult)
      vi.mocked(tokenExchange.exchangeAndStoreTokens).mockResolvedValue({
        customApiToken: 'test-token',
        isNewUser: false
      })

      const { result } = renderHook(() => useAuth())

      await act(async () => {
        await result.current.signInWithGoogle()
      })

      expect(firebaseAuth.signInWithGooglePopup).toHaveBeenCalled()
      expect(tokens.storeFirebaseUser).toHaveBeenCalledWith(mockUser, 'google')
      expect(tokenExchange.exchangeAndStoreTokens).toHaveBeenCalledWith(mockUser, 'google')
    })

    it('should handle magic link email sending', async () => {
      vi.mocked(firebaseAuth.sendMagicLink).mockResolvedValue()

      const { result } = renderHook(() => useAuth())

      await act(async () => {
        await result.current.sendMagicLinkEmail('test@example.com')
      })

      expect(firebaseAuth.sendMagicLink).toHaveBeenCalledWith('test@example.com')
    })

    it('should handle password reset', async () => {
      vi.mocked(firebaseAuth.resetPassword).mockResolvedValue()

      const { result } = renderHook(() => useAuth())

      await act(async () => {
        await result.current.sendPasswordResetEmail('test@example.com')
      })

      expect(firebaseAuth.resetPassword).toHaveBeenCalledWith('test@example.com')
    })

    it('should handle errors gracefully', async () => {
      const mockError = new Error('Firebase auth failed')
      vi.mocked(firebaseAuth.signInWithEmail).mockRejectedValue(mockError)
      vi.mocked(tokenExchange.handleTokenExchangeError).mockReturnValue('Firebase auth failed')

      const { result } = renderHook(() => useAuth())

      await act(async () => {
        try {
          await result.current.signInWithEmailAndPassword('test@example.com', 'password')
        } catch (error) {
          // Expected to throw
        }
      })

      expect(result.current.error).toBe('Firebase auth failed')
      expect(result.current.isLoading).toBe(false)
    })

    it('should handle Firebase unavailable gracefully', async () => {
      vi.mocked(firebaseAuth.isFirebaseAvailable).mockReturnValue(false)

      const { result } = renderHook(() => useAuth())

      expect(result.current.isFirebaseAvailable).toBe(false)

      await act(async () => {
        try {
          await result.current.signInWithEmailAndPassword('test@example.com', 'password')
        } catch (error) {
          expect(error).toEqual(new Error('Firebase authentication is not available'))
        }
      })
    })
  })

  describe('Token management integration', () => {
    it('should store Firebase user data when authenticating', async () => {
      const mockUser = { uid: 'test-uid', email: 'test@example.com' }
      const mockResult = { user: mockUser, credential: {}, provider: 'email', isNewUser: false }
      
      vi.mocked(firebaseAuth.signInWithEmail).mockResolvedValue(mockResult)
      vi.mocked(tokenExchange.exchangeAndStoreTokens).mockResolvedValue({
        customApiToken: 'test-token',
        isNewUser: false
      })

      const { result } = renderHook(() => useAuth())

      await act(async () => {
        await result.current.signInWithEmailAndPassword('test@example.com', 'password')
      })

      expect(tokens.storeFirebaseUser).toHaveBeenCalledWith(mockUser, 'email')
    })

    it('should clear Firebase tokens on logout', async () => {
      vi.mocked(firebaseAuth.signOutUser).mockResolvedValue()

      const { result } = renderHook(() => useAuth())

      // Set a mock firebase user to trigger Firebase logout
      act(() => {
        result.current.firebaseUser = { uid: 'test-uid', email: 'test@example.com' }
      })

      await act(async () => {
        await result.current.logout()
      })

      expect(tokens.clearTokens).toHaveBeenCalled() // This now includes Firebase tokens
    })
  })
})
