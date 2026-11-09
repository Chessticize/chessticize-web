/**
 * Token management utilities
 * Adapted from legacy-site/src/utils/tokenUtils.js
 * Enhanced with Firebase token support
 */

import Cookies from 'js-cookie'
import { TOKEN_CONFIG } from '../config'
import { TokenData } from './types'

// Firebase token storage keys
const FIREBASE_TOKEN_STORAGE = {
  FIREBASE_USER_COOKIE: 'firebase_user',
  FIREBASE_PROVIDER_COOKIE: 'firebase_provider',
  FIREBASE_TOKEN_EXPIRY_COOKIE: 'firebase_token_expiry',
} as const

/**
 * Store authentication tokens in cookies
 */
export function storeTokens(
  authToken: string,
  expiryMinutes: number = TOKEN_CONFIG.DEFAULT_EXPIRY_MINUTES
): void {
  const expiryTime = new Date(Date.now() + expiryMinutes * 60 * 1000)

  // Store auth token
  Cookies.set(TOKEN_CONFIG.AUTH_TOKEN_COOKIE, authToken, TOKEN_CONFIG.COOKIE_OPTIONS)

  // Store token expiry time for refresh logic
  Cookies.set(TOKEN_CONFIG.TOKEN_EXPIRY_COOKIE, expiryTime.toISOString(), TOKEN_CONFIG.COOKIE_OPTIONS)
}

/**
 * Get the current auth token from cookies
 */
export function getAuthToken(): string | null {
  return Cookies.get(TOKEN_CONFIG.AUTH_TOKEN_COOKIE) || null
}



/**
 * Get token expiry time from cookies
 */
export function getTokenExpiry(): Date | null {
  const expiryStr = Cookies.get(TOKEN_CONFIG.TOKEN_EXPIRY_COOKIE)
  if (!expiryStr) return null
  
  try {
    return new Date(expiryStr)
  } catch (error) {
    console.error('Error parsing token expiry:', error)
    return null
  }
}

/**
 * Check if the current auth token needs refresh
 */
export function needsTokenRefresh(): boolean {
  const expiryTime = getTokenExpiry()
  if (!expiryTime) return true
  
  const now = new Date()
  // Check if token expires within the buffer time
  return (expiryTime.getTime() - now.getTime()) <= TOKEN_CONFIG.REFRESH_BUFFER
}

/**
 * Check if user has valid authentication (auth token or Firebase auth)
 */
export function hasValidAuth(): boolean {
  return !!(getAuthToken() || hasFirebaseAuth())
}

/**
 * Clear all authentication tokens (including Firebase tokens)
 */
export function clearTokens(): void {
  // Clear traditional tokens
  Cookies.remove(TOKEN_CONFIG.AUTH_TOKEN_COOKIE)
  Cookies.remove(TOKEN_CONFIG.TOKEN_EXPIRY_COOKIE)

  // Clear Firebase tokens
  clearFirebaseTokens()
}

/**
 * Update only the auth token (used during refresh)
 */
export function updateAuthToken(
  authToken: string,
  expiryMinutes: number = TOKEN_CONFIG.DEFAULT_EXPIRY_MINUTES
): void {
  const expiryTime = new Date(Date.now() + expiryMinutes * 60 * 1000)
  
  Cookies.set(TOKEN_CONFIG.AUTH_TOKEN_COOKIE, authToken, TOKEN_CONFIG.COOKIE_OPTIONS)
  Cookies.set(TOKEN_CONFIG.TOKEN_EXPIRY_COOKIE, expiryTime.toISOString(), TOKEN_CONFIG.COOKIE_OPTIONS)
}

/**
 * Get all token data at once
 */
export function getTokenData(): TokenData {
  return {
    authToken: getAuthToken(),
    expiryTime: getTokenExpiry(),
  }
}

// Firebase token management functions

/**
 * Store Firebase user information in cookies
 */
export function storeFirebaseUser(
  firebaseUser: any,
  provider: string
): void {
  if (!firebaseUser) return

  const userData = {
    uid: firebaseUser.uid,
    email: firebaseUser.email,
    displayName: firebaseUser.displayName,
    photoURL: firebaseUser.photoURL,
    emailVerified: firebaseUser.emailVerified,
  }

  // Store Firebase user data
  Cookies.set(
    FIREBASE_TOKEN_STORAGE.FIREBASE_USER_COOKIE,
    JSON.stringify(userData),
    TOKEN_CONFIG.COOKIE_OPTIONS
  )

  // Store provider information
  Cookies.set(
    FIREBASE_TOKEN_STORAGE.FIREBASE_PROVIDER_COOKIE,
    provider,
    TOKEN_CONFIG.COOKIE_OPTIONS
  )

  // Store Firebase token expiry (Firebase tokens expire in 1 hour)
  const expiryTime = new Date(Date.now() + 60 * 60 * 1000) // 1 hour
  Cookies.set(
    FIREBASE_TOKEN_STORAGE.FIREBASE_TOKEN_EXPIRY_COOKIE,
    expiryTime.toISOString(),
    TOKEN_CONFIG.COOKIE_OPTIONS
  )
}

/**
 * Get stored Firebase user data
 */
export function getFirebaseUser(): any | null {
  const userDataStr = Cookies.get(FIREBASE_TOKEN_STORAGE.FIREBASE_USER_COOKIE)
  if (!userDataStr) return null

  try {
    return JSON.parse(userDataStr)
  } catch (error) {
    console.error('Error parsing Firebase user data:', error)
    return null
  }
}

/**
 * Get Firebase authentication provider
 */
export function getFirebaseProvider(): string | null {
  return Cookies.get(FIREBASE_TOKEN_STORAGE.FIREBASE_PROVIDER_COOKIE) || null
}

/**
 * Get Firebase token expiry time
 */
export function getFirebaseTokenExpiry(): Date | null {
  const expiryStr = Cookies.get(FIREBASE_TOKEN_STORAGE.FIREBASE_TOKEN_EXPIRY_COOKIE)
  if (!expiryStr) return null

  try {
    return new Date(expiryStr)
  } catch (error) {
    console.error('Error parsing Firebase token expiry:', error)
    return null
  }
}

/**
 * Check if Firebase token needs refresh
 */
export function needsFirebaseTokenRefresh(): boolean {
  const expiryTime = getFirebaseTokenExpiry()
  if (!expiryTime) return true

  const now = new Date()
  // Check if token expires within the buffer time (5 minutes)
  return (expiryTime.getTime() - now.getTime()) <= TOKEN_CONFIG.REFRESH_BUFFER
}

/**
 * Check if user has Firebase authentication
 */
export function hasFirebaseAuth(): boolean {
  return !!(getFirebaseUser() && getFirebaseProvider())
}

/**
 * Clear Firebase authentication data
 */
export function clearFirebaseTokens(): void {
  Cookies.remove(FIREBASE_TOKEN_STORAGE.FIREBASE_USER_COOKIE)
  Cookies.remove(FIREBASE_TOKEN_STORAGE.FIREBASE_PROVIDER_COOKIE)
  Cookies.remove(FIREBASE_TOKEN_STORAGE.FIREBASE_TOKEN_EXPIRY_COOKIE)
}

/**
 * Enhanced token data interface including Firebase information
 */
export interface EnhancedTokenData extends TokenData {
  firebaseUser: any | null
  firebaseProvider: string | null
  firebaseTokenExpiry: Date | null
  hasFirebaseAuth: boolean
}

/**
 * Get all token data including Firebase information
 */
export function getEnhancedTokenData(): EnhancedTokenData {
  return {
    authToken: getAuthToken(),
    expiryTime: getTokenExpiry(),
    firebaseUser: getFirebaseUser(),
    firebaseProvider: getFirebaseProvider(),
    firebaseTokenExpiry: getFirebaseTokenExpiry(),
    hasFirebaseAuth: hasFirebaseAuth(),
  }
}

/**
 * Check if any authentication method needs refresh
 */
export function needsAnyTokenRefresh(): boolean {
  // Check traditional token refresh (based on access token only)
  const needsTraditionalRefresh = needsTokenRefresh()

  // Check Firebase token refresh
  const needsFirebaseRefresh = needsFirebaseTokenRefresh() && hasFirebaseAuth()

  return needsTraditionalRefresh || needsFirebaseRefresh
}

/**
 * Get authentication method type
 */
export function getAuthMethod(): 'firebase' | 'none' {
  if (hasFirebaseAuth()) {
    return 'firebase'
  } else {
    return 'none'
  }
}
