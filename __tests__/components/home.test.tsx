/**
 * Tests for home page component
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import HomePage from '@/app/page'

// Mock the auth context
const mockPush = vi.fn()
let mockAuthState = {
  isAuthenticated: false,
  isLoading: false,
  user: null,
  error: null,
}

vi.mock('@/components/auth/auth-provider', () => ({
  useAuthContext: () => mockAuthState,
}))

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}))

// Mock token functions
let mockHasValidAuth = false
vi.mock('@/lib/auth/tokens', () => ({
  hasValidAuth: vi.fn(() => mockHasValidAuth),
}))

describe('HomePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset mock state
    mockAuthState = {
      isAuthenticated: false,
      isLoading: false,
      user: null,
      error: null,
    }
    mockHasValidAuth = false
  })

  it('should render landing page when not authenticated and no tokens', () => {
    render(<HomePage />)

    expect(screen.getByText('Chessticize')).toBeInTheDocument()
    expect(screen.getByText(/Master tactical patterns/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /get started/i })).toBeInTheDocument()
  })

  it('should show loading when auth is loading', () => {
    mockAuthState.isLoading = true
    render(<HomePage />)

    expect(screen.getByText('Loading...')).toBeInTheDocument()
    expect(screen.queryByText('Chessticize')).not.toBeInTheDocument()
  })

  it('should show loading when tokens exist but not yet authenticated', () => {
    mockHasValidAuth = true
    mockAuthState.isAuthenticated = false
    mockAuthState.isLoading = false

    render(<HomePage />)

    expect(screen.getByText('Signing you in...')).toBeInTheDocument()
    expect(screen.queryByText('Chessticize')).not.toBeInTheDocument()
  })

  it('should redirect when authenticated and show loading during redirect', () => {
    mockAuthState.isAuthenticated = true
    mockAuthState.isLoading = false

    render(<HomePage />)

    expect(mockPush).toHaveBeenCalledWith('/puzzle-sprint')
    expect(screen.getByText('Redirecting to Puzzle Sprint...')).toBeInTheDocument()
  })

  it('should show landing page when no tokens and auth check complete', () => {
    mockHasValidAuth = false
    mockAuthState.isAuthenticated = false
    mockAuthState.isLoading = false
    
    render(<HomePage />)

    expect(screen.getByText('Chessticize')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /get started/i })).toBeInTheDocument()
  })
})
