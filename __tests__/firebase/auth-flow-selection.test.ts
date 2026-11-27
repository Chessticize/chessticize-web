/**
 * Tests for Firebase auth domain resolution, mobile redirect selection,
 * and cross-origin-isolated navigation to /auth.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('firebase/app', () => ({
  initializeApp: vi.fn(() => ({ name: 'test-app' })),
  getApps: vi.fn(() => []),
}))

vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(() => ({ config: { apiKey: 'test-key' } })),
  connectAuthEmulator: vi.fn(),
  GoogleAuthProvider: vi.fn(function () {
    return {
      addScope: vi.fn(),
      setCustomParameters: vi.fn(),
    }
  }),
  signInWithEmailAndPassword: vi.fn(),
  createUserWithEmailAndPassword: vi.fn(),
  signInWithEmailLink: vi.fn(),
  sendSignInLinkToEmail: vi.fn(),
  isSignInWithEmailLink: vi.fn(() => false),
  signInWithPopup: vi.fn(),
  signInWithRedirect: vi.fn(),
  getRedirectResult: vi.fn(async () => null),
  sendPasswordResetEmail: vi.fn(),
  updatePassword: vi.fn(),
  sendEmailVerification: vi.fn(),
  signOut: vi.fn(),
  onAuthStateChanged: vi.fn(),
}))

import { navigateToAuth } from '@/lib/auth/navigation'

describe('Firebase Auth Flow Selection & Navigation', () => {
  const originalLocation = window.location
  const originalNavigator = window.navigator

  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    delete process.env.NEXT_PUBLIC_FIREBASE_USE_SAME_ORIGIN_AUTH_DOMAIN
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY = 'test-key'
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN = 'chessticize.firebaseapp.com'
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = 'chessticize'
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET = 'chessticize.firebasestorage.app'
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID = '12345'
    process.env.NEXT_PUBLIC_FIREBASE_APP_ID = '1:12345:web:abc'
  })

  afterEach(() => {
    Object.defineProperty(window, 'location', {
      value: originalLocation,
      writable: true,
      configurable: true,
    })
    Object.defineProperty(window, 'navigator', {
      value: originalNavigator,
      writable: true,
      configurable: true,
    })
    Object.defineProperty(window, 'crossOriginIsolated', {
      value: false,
      writable: true,
      configurable: true,
    })
  })

  it('uses same-origin HTTPS host as authDomain only when opted in', async () => {
    Object.defineProperty(window, 'location', {
      value: {
        protocol: 'https:',
        hostname: 'staging.chessticize.com',
        host: 'staging.chessticize.com',
        origin: 'https://staging.chessticize.com',
      },
      writable: true,
      configurable: true,
    })

    const defaultConfig = await import('@/lib/firebase/config')
    expect(defaultConfig.firebaseConfig.authDomain).toBe('chessticize.firebaseapp.com')
    expect(defaultConfig.isUsingSameOriginAuthDomain()).toBe(false)

    vi.resetModules()
    process.env.NEXT_PUBLIC_FIREBASE_USE_SAME_ORIGIN_AUTH_DOMAIN = 'true'
    const sameOriginConfig = await import('@/lib/firebase/config')
    expect(sameOriginConfig.firebaseConfig.authDomain).toBe('staging.chessticize.com')
    expect(sameOriginConfig.isUsingSameOriginAuthDomain()).toBe(true)
  })

  it('uses redirect flow on iOS only when same-origin authDomain is enabled', async () => {
    Object.defineProperty(window, 'location', {
      value: {
        protocol: 'https:',
        hostname: 'staging.chessticize.com',
        host: 'staging.chessticize.com',
        origin: 'https://staging.chessticize.com',
      },
      writable: true,
      configurable: true,
    })
    Object.defineProperty(window, 'navigator', {
      value: {
        userAgent:
          'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/131.0.0.0 Mobile/15E148 Safari/604.1',
      },
      writable: true,
      configurable: true,
    })

    const crossOriginAuth = await import('@/lib/firebase/auth')
    expect(crossOriginAuth.shouldUseRedirectFlow()).toBe(false)

    vi.resetModules()
    process.env.NEXT_PUBLIC_FIREBASE_USE_SAME_ORIGIN_AUTH_DOMAIN = 'true'
    const sameOriginAuth = await import('@/lib/firebase/auth')
    expect(sameOriginAuth.shouldUseRedirectFlow()).toBe(true)
  })

  it('forces full document navigation to /auth when window.crossOriginIsolated is true', () => {
    const push = vi.fn()
    const assign = vi.fn()

    Object.defineProperty(window, 'location', {
      value: { ...originalLocation, assign },
      writable: true,
      configurable: true,
    })
    Object.defineProperty(window, 'crossOriginIsolated', {
      value: true,
      writable: true,
      configurable: true,
    })

    navigateToAuth({ push })
    expect(assign).toHaveBeenCalledWith('/auth')
    expect(push).not.toHaveBeenCalled()

    Object.defineProperty(window, 'crossOriginIsolated', {
      value: false,
      writable: true,
      configurable: true,
    })
    navigateToAuth({ push })
    expect(push).toHaveBeenCalledWith('/auth')
  })
})
