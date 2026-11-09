/**
 * Authentication hook
 * Provides authentication state and methods with Firebase integration
 */

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  getCurrentUser
} from '@/lib/api/auth'
import {
  clearTokens,
  hasValidAuth,
  needsTokenRefresh,
  storeFirebaseUser
} from '@/lib/auth/tokens'
import { refreshAuthToken } from '@/lib/auth/api-client'
import { APP_CONFIG, debugLog } from '@/lib/config'
import {
  AuthState
} from '@/lib/auth/types'

// Firebase imports
import {
  signInWithEmail,
  signUpWithEmail,
  sendMagicLink,
  signInWithMagicLink,
  signInWithGooglePopup,
  resetPassword,
  updateUserPassword,
  sendUserEmailVerification,
  signOutUser,
  onFirebaseAuthStateChanged,
  isFirebaseAvailable
} from '@/lib/firebase/auth'
import {
  exchangeAndStoreTokens,
  handleTokenExchangeError
} from '@/lib/firebase/token-exchange'
import { FirebaseAuthProvider } from '@/lib/firebase/types'

export function useAuth() {
  const router = useRouter()
  const [state, setState] = useState<AuthState>({
    isAuthenticated: false,
    isLoading: true,
    user: null,
    error: null,
  })

  // Firebase state
  const [firebaseUser, setFirebaseUser] = useState<any>(null)
  const [authProvider, setAuthProvider] = useState<FirebaseAuthProvider | null>(null)

  // Check authentication status on mount and when tokens change
  const checkAuth = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }))



      if (!hasValidAuth()) {
        setState({
          isAuthenticated: false,
          isLoading: false,
          user: null,
          error: null,
        })
        return
      }

      // Check if token needs refresh (proactive)
      if (needsTokenRefresh()) {
        debugLog('Token near expiry, attempting proactive refresh...')
        const refreshSuccess = await refreshAuthToken()
        if (!refreshSuccess) {
          debugLog('Proactive token refresh failed, clearing auth (no sign-out here)')
          clearTokens()
          setState({
            isAuthenticated: false,
            isLoading: false,
            user: null,
            error: 'Session expired',
          })
          return
        }
      }

      // Get current user
      const user = await getCurrentUser()
      setState({
        isAuthenticated: true,
        isLoading: false,
        user,
        error: null,
      })
    } catch (error) {
      debugLog('Auth check failed:', error)
      clearTokens()
      setState({
        isAuthenticated: false,
        isLoading: false,
        user: null,
        error: error instanceof Error ? error.message : 'Authentication failed',
      })
    }
  }, [])





  // Logout function
  const logout = useCallback(async () => {
    try {
      // Sign out from Firebase if user is Firebase authenticated
      if (firebaseUser && isFirebaseAvailable()) {
        await signOutUser()
      }

      // Clear tokens and state
      clearTokens() // This now includes Firebase tokens
      setFirebaseUser(null)
      setAuthProvider(null)
      setState({
        isAuthenticated: false,
        isLoading: false,
        user: null,
        error: null,
      })

      router.push(APP_CONFIG.DEFAULT_LOGOUT_REDIRECT)
    } catch (error) {
      debugLog('Logout error:', error)
      // Even if Firebase logout fails, clear local state
      clearTokens() // This now includes Firebase tokens
      setFirebaseUser(null)
      setAuthProvider(null)
      setState({
        isAuthenticated: false,
        isLoading: false,
        user: null,
        error: null,
      })
      router.push(APP_CONFIG.DEFAULT_LOGOUT_REDIRECT)
    }
  }, [router, firebaseUser])

  // Clear error function
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }))
  }, [])

  // Firebase authentication methods

  // Sign in with email and password using Firebase
  const signInWithEmailAndPassword = useCallback(async (email: string, password: string) => {
    if (!isFirebaseAvailable()) {
      throw new Error('Firebase authentication is not available')
    }

    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }))

      const result = await signInWithEmail(email, password)
      setFirebaseUser(result.user)
      setAuthProvider('email')

      // Store Firebase user data in cookies
      storeFirebaseUser(result.user, 'email')

      // Exchange Firebase token for custom API token
      await exchangeAndStoreTokens(result.user, 'email')

      // Get user data from custom API
      const user = await getCurrentUser()

      setState({
        isAuthenticated: true,
        isLoading: false,
        user,
        error: null,
      })

      // Redirect to dashboard
      router.push(APP_CONFIG.DEFAULT_LOGIN_REDIRECT)
    } catch (error) {
      const errorMessage = handleTokenExchangeError(error)
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }))
      throw error
    }
  }, [router])

  // Sign up with email and password using Firebase
  const signUpWithEmailAndPassword = useCallback(async (email: string, password: string) => {
    if (!isFirebaseAvailable()) {
      throw new Error('Firebase authentication is not available')
    }

    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }))

      const result = await signUpWithEmail(email, password)
      setFirebaseUser(result.user)
      setAuthProvider('email')

      // Store Firebase user data in cookies
      storeFirebaseUser(result.user, 'email')

      // Exchange Firebase token for custom API token
      await exchangeAndStoreTokens(result.user, 'email')

      // Get user data from custom API
      const user = await getCurrentUser()

      setState({
        isAuthenticated: true,
        isLoading: false,
        user,
        error: null,
      })

      // Redirect to dashboard
      router.push(APP_CONFIG.DEFAULT_LOGIN_REDIRECT)
    } catch (error) {
      const errorMessage = handleTokenExchangeError(error)
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }))
      throw error
    }
  }, [router])

  // Send magic link for passwordless authentication
  const sendMagicLinkEmail = useCallback(async (email: string) => {
    if (!isFirebaseAvailable()) {
      throw new Error('Firebase authentication is not available')
    }

    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }))
      await sendMagicLink(email)
      setState(prev => ({ ...prev, isLoading: false }))
    } catch (error) {
      const errorMessage = handleTokenExchangeError(error)
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }))
      throw error
    }
  }, [])

  // Sign in with magic link
  const signInWithEmailLink = useCallback(async (email: string, emailLink?: string) => {
    if (!isFirebaseAvailable()) {
      throw new Error('Firebase authentication is not available')
    }

    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }))

      const result = await signInWithMagicLink(email, emailLink)
      setFirebaseUser(result.user)
      setAuthProvider('emailLink')

      // Store Firebase user data in cookies
      storeFirebaseUser(result.user, 'emailLink')

      // Exchange Firebase token for custom API token
      await exchangeAndStoreTokens(result.user, 'emailLink')

      // Get user data from custom API
      const user = await getCurrentUser()

      setState({
        isAuthenticated: true,
        isLoading: false,
        user,
        error: null,
      })

      // Redirect to dashboard
      router.push(APP_CONFIG.DEFAULT_LOGIN_REDIRECT)
    } catch (error) {
      const errorMessage = handleTokenExchangeError(error)
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }))
      throw error
    }
  }, [router])

  // Sign in with Google
  const signInWithGoogle = useCallback(async () => {
    debugLog('[Auth Hook] Starting Google sign-in process')

    if (!isFirebaseAvailable()) {
      debugLog('[Auth Hook] Firebase not available for Google sign-in')
      throw new Error('Firebase authentication is not available')
    }

    try {
      debugLog('[Auth Hook] Setting loading state to true')
      setState(prev => ({ ...prev, isLoading: true, error: null }))

      debugLog('[Auth Hook] Calling Firebase Google sign-in (popup flow)...')
      const result = await signInWithGooglePopup()



      debugLog('[Auth Hook] Google sign-in successful, got result:', {
        userEmail: result.user.email,
        userDisplayName: result.user.displayName,
        isNewUser: result.isNewUser
      })

      setFirebaseUser(result.user)
      setAuthProvider('google')

      debugLog('[Auth Hook] Storing Firebase user data in cookies...')
      storeFirebaseUser(result.user, 'google')

      debugLog('[Auth Hook] Exchanging Firebase token for custom API token...')
      await exchangeAndStoreTokens(result.user, 'google')

      debugLog('[Auth Hook] Token exchange successful')
      debugLog('[Auth Hook] Getting current user data from custom API...')

      // Get user data from custom API
      const user = await getCurrentUser()

      debugLog('[Auth Hook] Got user data:', user ? { email: user.email, id: user.id } : 'null')

      setState({
        isAuthenticated: true,
        isLoading: false,
        user,
        error: null,
      })

      debugLog('[Auth Hook] Authentication state updated, redirecting to dashboard...')
      // Redirect to dashboard
      router.push(APP_CONFIG.DEFAULT_LOGIN_REDIRECT)

      debugLog('[Auth Hook] Google sign-in process completed successfully!')
    } catch (error: any) {
      debugLog('[Auth Hook] Google sign-in failed in auth hook:', {
        code: error?.code,
        message: error?.message,
        name: error?.name
      })



      // Provide user-friendly error messages
      let userFriendlyMessage = 'Google sign-in failed'

      if (error?.code === 'auth/popup-closed-by-user') {
        userFriendlyMessage = 'Sign-in was cancelled. Please try again and complete the Google sign-in process.'
      } else if (error?.code === 'auth/popup-blocked') {
        userFriendlyMessage = 'Popup was blocked by your browser. Please allow popups for this site and try again.'
      } else if (error?.code === 'auth/cancelled-popup-request') {
        userFriendlyMessage = 'Another sign-in attempt was in progress. Please close other popups and try again.'
      } else if (error?.code === 'auth/network-request-failed') {
        userFriendlyMessage = 'Network error occurred. Please check your internet connection and try again.'
      } else if (error?.message) {
        userFriendlyMessage = error.message
      }

      debugLog('[Auth Hook] Setting user-friendly error message:', userFriendlyMessage)

      setState(prev => ({
        ...prev,
        isLoading: false,
        error: userFriendlyMessage,
      }))

      throw error
    }
  }, [router])

  // Send password reset email
  const sendPasswordResetEmail = useCallback(async (email: string) => {
    if (!isFirebaseAvailable()) {
      throw new Error('Firebase authentication is not available')
    }

    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }))
      await resetPassword(email)
      setState(prev => ({ ...prev, isLoading: false }))
    } catch (error) {
      const errorMessage = handleTokenExchangeError(error)
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }))
      throw error
    }
  }, [])

  // Update password
  const updatePassword = useCallback(async (newPassword: string) => {
    if (!isFirebaseAvailable()) {
      throw new Error('Firebase authentication is not available')
    }

    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }))
      await updateUserPassword(newPassword)
      setState(prev => ({ ...prev, isLoading: false }))
    } catch (error) {
      const errorMessage = handleTokenExchangeError(error)
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }))
      throw error
    }
  }, [])

  // Send email verification
  const sendEmailVerification = useCallback(async () => {
    if (!isFirebaseAvailable()) {
      throw new Error('Firebase authentication is not available')
    }

    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }))
      await sendUserEmailVerification()
      setState(prev => ({ ...prev, isLoading: false }))
    } catch (error) {
      const errorMessage = handleTokenExchangeError(error)
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }))
      throw error
    }
  }, [])

  // Firebase auth state listener
  useEffect(() => {
    if (!isFirebaseAvailable()) {
      return
    }

    const unsubscribe = onFirebaseAuthStateChanged((user) => {
      debugLog('Firebase auth state changed:', user?.email || 'null')
      setFirebaseUser(user)

      // If user signs out from Firebase, clear local state
      if (!user && firebaseUser) {
        debugLog('Firebase user signed out, clearing local state')
        clearTokens()
        setAuthProvider(null)
        setState({
          isAuthenticated: false,
          isLoading: false,
          user: null,
          error: null,
        })
      }
    })

    return unsubscribe
  }, [firebaseUser])

  // Check auth on mount
  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  // Proactive refresh: jittered schedule around ~60s to avoid synchronized refreshes
  useEffect(() => {
    let active = true
    let timer: any

    const scheduleNext = () => {
      const base = 60_000
      const jitter = Math.floor(Math.random() * 10_000) - 5_000 // ±5s
      const delay = Math.max(20_000, base + jitter) // never less than 20s

      timer = setTimeout(async () => {
        if (!active) return
        try {
          if (needsTokenRefresh()) {
            debugLog('Interval check (jittered): token near expiry, attempting refresh...')
            const ok = await refreshAuthToken()
            if (!ok) {
              debugLog('Interval refresh failed, clearing auth (no sign-out here)')
              clearTokens()
              setState(prev => ({
                ...prev,
                isAuthenticated: false,
                isLoading: false,
                user: null,
                error: 'Session expired',
              }))
            }
          }
        } catch (e) {
          debugLog('Interval refresh error:', e)
        } finally {
          if (active) scheduleNext()
        }
      }, delay)
    }

    scheduleNext()
    return () => { active = false; clearTimeout(timer) }
  }, [])

  return {
    ...state,
    // Existing methods
    logout,
    clearError,
    checkAuth,

    // Firebase methods
    signInWithEmailAndPassword,
    signUpWithEmailAndPassword,
    sendMagicLinkEmail,
    signInWithEmailLink,
    signInWithGoogle,
    sendPasswordResetEmail,
    updatePassword,
    sendEmailVerification,

    // Firebase state
    firebaseUser,
    authProvider,
    isFirebaseAvailable: isFirebaseAvailable(),
  }
}
