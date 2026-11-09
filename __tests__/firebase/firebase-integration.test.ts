/**
 * Firebase integration tests
 * Tests basic Firebase configuration and availability
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock Firebase modules before importing our code
vi.mock('firebase/app', () => ({
  initializeApp: vi.fn(() => ({ name: 'test-app' })),
  getApps: vi.fn(() => []),
}))

vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(() => ({ config: { apiKey: 'test-key', authDomain: 'test-project.firebaseapp.com' } })),
  connectAuthEmulator: vi.fn(),
  GoogleAuthProvider: vi.fn(function () { return ({
    addScope: vi.fn(),
    setCustomParameters: vi.fn(),
    scopes: ['email', 'profile'],
  }) }),
  signInWithEmailAndPassword: vi.fn(),
  createUserWithEmailAndPassword: vi.fn(),
  signInWithEmailLink: vi.fn(),
  sendSignInLinkToEmail: vi.fn(),
  isSignInWithEmailLink: vi.fn(() => false),
  signInWithPopup: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
  updatePassword: vi.fn(),
  sendEmailVerification: vi.fn(),
  signOut: vi.fn(),
  onAuthStateChanged: vi.fn(),
}))

// Mock environment variables
vi.mock('@/lib/env', () => ({
  env: {
    NEXT_PUBLIC_FIREBASE_API_KEY: 'test-api-key',
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: 'test-project.firebaseapp.com',
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: 'test-project',
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: 'test-project.appspot.com',
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: '123456789',
    NEXT_PUBLIC_FIREBASE_APP_ID: '1:123456789:web:abcdef123456',
    NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID: 'G-XXXXXXXXXX',
  },
  isDevelopment: true,
}))

describe('Firebase Configuration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should have valid Firebase configuration', async () => {
    const { firebaseConfig, isFirebaseConfigured } = await import('@/lib/firebase/config')
    
    expect(isFirebaseConfigured()).toBe(true)
    expect(firebaseConfig).toEqual({
      apiKey: 'test-api-key',
      authDomain: 'test-project.firebaseapp.com',
      projectId: 'test-project',
      storageBucket: 'test-project.appspot.com',
      messagingSenderId: '123456789',
      appId: '1:123456789:web:abcdef123456',
      measurementId: 'G-XXXXXXXXXX',
    })
  })

  it('should initialize Firebase app', async () => {
    const { getFirebaseApp } = await import('@/lib/firebase/config')
    
    const app = getFirebaseApp()
    expect(app).toBeDefined()
    expect(app?.name).toBe('test-app')
  })

  it('should initialize Firebase auth', async () => {
    const { getFirebaseAuth } = await import('@/lib/firebase/config')
    
    const auth = getFirebaseAuth()
    expect(auth).toBeDefined()
    expect(auth?.config.apiKey).toBe('test-key')
  })

  it('should validate Firebase configuration', async () => {
    const { validateFirebaseConfig } = await import('@/lib/firebase/config')
    
    const validation = validateFirebaseConfig()
    expect(validation.isValid).toBe(true)
    expect(validation.missingFields).toEqual([])
    expect(validation.warnings).toEqual([])
  })

  it('should detect Firebase availability', async () => {
    const { isFirebaseAvailable } = await import('@/lib/firebase/config')
    
    expect(isFirebaseAvailable()).toBe(true)
  })
})

describe('Firebase Configuration - Missing Values', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Mock missing configuration
    vi.doMock('@/lib/env', () => ({
      env: {
        NEXT_PUBLIC_FIREBASE_API_KEY: '',
        NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: '',
        NEXT_PUBLIC_FIREBASE_PROJECT_ID: '',
        NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: '',
        NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: '',
        NEXT_PUBLIC_FIREBASE_APP_ID: '',
        NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID: '',
      },
      isDevelopment: true,
    }))
  })

  it('should detect incomplete configuration', async () => {
    // Re-import with mocked env
    vi.resetModules()
    const { isFirebaseConfigured, validateFirebaseConfig } = await import('@/lib/firebase/config')
    
    expect(isFirebaseConfigured()).toBe(false)
    
    const validation = validateFirebaseConfig()
    expect(validation.isValid).toBe(false)
    expect(validation.missingFields.length).toBeGreaterThan(0)
  })

  it('should return null for Firebase app when not configured', async () => {
    vi.resetModules()
    const { getFirebaseApp } = await import('@/lib/firebase/config')
    
    const app = getFirebaseApp()
    expect(app).toBeNull()
  })

  it('should return null for Firebase auth when not configured', async () => {
    vi.resetModules()
    const { getFirebaseAuth } = await import('@/lib/firebase/config')
    
    const auth = getFirebaseAuth()
    expect(auth).toBeNull()
  })
})

describe('Firebase Types', () => {
  it('should export Firebase error codes', async () => {
    const { FIREBASE_ERROR_CODES } = await import('@/lib/firebase/types')
    
    expect(FIREBASE_ERROR_CODES.INVALID_EMAIL).toBe('auth/invalid-email')
    expect(FIREBASE_ERROR_CODES.USER_NOT_FOUND).toBe('auth/user-not-found')
    expect(FIREBASE_ERROR_CODES.WRONG_PASSWORD).toBe('auth/wrong-password')
    expect(FIREBASE_ERROR_CODES.EMAIL_ALREADY_IN_USE).toBe('auth/email-already-in-use')
  })
})

describe('Token Exchange', () => {
  it('should validate token exchange response', async () => {
    const { validateTokenExchangeResponse } = await import('@/lib/firebase/token-exchange')
    
    const validResponse = {
      token: 'custom-api-token',
      user_id: 'user-123',
      email: 'test@example.com',
      is_new_user: false,
      session_token: 'session-token',
    }
    
    expect(validateTokenExchangeResponse(validResponse)).toBe(true)
    
    const invalidResponse = {
      token: 'custom-api-token',
      // missing required fields
    }
    
    expect(validateTokenExchangeResponse(invalidResponse)).toBe(false)
  })

  it('should get provider display names', async () => {
    const { getProviderDisplayName } = await import('@/lib/firebase/token-exchange')
    
    expect(getProviderDisplayName('email')).toBe('Email/Password')
    expect(getProviderDisplayName('emailLink')).toBe('Magic Link')
    expect(getProviderDisplayName('google')).toBe('Google')
  })

  it('should handle token exchange errors', async () => {
    const { handleTokenExchangeError } = await import('@/lib/firebase/token-exchange')
    
    expect(handleTokenExchangeError(new Error('Network error'))).toContain('Network error')
    expect(handleTokenExchangeError(new Error('Unauthorized 401'))).toContain('Authentication failed')
    expect(handleTokenExchangeError(new Error('Server error 500'))).toContain('Server error')
  })
})
