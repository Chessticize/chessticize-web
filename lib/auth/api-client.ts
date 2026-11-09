/**
 * Authenticated API client
 * Adapted from legacy-site/src/services/apiService.js
 * Enhanced with Firebase token support
 */

import { API_CONFIG, debugLog } from '../config'
import {
  getAuthToken,
  clearTokens,
  getFirebaseProvider,
} from './tokens'

// Firebase imports for token refresh
import {
  getCurrentFirebaseUser,
  isFirebaseAvailable
} from '../firebase/auth'
import {
  refreshFirebaseTokens,
} from '../firebase/token-exchange'


// Track ongoing refresh to prevent multiple simultaneous refresh attempts
let refreshPromise: Promise<boolean> | null = null

/**
 * Refresh the auth token using Firebase or session token
 */
export async function refreshAuthToken(): Promise<boolean> {
  // If refresh is already in progress, wait for it
  if (refreshPromise) {
    return refreshPromise
  }

  refreshPromise = (async () => {
    try {
      // Prefer Firebase refresh whenever Firebase is available and we have a current user
      if (isFirebaseAvailable()) {
        const canRefresh = await refreshFirebaseToken()
        if (canRefresh) {
          return true
        }
      }

      debugLog('No valid authentication method for refresh')
      return false
    } catch (error) {
      debugLog('Token refresh error:', error)
      return false
    } finally {
      refreshPromise = null
    }
  })()

  return refreshPromise
}

/**
 * Refresh token using Firebase
 */
async function refreshFirebaseToken(): Promise<boolean> {
  try {
    const firebaseUser = getCurrentFirebaseUser()
    const provider = (getFirebaseProvider() as any) || 'email'

    if (!firebaseUser) {
      debugLog('No Firebase user for refresh')
      return false
    }

    debugLog('Refreshing Firebase token for user:', firebaseUser.email)

    // Use Firebase token refresh from token-exchange service
    await refreshFirebaseTokens(firebaseUser, provider as any)

    debugLog('Firebase token refresh successful')
    return true
  } catch (error) {
    debugLog('Firebase token refresh failed:', error)
    return false
  }
}



/**
 * Handle authenticated requests with automatic retry on 401
 */
async function handleAuthenticatedRequest(
  requestFn: () => Promise<Response>
): Promise<Response> {
  const result = await requestFn()

  // Only retry on 401 errors, not other 4xx errors
  if (result && result.status === 401) {
    debugLog('Received 401, attempting token refresh...')

    const refreshSuccess = await refreshAuthToken()
    if (refreshSuccess) {
      debugLog('Token refresh successful, retrying request...')
      // Retry the request
      return await requestFn()
    } else {
      // Refresh failed
      debugLog('Token refresh failed')
      clearTokens()
      // Do not sign the user out here; caller can decide (UI flows will sign-out if appropriate)
      throw new ApiError('Authentication failed', 401, 'AUTHENTICATION_FAILED')
    }
  }

  return result
}

/**
 * Make an authenticated API request
 */
export async function apiRequest(
  url: string,
  options: RequestInit = {},
  skipAuth: boolean = false
): Promise<Response> {
  const makeRequest = async () => {
    const fullUrl = url.startsWith('http') ? url : `${API_CONFIG.BASE_URL}${url}`

    // Prepare headers
    const headers: Record<string, string> = {
      ...API_CONFIG.DEFAULT_HEADERS,
    }

    // Add headers from options if provided
    if (options.headers) {
      if (options.headers instanceof Headers) {
        // Handle Headers object
        options.headers.forEach((value, key) => {
          headers[key] = value
        })
      } else if (Array.isArray(options.headers)) {
        // Handle array of [key, value] pairs
        options.headers.forEach(([key, value]) => {
          headers[key] = value
        })
      } else {
        // Handle plain object
        Object.assign(headers, options.headers)
      }
    }

    // Add auth header if not skipping auth
    if (!skipAuth) {
      const authToken = getAuthToken()
      if (authToken) {
        headers.Authorization = `Bearer ${authToken}`
      }
    }

    // Make the request
    const requestOptions = {
      ...options,
      headers,
    }

    // Use AbortSignal from parameter or options (parameter takes precedence)
    if (options.signal) {
      requestOptions.signal = options.signal
    }

    return await fetch(fullUrl, requestOptions)
  }

  // Use shared retry logic if auth is enabled
  if (!skipAuth) {
    return await handleAuthenticatedRequest(makeRequest)
  } else {
    return await makeRequest()
  }
}

/**
 * Convenience method for GET requests
 */
export async function apiGet(
  url: string,
  skipAuth: boolean = false,
  abortSignal?: AbortSignal
): Promise<Response> {
  return apiRequest(url, { method: 'GET', signal: abortSignal }, skipAuth)
}

/**
 * Convenience method for POST requests
 */
export async function apiPost(
  url: string,
  data?: any,
  options: { skipAuth?: boolean; abortSignal?: AbortSignal } = {}
): Promise<Response> {
  const { skipAuth = false, abortSignal } = options

  return apiRequest(url, {
    method: 'POST',
    body: data ? JSON.stringify(data) : undefined,
    signal: abortSignal,
  }, skipAuth)
}

/**
 * Convenience method for PUT requests
 */
export async function apiPut(
  url: string,
  data?: any,
  skipAuth: boolean = false,
  abortSignal?: AbortSignal
): Promise<Response> {
  return apiRequest(url, {
    method: 'PUT',
    body: data ? JSON.stringify(data) : undefined,
    signal: abortSignal,
  }, skipAuth)
}

/**
 * Convenience method for DELETE requests
 */
export async function apiDelete(
  url: string,
  skipAuth: boolean = false,
  abortSignal?: AbortSignal
): Promise<Response> {
  return apiRequest(url, { method: 'DELETE', signal: abortSignal }, skipAuth)
}

/**
 * Custom error class for API errors
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public code?: string
  ) {
    super(message)
    this.name = 'ApiError'
  }
}
