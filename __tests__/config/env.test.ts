/**
 * Tests for environment configuration
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'

describe('Environment Configuration', () => {
  beforeEach(() => {
    vi.resetModules()
    delete process.env.NODE_ENV
    delete process.env.NEXT_PUBLIC_API_BASE_URL
    delete process.env.NEXT_PUBLIC_ENABLE_DEBUG_LOGS
  })

  it('should use localhost for development environment', async () => {
    process.env.NODE_ENV = 'development'
    
    const { env } = await import('@/lib/env')
    
    expect(env.API_BASE_URL).toBe('http://localhost:8080')
    expect(env.NODE_ENV).toBe('development')
  })

  it('should use production URL for production environment', async () => {
    process.env.NODE_ENV = 'production'
    
    const { env } = await import('@/lib/env')
    
    expect(env.API_BASE_URL).toBe('https://chessticize-server-9ddca5bcf137.herokuapp.com')
    expect(env.NODE_ENV).toBe('production')
  })

  it('should use explicit API URL when provided', async () => {
    process.env.NODE_ENV = 'production'
    process.env.NEXT_PUBLIC_API_BASE_URL = 'https://custom-api.example.com'
    
    const { env } = await import('@/lib/env')
    
    expect(env.API_BASE_URL).toBe('https://custom-api.example.com')
  })

  it('should default to development when NODE_ENV is not set', async () => {
    // NODE_ENV is undefined
    
    const { env } = await import('@/lib/env')
    
    expect(env.API_BASE_URL).toBe('http://localhost:8080')
    expect(env.NODE_ENV).toBe('development')
  })

  it('should handle debug logs configuration', async () => {
    process.env.NEXT_PUBLIC_ENABLE_DEBUG_LOGS = 'true'
    
    const { env } = await import('@/lib/env')
    
    expect(env.ENABLE_DEBUG_LOGS).toBe(true)
  })

  it('should default debug logs to false', async () => {
    // NEXT_PUBLIC_ENABLE_DEBUG_LOGS is undefined
    
    const { env } = await import('@/lib/env')
    
    expect(env.ENABLE_DEBUG_LOGS).toBe(false)
  })

  it('should provide environment helper functions', async () => {
    process.env.NODE_ENV = 'production'
    
    const { isDevelopment, isProduction, isTest } = await import('@/lib/env')
    
    expect(isDevelopment).toBe(false)
    expect(isProduction).toBe(true)
    expect(isTest).toBe(false)
  })
})
