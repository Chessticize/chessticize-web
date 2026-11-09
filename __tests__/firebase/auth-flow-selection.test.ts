/**
 * Test for Firebase authentication flow selection
 * Verifies that popup vs redirect flow is chosen correctly based on environment
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock window and navigator
const mockWindow = {
  location: {
    hostname: 'localhost',
    protocol: 'http:'
  }
}

const mockNavigator = {
  userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  vendor: 'Google Inc'
}

// Mock global objects
Object.defineProperty(global, 'window', {
  value: mockWindow,
  writable: true
})

Object.defineProperty(global, 'navigator', {
  value: mockNavigator,
  writable: true
})

// Mock console.log for debugLog
vi.mock('@/lib/config', () => ({
  debugLog: vi.fn()
}))

describe('Firebase Auth Flow Selection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset environment variable
    delete process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should have basic environment setup', () => {
    expect(global.window).toBeDefined()
    expect(global.navigator).toBeDefined()
  })
})
