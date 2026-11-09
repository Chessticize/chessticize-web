/**
 * Firebase configuration and initialization
 * Initializes Firebase app and exports auth instance
 */

import { initializeApp, getApps, FirebaseApp } from 'firebase/app'
import { getAuth, Auth, connectAuthEmulator } from 'firebase/auth'
import { env, isDevelopment } from '@/lib/env'

// Emulator configuration
export const EMULATOR_CONFIG = {
  // Only use emulator when explicitly enabled via env var.
  // Default to production Firebase even in development to ensure parity with email link flows.
  useEmulator: process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === 'true',
  auth: {
    host: 'localhost',
    port: 9099
  }
}

// Debug emulator configuration
if (typeof window !== 'undefined') {
  console.info('[Firebase] Emulator config:', {
    NEXT_PUBLIC_USE_FIREBASE_EMULATOR: process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR,
    isDevelopment,
    NODE_ENV: process.env.NODE_ENV,
    useEmulator: EMULATOR_CONFIG.useEmulator
  })
}

// Firebase configuration object
export const firebaseConfig = {
  apiKey: env.NEXT_PUBLIC_FIREBASE_API_KEY,
  // When using emulator, still use the production authDomain for OAuth redirects
  authDomain: env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID, // Optional for Analytics
}

// Check if Firebase configuration is complete
export function isFirebaseConfigured(): boolean {
  return !!(
    firebaseConfig.apiKey &&
    firebaseConfig.authDomain &&
    firebaseConfig.projectId &&
    firebaseConfig.storageBucket &&
    firebaseConfig.messagingSenderId &&
    firebaseConfig.appId
  )
}

// Initialize Firebase app (singleton pattern)
let firebaseApp: FirebaseApp | null = null

export function getFirebaseApp(): FirebaseApp | null {
  if (!isFirebaseConfigured()) {
    if (isDevelopment) {
      console.info('[Firebase] Configuration not complete. Firebase authentication disabled.')
    }
    return null
  }

  // Return existing app if already initialized
  if (firebaseApp) {
    return firebaseApp
  }

  // Check if app is already initialized (prevents duplicate initialization)
  const existingApps = getApps()
  if (existingApps.length > 0) {
    firebaseApp = existingApps[0]
    return firebaseApp
  }

  try {
    // Initialize Firebase app
    firebaseApp = initializeApp(firebaseConfig)

    if (isDevelopment) {
      console.info('[Firebase] App initialized successfully')
    }

    return firebaseApp
  } catch (error) {
    console.error('[Firebase] Failed to initialize app:', error)
    return null
  }
}

// Initialize Firebase Auth (singleton pattern)
let firebaseAuth: Auth | null = null

export function getFirebaseAuth(): Auth | null {
  const app = getFirebaseApp()
  if (!app) {
    return null
  }

  // Return existing auth instance if already initialized
  if (firebaseAuth) {
    return firebaseAuth
  }

  try {
    // Initialize Firebase Auth
    firebaseAuth = getAuth(app)
    
    // Connect to Auth emulator in development if enabled
    if (EMULATOR_CONFIG.useEmulator && typeof window !== 'undefined') {
      try {
        // Check if already connected to emulator
        const emulatorUrl = `http://${EMULATOR_CONFIG.auth.host}:${EMULATOR_CONFIG.auth.port}`
        
        // Only connect if not already connected (check for emulator config)
        if (!(firebaseAuth as any).emulatorConfig) {
          console.info(`[Firebase] Connecting to Auth emulator at ${emulatorUrl}`)
          connectAuthEmulator(firebaseAuth, emulatorUrl, { disableWarnings: true })
        }
      } catch (error) {
        console.warn('[Firebase] Failed to connect to Auth emulator:', error)
      }
    }
    
    if (isDevelopment) {
      console.info('[Firebase] Auth initialized successfully')
      if (EMULATOR_CONFIG.useEmulator) {
        console.info('[Firebase] Using Auth emulator')
      }
    }
    
    return firebaseAuth
  } catch (error) {
    console.error('[Firebase] Failed to initialize auth:', error)
    return null
  }
}

// Export auth instance for convenience
export const auth = getFirebaseAuth()

// Helper function to check if Firebase is available
export function isFirebaseAvailable(): boolean {
  return !!(getFirebaseApp() && getFirebaseAuth())
}

// Configuration validation for debugging
export function validateFirebaseConfig(): {
  isValid: boolean
  missingFields: string[]
  warnings: string[]
} {
  const requiredFields = [
    'apiKey',
    'authDomain', 
    'projectId',
    'storageBucket',
    'messagingSenderId',
    'appId'
  ] as const

  const missingFields: string[] = []
  const warnings: string[] = []

  // Check required fields
  requiredFields.forEach(field => {
    if (!firebaseConfig[field]) {
      missingFields.push(field)
    }
  })

  // Check optional fields
  if (!firebaseConfig.measurementId) {
    warnings.push('measurementId is not set - Firebase Analytics will be disabled')
  }

  // Environment-specific warnings
  if (isDevelopment && missingFields.length > 0) {
    warnings.push('Firebase authentication will be disabled in development')
  }

  return {
    isValid: missingFields.length === 0,
    missingFields,
    warnings
  }
}

// Log configuration status on module load (development only)
if (isDevelopment) {
  const validation = validateFirebaseConfig()
  
  if (!validation.isValid) {
    console.warn('[Firebase] Configuration incomplete:', validation.missingFields)
  }
  
  if (validation.warnings.length > 0) {
    console.info('[Firebase] Configuration warnings:', validation.warnings)
  }
  
  if (validation.isValid) {
    console.info('[Firebase] Configuration is valid')
  }
  
  if (EMULATOR_CONFIG.useEmulator) {
    console.info('[Firebase] 🔧 Emulator mode enabled')
    console.info(`[Firebase] Auth emulator will be available at http://localhost:${EMULATOR_CONFIG.auth.port}`)
    console.info('[Firebase] Emulator UI will be available at http://localhost:4000')
    console.info(`[Firebase] Using authDomain: ${firebaseConfig.authDomain}`)
  }
}
