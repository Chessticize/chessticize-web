/**
 * Environment variable configuration
 * Centralizes all environment variable access with type safety
 */

/**
 * Get default API URL based on environment
 */
function getDefaultApiUrl(): string {
  const nodeEnv = process.env.NODE_ENV || 'development'
  if (nodeEnv === 'production') {
    return 'https://chessticize-server-9ddca5bcf137.herokuapp.com'
  }
  return 'http://localhost:8080'
}

export const env = {
  // API Configuration
  API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL || getDefaultApiUrl(),

  // Environment
  NODE_ENV: process.env.NODE_ENV || 'development',

  // Feature flags
  ENABLE_DEBUG_LOGS: process.env.NEXT_PUBLIC_ENABLE_DEBUG_LOGS === 'true',

  // Token expiry (minutes)
  // Default to 1440 (1 day). In development, default to 1 minute for easier testing.
  NEXT_PUBLIC_TOKEN_EXPIRY_MINUTES: process.env.NEXT_PUBLIC_TOKEN_EXPIRY_MINUTES || '',

  // Firebase Configuration
  NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '',
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '',
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
  NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '',
  NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || '', // Optional for Analytics
} as const

export const isDevelopment = env.NODE_ENV === 'development'
export const isProduction = env.NODE_ENV === 'production'
export const isTest = env.NODE_ENV === 'test'

// Validation function to ensure required env vars are present
export function validateEnv() {
  const required = ['API_BASE_URL'] as const
  const missing = required.filter(key => !env[key])

  // Firebase variables are optional for development but recommended for production
  const firebaseVars = [
    'NEXT_PUBLIC_FIREBASE_API_KEY',
    'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
    'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
    'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
    'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
    'NEXT_PUBLIC_FIREBASE_APP_ID'
  ] as const
  const missingFirebase = firebaseVars.filter(key => !env[key])

  if (missing.length > 0) {
    console.warn(`Missing environment variables: ${missing.join(', ')}`)
    console.warn('Using default values for development')
  }

  if (missingFirebase.length > 0 && isProduction) {
    console.warn(`Missing Firebase environment variables: ${missingFirebase.join(', ')}`)
    console.warn('Firebase authentication will not work without these variables')
  } else if (missingFirebase.length > 0) {
    console.info(`Firebase environment variables not set: ${missingFirebase.join(', ')}`)
    console.info('Firebase authentication will be disabled. Set these variables to enable Firebase auth.')
  }
}

// Call validation in non-test environments
if (!isTest) {
  validateEnv()
}
