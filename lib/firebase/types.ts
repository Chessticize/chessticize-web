/**
 * Firebase-specific TypeScript types
 * Defines types for Firebase authentication and integration
 */

import { User as FirebaseUser, UserCredential } from 'firebase/auth'

// Firebase authentication providers
export type FirebaseAuthProvider = 'email' | 'emailLink' | 'google'

// Firebase authentication methods
export interface FirebaseAuthMethods {
  // Email/Password authentication
  signInWithEmailAndPassword: (email: string, password: string) => Promise<UserCredential>
  createUserWithEmailAndPassword: (email: string, password: string) => Promise<UserCredential>
  
  // Passwordless email authentication
  sendSignInLinkToEmail: (email: string) => Promise<void>
  signInWithEmailLink: (email: string, emailLink: string) => Promise<UserCredential>
  isSignInWithEmailLink: (emailLink: string) => boolean
  
  // Google OAuth authentication
  signInWithGooglePopup: () => Promise<UserCredential>
  
  // Password management
  sendPasswordResetEmail: (email: string) => Promise<void>
  updatePassword: (newPassword: string) => Promise<void>
  
  // Email verification
  sendEmailVerification: () => Promise<void>
  
  // Sign out
  signOut: () => Promise<void>
}

// Firebase user state
export interface FirebaseUserState {
  user: FirebaseUser | null
  isLoading: boolean
  error: string | null
}

// Firebase authentication result
export interface FirebaseAuthResult {
  user: FirebaseUser
  credential: UserCredential
  provider: FirebaseAuthProvider
  isNewUser: boolean
}

// Firebase token exchange request
export interface FirebaseTokenExchangeRequest {
  firebase_token: string
}

// Firebase token exchange response
export interface FirebaseTokenExchangeResponse {
  token: string // Custom API token
  user_id: string
  email: string
  is_new_user: boolean
}

// Firebase authentication error types
export interface FirebaseAuthError {
  code: string
  message: string
  provider?: FirebaseAuthProvider
}

// Common Firebase error codes
export const FIREBASE_ERROR_CODES = {
  // Email/Password errors
  INVALID_EMAIL: 'auth/invalid-email',
  USER_DISABLED: 'auth/user-disabled',
  USER_NOT_FOUND: 'auth/user-not-found',
  WRONG_PASSWORD: 'auth/wrong-password',
  EMAIL_ALREADY_IN_USE: 'auth/email-already-in-use',
  WEAK_PASSWORD: 'auth/weak-password',
  
  // Email link errors
  INVALID_ACTION_CODE: 'auth/invalid-action-code',
  EXPIRED_ACTION_CODE: 'auth/expired-action-code',
  
  // Google OAuth errors
  POPUP_BLOCKED: 'auth/popup-blocked',
  POPUP_CLOSED_BY_USER: 'auth/popup-closed-by-user',
  CANCELLED_POPUP_REQUEST: 'auth/cancelled-popup-request',
  
  // Network errors
  NETWORK_REQUEST_FAILED: 'auth/network-request-failed',
  TOO_MANY_REQUESTS: 'auth/too-many-requests',
  
  // Configuration errors
  INVALID_API_KEY: 'auth/invalid-api-key',
  APP_DELETED: 'auth/app-deleted',
  
  // Token errors
  TOKEN_EXPIRED: 'auth/id-token-expired',
  TOKEN_REVOKED: 'auth/id-token-revoked',
} as const

// Firebase configuration validation result
export interface FirebaseConfigValidation {
  isValid: boolean
  missingFields: string[]
  warnings: string[]
}

// Firebase authentication state for integration with existing auth system
export interface FirebaseAuthState {
  // Firebase user
  firebaseUser: FirebaseUser | null
  
  // Firebase authentication status
  isFirebaseAuthenticated: boolean
  isFirebaseLoading: boolean
  firebaseError: string | null
  
  // Token state
  firebaseIdToken: string | null
  customApiToken: string | null
  
  // Provider information
  authProvider: FirebaseAuthProvider | null
  
  // Integration status
  isTokenExchanged: boolean
  tokenExchangeError: string | null
}

// Firebase authentication context type
export interface FirebaseAuthContextType extends FirebaseAuthState {
  // Authentication methods
  signInWithEmail: (email: string, password: string) => Promise<void>
  signUpWithEmail: (email: string, password: string) => Promise<void>
  signInWithEmailLink: (email: string, emailLink?: string) => Promise<void>
  sendMagicLink: (email: string) => Promise<void>
  signInWithGoogle: () => Promise<void>
  
  // Password management
  resetPassword: (email: string) => Promise<void>
  updatePassword: (newPassword: string) => Promise<void>
  
  // Email verification
  sendEmailVerification: () => Promise<void>
  
  // Sign out
  signOut: () => Promise<void>
  
  // Utility methods
  clearError: () => void
  refreshToken: () => Promise<void>
}

// Firebase email link storage (for passwordless auth)
export interface EmailLinkStorage {
  email: string
  timestamp: number
  url: string
}

// Firebase authentication configuration
export interface FirebaseAuthConfig {
  enableEmailPassword: boolean
  enableEmailLink: boolean
  enableGoogle: boolean
  emailLinkUrl: string
  emailLinkSettings: {
    handleCodeInApp: boolean
    dynamicLinkDomain?: string
  }
}

// Firebase user profile data
export interface FirebaseUserProfile {
  uid: string
  email: string | null
  displayName: string | null
  photoURL: string | null
  emailVerified: boolean
  phoneNumber: string | null
  providerId: string
  creationTime: string
  lastSignInTime: string
}

// Firebase authentication event types
export type FirebaseAuthEvent = 
  | 'signIn'
  | 'signUp' 
  | 'signOut'
  | 'tokenRefresh'
  | 'emailVerification'
  | 'passwordReset'
  | 'error'

// Firebase authentication event data
export interface FirebaseAuthEventData {
  event: FirebaseAuthEvent
  user?: FirebaseUser | null
  provider?: FirebaseAuthProvider
  error?: FirebaseAuthError
  timestamp: number
}
