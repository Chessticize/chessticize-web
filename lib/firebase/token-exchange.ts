/**
 * Firebase token exchange service
 * Handles exchanging Firebase ID tokens for custom API tokens
 */

import { User as FirebaseUser } from 'firebase/auth'
import { getCurrentUserIdToken } from './auth'
import {
  FirebaseTokenExchangeRequest,
  FirebaseTokenExchangeResponse,
  FirebaseAuthProvider
} from './types'
import { API_CONFIG, debugLog } from '@/lib/config'
import { storeTokens } from '@/lib/auth/tokens'

const FIREBASE_EXCHANGE_PATH = '/auth/firebase-exchange'

// Error types to distinguish refresh vs exchange failures
export class FirebaseIdTokenRefreshError extends Error {
  constructor(message = 'Failed to refresh Firebase ID token') {
    super(message)
    this.name = 'FirebaseIdTokenRefreshError'
  }
}

export class FirebaseTokenExchangeError extends Error {
  constructor(message = 'Failed to exchange Firebase ID token') {
    super(message)
    this.name = 'FirebaseTokenExchangeError'
  }
}

function buildTokenExchangeUrl(apiBaseUrl: string): string {
  return `${apiBaseUrl}${FIREBASE_EXCHANGE_PATH}`
}

function postTokenExchange(
  url: string,
  requestPayload: FirebaseTokenExchangeRequest
): Promise<Response> {
  return fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestPayload),
  })
}

function normalizeTokenExchangeResponse(
  response: unknown,
  status: number
): FirebaseTokenExchangeResponse {
  if (!response || typeof response !== 'object') {
    throw new Error('Invalid token exchange response')
  }

  const body = response as {
    token?: unknown
    user_id?: unknown
    email?: unknown
    is_new_user?: unknown
    user?: {
      id?: unknown
      email?: unknown
    }
  }
  const normalized = {
    token: body.token,
    user_id: typeof body.user_id === 'string' ? body.user_id : body.user?.id,
    email: typeof body.email === 'string' ? body.email : body.user?.email,
    is_new_user: typeof body.is_new_user === 'boolean' ? body.is_new_user : status === 201,
  }

  if (!validateTokenExchangeResponse(normalized)) {
    throw new Error('Invalid token exchange response')
  }

  return normalized
}

/**
 * Exchange Firebase ID token for custom API token
 */
export async function exchangeFirebaseToken(
  firebaseUser: FirebaseUser,
  provider: FirebaseAuthProvider
): Promise<FirebaseTokenExchangeResponse> {
  // Get Firebase ID token
  const firebaseIdToken = await getCurrentUserIdToken(true) // Force refresh

  if (!firebaseIdToken) {
    throw new FirebaseIdTokenRefreshError('Failed to get Firebase ID token')
  }
  
  // Prepare request payload
  const requestPayload: FirebaseTokenExchangeRequest = {
    firebase_token: firebaseIdToken,
  }
  
  debugLog('Exchanging Firebase token for custom API token', {
    provider,
    email: firebaseUser.email,
    uid: firebaseUser.uid,
    tokenLength: firebaseIdToken.length,
  })
  
  try {
    const response = await postTokenExchange(
      buildTokenExchangeUrl(API_CONFIG.BASE_URL),
      requestPayload
    )
    
    if (!response.ok) {
      const errorText = await response.text()
      let errorMessage = 'Token exchange failed'
      
      try {
        const errorData = JSON.parse(errorText)
        errorMessage = errorData.message || errorMessage
      } catch {
        // Use default error message if response is not JSON
      }
      
      throw new Error(`${errorMessage} (${response.status})`)
    }
    
    const tokenResponse = normalizeTokenExchangeResponse(await response.json(), response.status)
    
    debugLog('Firebase token exchange successful', {
      userId: tokenResponse.user_id,
      email: tokenResponse.email,
      isNewUser: tokenResponse.is_new_user,
    })
    
    return tokenResponse
  } catch (error) {
    debugLog('Firebase token exchange failed', error)
    
    if (error instanceof Error) {
      // Re-throw exchange errors distinctly
      throw new FirebaseTokenExchangeError(error.message)
    }

    throw new FirebaseTokenExchangeError('Network error during token exchange')
  }
}

/**
 * Exchange Firebase token and store custom API token
 */
export async function exchangeAndStoreTokens(
  firebaseUser: FirebaseUser,
  provider: FirebaseAuthProvider
): Promise<{
  customApiToken: string
  isNewUser: boolean
}> {
  const tokenResponse = await exchangeFirebaseToken(firebaseUser, provider)

  // Store tokens using existing token management system
  // Set Chessticize access token expiry to configured default
  storeTokens(
    tokenResponse.token
  )

  debugLog('Tokens stored successfully', {
    isNewUser: tokenResponse.is_new_user,
  })

  return {
    customApiToken: tokenResponse.token,
    isNewUser: tokenResponse.is_new_user,
  }
}


/**
 * Refresh Firebase token and exchange for new custom API token
 */
export async function refreshFirebaseTokens(
  firebaseUser: FirebaseUser,
  provider: FirebaseAuthProvider
): Promise<string> {
  debugLog('Refreshing Firebase tokens')
  
  try {
    // Force refresh Firebase ID token
    const freshFirebaseToken = await getCurrentUserIdToken(true)
    
    if (!freshFirebaseToken) {
      throw new Error('Failed to refresh Firebase ID token')
    }
    
    // Exchange for new custom API token
    const tokenResponse = await exchangeFirebaseToken(firebaseUser, provider)
    
    // Store new token with configured expiry
    storeTokens(
      tokenResponse.token
    )

    debugLog('Firebase token refresh successful')
    
    return tokenResponse.token
  } catch (error) {
    debugLog('Firebase token refresh failed', error)
    throw error
  }
}

/**
 * Check if Firebase token exchange endpoint is available
 */
export async function checkTokenExchangeEndpoint(): Promise<boolean> {
  try {
    const response = await fetch(buildTokenExchangeUrl(API_CONFIG.BASE_URL), {
      method: 'OPTIONS',
    })
    
    return response.ok || response.status === 405 // 405 Method Not Allowed is also acceptable
  } catch (error) {
    debugLog('Token exchange endpoint check failed', error)
    return false
  }
}

/**
 * Validate Firebase token exchange response
 */
export function validateTokenExchangeResponse(response: any): response is FirebaseTokenExchangeResponse {
  return (
    typeof response === 'object' &&
    response !== null &&
    typeof response.token === 'string' &&
    typeof response.user_id === 'string' &&
    typeof response.email === 'string' &&
    typeof response.is_new_user === 'boolean'
  )
}

/**
 * Handle token exchange errors with user-friendly messages
 */
export function handleTokenExchangeError(error: any): string {
  if (error instanceof Error) {
    const message = error.message.toLowerCase()
    
    // Map common errors to user-friendly messages
    if (message.includes('network')) {
      return 'Network error. Please check your connection and try again.'
    }
    
    if (message.includes('unauthorized') || message.includes('401')) {
      return 'Authentication failed. Please try signing in again.'
    }
    
    if (message.includes('forbidden') || message.includes('403')) {
      return 'Access denied. Please contact support if this persists.'
    }
    
    if (message.includes('not found') || message.includes('404')) {
      return 'Authentication service unavailable. Please try again later.'
    }
    
    if (message.includes('timeout')) {
      return 'Request timed out. Please try again.'
    }
    
    if (message.includes('server') || message.includes('500')) {
      return 'Server error. Please try again later.'
    }
    
    // Return original message for other errors
    return error.message
  }
  
  return 'An unexpected error occurred during authentication.'
}

/**
 * Get provider display name for UI
 */
export function getProviderDisplayName(provider: FirebaseAuthProvider): string {
  switch (provider) {
    case 'email':
      return 'Email/Password'
    case 'emailLink':
      return 'Magic Link'
    case 'google':
      return 'Google'
    default:
      return 'Unknown'
  }
}

/**
 * Token exchange configuration
 */
export const TOKEN_EXCHANGE_CONFIG = {
  // Retry configuration
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000, // 1 second
  
  // Timeout configuration
  REQUEST_TIMEOUT: 10000, // 10 seconds
  
  // Token refresh buffer (refresh when token expires within this time)
  REFRESH_BUFFER: 5 * 60 * 1000, // 5 minutes
} as const

/**
 * Retry token exchange with exponential backoff
 */
export async function retryTokenExchange(
  firebaseUser: FirebaseUser,
  provider: FirebaseAuthProvider,
  maxRetries = TOKEN_EXCHANGE_CONFIG.MAX_RETRIES
): Promise<FirebaseTokenExchangeResponse> {
  let lastError: Error
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await exchangeFirebaseToken(firebaseUser, provider)
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error')
      
      if (attempt === maxRetries) {
        break
      }
      
      // Exponential backoff delay
      const delay = TOKEN_EXCHANGE_CONFIG.RETRY_DELAY * Math.pow(2, attempt - 1)
      debugLog(`Token exchange attempt ${attempt} failed, retrying in ${delay}ms`, error)
      
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
  
  throw lastError!
}
