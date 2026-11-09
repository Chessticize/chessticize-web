/**
 * Firebase authentication service
 * Provides Firebase authentication methods for email/password, passwordless email, and Google OAuth
 */

import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithEmailLink,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithPopup,
  GoogleAuthProvider,
  sendPasswordResetEmail,
  updatePassword as firebaseUpdatePassword,
  sendEmailVerification,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
  UserCredential,
  ActionCodeSettings,
} from 'firebase/auth'

import { getFirebaseAuth, isFirebaseAvailable } from './config'
import {
  FirebaseAuthProvider,
  FirebaseAuthResult,
  FirebaseAuthError,
  EmailLinkStorage
} from './types'
import { isDevelopment } from '@/lib/env'
import { debugLog } from '@/lib/config'

// Google Auth Provider instance
const googleProvider = new GoogleAuthProvider()
googleProvider.addScope('email')
googleProvider.addScope('profile')

// Add custom parameters for better user experience (per Firebase docs)
googleProvider.setCustomParameters({
  prompt: 'select_account'
})

debugLog('[Firebase Auth] Google provider initialized with scopes:', ['email', 'profile'])
debugLog('[Firebase Auth] Google provider custom parameters:', { prompt: 'select_account' })

// Email link settings

const emailLinkSettings: ActionCodeSettings = {
  url: typeof window !== 'undefined' ? `${window.location.origin}/auth/magic-link` : '',
  handleCodeInApp: true,
}

// Local storage keys for email link authentication
const EMAIL_LINK_STORAGE_KEY = 'chessticize_email_for_signin'

/**
 * Check if Firebase is available and configured
 */
function ensureFirebaseAvailable(): void {
  if (!isFirebaseAvailable()) {
    throw new Error('Firebase is not configured or available')
  }
}

/**
 * Convert Firebase error to our error format
 */
function handleFirebaseError(error: any, provider?: FirebaseAuthProvider): FirebaseAuthError {
  const firebaseError = error as { code?: string; message?: string }

  return {
    code: firebaseError.code || 'unknown',
    message: firebaseError.message || 'An unknown error occurred',
    provider,
  }
}

/**
 * Create auth result from Firebase user credential
 */
function createAuthResult(
  credential: UserCredential,
  provider: FirebaseAuthProvider
): FirebaseAuthResult {
  return {
    user: credential.user,
    credential,
    provider,
    isNewUser: (credential as any).additionalUserInfo?.isNewUser || false,
  }
}

// Email/Password Authentication

/**
 * Sign in with email and password
 */
export async function signInWithEmail(email: string, password: string): Promise<FirebaseAuthResult> {
  ensureFirebaseAvailable()
  const auth = getFirebaseAuth()!

  try {
    const credential = await signInWithEmailAndPassword(auth, email, password)
    return createAuthResult(credential, 'email')
  } catch (error) {
    throw handleFirebaseError(error, 'email')
  }
}

/**
 * Create user with email and password
 */
export async function signUpWithEmail(email: string, password: string): Promise<FirebaseAuthResult> {
  ensureFirebaseAvailable()
  const auth = getFirebaseAuth()!

  try {
    const credential = await createUserWithEmailAndPassword(auth, email, password)
    return createAuthResult(credential, 'email')
  } catch (error) {
    throw handleFirebaseError(error, 'email')
  }
}

// Passwordless Email Authentication

/**
 * Send magic link to email
 */
export async function sendMagicLink(email: string): Promise<void> {
  ensureFirebaseAvailable()
  const auth = getFirebaseAuth()!

  try {
    await sendSignInLinkToEmail(auth, email, emailLinkSettings)

    // Store email in localStorage for completing sign-in
    if (typeof window !== 'undefined') {
      const emailLinkData: EmailLinkStorage = {
        email,
        timestamp: Date.now(),
        url: emailLinkSettings.url,
      }
      localStorage.setItem(EMAIL_LINK_STORAGE_KEY, JSON.stringify(emailLinkData))
    }

    if (isDevelopment) {
      console.info('[Firebase] Magic link sent to:', email)
    }
  } catch (error) {
    throw handleFirebaseError(error, 'emailLink')
  }
}

/**
 * Sign in with email link (magic link)
 */
export async function signInWithMagicLink(email?: string, emailLink?: string): Promise<FirebaseAuthResult> {
  ensureFirebaseAvailable()
  const auth = getFirebaseAuth()!

  // Use current URL if emailLink not provided
  const linkToCheck = emailLink || (typeof window !== 'undefined' ? window.location.href : '')

  if (!isSignInWithEmailLink(auth, linkToCheck)) {
    throw new Error('Invalid email link')
  }

  let emailToUse = email

  // Get email from localStorage if not provided
  if (!emailToUse && typeof window !== 'undefined') {
    const storedData = localStorage.getItem(EMAIL_LINK_STORAGE_KEY)
    if (storedData) {
      try {
        const emailLinkData: EmailLinkStorage = JSON.parse(storedData)
        emailToUse = emailLinkData.email
      } catch (error) {
        console.warn('[Firebase] Failed to parse stored email link data')
      }
    }
  }

  if (!emailToUse) {
    throw new Error('Email is required for email link sign-in')
  }

  try {
    const credential = await signInWithEmailLink(auth, emailToUse, linkToCheck)

    // Clear stored email after successful sign-in
    if (typeof window !== 'undefined') {
      localStorage.removeItem(EMAIL_LINK_STORAGE_KEY)
    }

    return createAuthResult(credential, 'emailLink')
  } catch (error) {
    throw handleFirebaseError(error, 'emailLink')
  }
}

/**
 * Check if current URL is a sign-in link
 */
export function isCurrentUrlSignInLink(): boolean {
  if (typeof window === 'undefined') return false

  const auth = getFirebaseAuth()
  if (!auth) return false

  return isSignInWithEmailLink(auth, window.location.href)
}

/**
 * Get stored email for email link sign-in
 */
export function getStoredEmailForSignIn(): string | null {
  if (typeof window === 'undefined') return null

  const storedData = localStorage.getItem(EMAIL_LINK_STORAGE_KEY)
  if (!storedData) return null

  try {
    const emailLinkData: EmailLinkStorage = JSON.parse(storedData)
    return emailLinkData.email
  } catch (error) {
    return null
  }
}

// Google OAuth Authentication



/**
 * Sign in with Google using popup with retry logic
 */
export async function signInWithGooglePopup(): Promise<FirebaseAuthResult> {
  // Simplified per Firebase docs: try popup, fall back to redirect for popup-block issues
  ensureFirebaseAvailable()
  const auth = getFirebaseAuth()!

  try {
    const credential = await signInWithPopup(auth, googleProvider)
    return createAuthResult(credential, 'google')
  } catch (error: any) {
    throw handleFirebaseError(error, 'google')
  }
}



// Password Management

/**
 * Send password reset email
 */
export async function resetPassword(email: string): Promise<void> {
  ensureFirebaseAvailable()
  const auth = getFirebaseAuth()!

  try {
    await sendPasswordResetEmail(auth, email)

    if (isDevelopment) {
      console.info('[Firebase] Password reset email sent to:', email)
    }
  } catch (error) {
    throw handleFirebaseError(error, 'email')
  }
}

/**
 * Update user password
 */
export async function updateUserPassword(newPassword: string): Promise<void> {
  ensureFirebaseAvailable()
  const auth = getFirebaseAuth()!

  if (!auth.currentUser) {
    throw new Error('No authenticated user')
  }

  try {
    await firebaseUpdatePassword(auth.currentUser, newPassword)

    if (isDevelopment) {
      console.info('[Firebase] Password updated successfully')
    }
  } catch (error) {
    throw handleFirebaseError(error, 'email')
  }
}

// Email Verification

/**
 * Send email verification
 */
export async function sendUserEmailVerification(): Promise<void> {
  ensureFirebaseAvailable()
  const auth = getFirebaseAuth()!

  if (!auth.currentUser) {
    throw new Error('No authenticated user')
  }

  try {
    await sendEmailVerification(auth.currentUser)

    if (isDevelopment) {
      console.info('[Firebase] Email verification sent')
    }
  } catch (error) {
    throw handleFirebaseError(error)
  }
}

// Sign Out

/**
 * Sign out current user
 */
export async function signOutUser(): Promise<void> {
  ensureFirebaseAvailable()
  const auth = getFirebaseAuth()!

  try {
    await signOut(auth)

    // Clear any stored email link data
    if (typeof window !== 'undefined') {
      localStorage.removeItem(EMAIL_LINK_STORAGE_KEY)
    }

    if (isDevelopment) {
      console.info('[Firebase] User signed out')
    }
  } catch (error) {
    throw handleFirebaseError(error)
  }
}

// Auth State Management

/**
 * Subscribe to auth state changes
 */
export function onFirebaseAuthStateChanged(callback: (user: FirebaseUser | null) => void): () => void {
  const auth = getFirebaseAuth()
  if (!auth) {
    // Return no-op unsubscribe function if Firebase not available
    return () => {}
  }

  return onAuthStateChanged(auth, callback)
}

/**
 * Get current Firebase user
 */
export function getCurrentFirebaseUser(): FirebaseUser | null {
  const auth = getFirebaseAuth()
  return auth?.currentUser || null
}

/**
 * Wait for Firebase to load current user (auth state), up to a timeout
 */
export async function waitForFirebaseUser(timeoutMs = 2000): Promise<FirebaseUser | null> {
  const auth = getFirebaseAuth()
  if (!auth) return null

  if (auth.currentUser) return auth.currentUser

  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      unsubscribe()
      resolve(auth.currentUser || null)
    }, timeoutMs)

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      clearTimeout(timer)
      unsubscribe()
      resolve(user)
    })
  })
}

/**
 * Get current user's ID token
 */
export async function getCurrentUserIdToken(forceRefresh = false): Promise<string | null> {
  const user = getCurrentFirebaseUser()
  if (!user) return null

  try {
    return await user.getIdToken(forceRefresh)
  } catch (error) {
    console.error('[Firebase] Failed to get ID token:', error)
    return null
  }
}

// Re-export Firebase availability check for convenience
export { isFirebaseAvailable } from './config'
