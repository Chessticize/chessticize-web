/**
 * Firebase Test Helpers
 * Utilities for testing Firebase functionality
 */

import { vi } from 'vitest'

// Mock Firebase Auth user
export const mockFirebaseUser = {
  uid: 'test-user-123',
  email: 'test@example.com',
  displayName: 'Test User',
  emailVerified: true,
  getIdToken: vi.fn().mockResolvedValue('mock-id-token'),
  getIdTokenResult: vi.fn().mockResolvedValue({
    token: 'mock-id-token',
    claims: {},
    expirationTime: new Date(Date.now() + 3600000).toISOString()
  })
}

// Mock Firebase Auth instance
export const mockFirebaseAuth = {
  currentUser: mockFirebaseUser,
  onAuthStateChanged: vi.fn(),
  signInWithEmailAndPassword: vi.fn(),
  createUserWithEmailAndPassword: vi.fn(),
  signOut: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
  updateProfile: vi.fn()
}

// Mock Firebase App
export const mockFirebaseApp = {
  name: 'test-app',
  options: {
    apiKey: 'test-api-key',
    authDomain: 'test.firebaseapp.com',
    projectId: 'test-project',
    storageBucket: 'test-project.appspot.com',
    messagingSenderId: '123456789',
    appId: 'test-app-id'
  }
}

/**
 * Setup Firebase mocks for testing
 */
export function setupFirebaseMocks() {
  // Mock Firebase modules
  vi.mock('firebase/app', () => ({
    initializeApp: vi.fn().mockReturnValue(mockFirebaseApp),
    getApps: vi.fn().mockReturnValue([]),
    getApp: vi.fn().mockReturnValue(mockFirebaseApp)
  }))

  vi.mock('firebase/auth', () => ({
    getAuth: vi.fn().mockReturnValue(mockFirebaseAuth),
    onAuthStateChanged: vi.fn(),
    signInWithEmailAndPassword: vi.fn(),
    createUserWithEmailAndPassword: vi.fn(),
    signOut: vi.fn(),
    sendPasswordResetEmail: vi.fn(),
    updateProfile: vi.fn(),
    connectAuthEmulator: vi.fn()
  }))

  return {
    mockFirebaseApp,
    mockFirebaseAuth,
    mockFirebaseUser
  }
}

/**
 * Clean up Firebase mocks after testing
 */
export function cleanupFirebaseMocks() {
  vi.clearAllMocks()
}

/**
 * Mock successful authentication
 */
export function mockSuccessfulAuth() {
  mockFirebaseAuth.signInWithEmailAndPassword.mockResolvedValue({
    user: mockFirebaseUser
  })
  
  mockFirebaseAuth.createUserWithEmailAndPassword.mockResolvedValue({
    user: mockFirebaseUser
  })
  
  mockFirebaseAuth.onAuthStateChanged.mockImplementation((callback) => {
    callback(mockFirebaseUser)
    return vi.fn() // unsubscribe function
  })
}

/**
 * Mock authentication failure
 */
export function mockAuthFailure(errorCode = 'auth/invalid-credential') {
  const authError = new Error('Authentication failed')
  ;(authError as any).code = errorCode
  
  mockFirebaseAuth.signInWithEmailAndPassword.mockRejectedValue(authError)
  mockFirebaseAuth.createUserWithEmailAndPassword.mockRejectedValue(authError)
}

/**
 * Mock no authenticated user
 */
export function mockNoAuthUser() {
  mockFirebaseAuth.currentUser = null
  mockFirebaseAuth.onAuthStateChanged.mockImplementation((callback) => {
    callback(null)
    return vi.fn() // unsubscribe function
  })
}

/**
 * Create a mock Firebase configuration
 */
export function createMockFirebaseConfig() {
  return {
    apiKey: 'test-api-key',
    authDomain: 'test.firebaseapp.com',
    projectId: 'test-project',
    storageBucket: 'test-project.appspot.com',
    messagingSenderId: '123456789',
    appId: 'test-app-id',
    measurementId: 'G-TEST123'
  }
}

/**
 * Create an incomplete Firebase configuration for testing validation
 */
export function createIncompleteFirebaseConfig() {
  return {
    apiKey: '',
    authDomain: '',
    projectId: '',
    storageBucket: '',
    messagingSenderId: '',
    appId: ''
  }
}
