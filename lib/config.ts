/**
 * Centralized application configuration.
 */

import { env, isDevelopment } from './env'

export const API_CONFIG = {
  // Default base for relative authenticated API requests.
  // Active web runtime should not target retired public v1 routes.
  BASE_URL: `${env.API_BASE_URL}/api/v2`,

  // Request timeout in milliseconds
  TIMEOUT: 10000,

  // Default headers for all requests
  DEFAULT_HEADERS: {
    'Content-Type': 'application/json',
  },

} as const

// Resolve token expiry minutes: default 1440; in dev default to 1 if not set
const resolvedExpiryMinutes = (() => {
  const raw = env.NEXT_PUBLIC_TOKEN_EXPIRY_MINUTES
  if (raw && /^\d+$/.test(raw)) return parseInt(raw, 10)
  return isDevelopment ? 1 : 1440
})()

// Token configuration
export const TOKEN_CONFIG = {
  // Cookie names
  AUTH_TOKEN_COOKIE: 'auth_token',
  TOKEN_EXPIRY_COOKIE: 'token_expiry',

  // Token refresh buffer (5 minutes in milliseconds)
  REFRESH_BUFFER: 5 * 60 * 1000,

  // Default token expiry (minutes)
  DEFAULT_EXPIRY_MINUTES: resolvedExpiryMinutes,

  // Cookie options
  COOKIE_OPTIONS: {
    expires: 7, // 7 days
    secure: env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
  },
} as const

// Application configuration
export const APP_CONFIG = {
  // Application name
  NAME: 'Chessticize',

  // Default redirect paths
  DEFAULT_LOGIN_REDIRECT: '/dashboard',
  DEFAULT_LOGOUT_REDIRECT: '/auth',
} as const

// Debug configuration
export const DEBUG_CONFIG = {
  ENABLED: env.ENABLE_DEBUG_LOGS,
  PREFIX: '[Chessticize]',
} as const

// Helper function for debug logging
export function debugLog(...args: any[]) {
  if (DEBUG_CONFIG.ENABLED || isDevelopment) {
    console.log(DEBUG_CONFIG.PREFIX, ...args)
  }
}
