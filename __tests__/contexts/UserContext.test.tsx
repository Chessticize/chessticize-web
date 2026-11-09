import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { UserProvider, useUserContext } from '@/contexts/UserContext'
import { useAuthContext } from '@/components/auth/auth-provider'
import { getCurrentUser } from '@/lib/api/auth'
import { vi } from 'vitest'

// Mock the auth context
vi.mock('@/components/auth/auth-provider', () => ({
  useAuthContext: vi.fn()
}))

// Mock the auth API
vi.mock('@/lib/api/auth', () => ({
  getCurrentUser: vi.fn()
}))

// Test component that uses the context
function TestComponent() {
  const { user, isLoading, error, refreshUser } = useUserContext()
  
  return (
    <div>
      <div data-testid="loading">{isLoading ? 'Loading' : 'Not Loading'}</div>
      <div data-testid="error">{error || 'No Error'}</div>
      <div data-testid="user">{user ? user.email : 'No User'}</div>
      <button onClick={refreshUser} data-testid="refresh">Refresh</button>
    </div>
  )
}

describe('UserContext', () => {
  const mockGetCurrentUser = vi.mocked(getCurrentUser)
  const mockUseAuthContext = vi.mocked(useAuthContext)
  const mockUserData = {
    id: '1',
    email: 'test@example.com',
    registered_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z',
    last_sign_in_at: '2023-01-01T00:00:00Z'
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockUseAuthContext.mockReturnValue({
      isAuthenticated: true,
      isLoading: false
    })
  })

  it('should provide initial context values', () => {
    mockUseAuthContext.mockReturnValue({
      isAuthenticated: false,
      isLoading: false
    })

    render(
      <UserProvider>
        <TestComponent />
      </UserProvider>
    )

    expect(screen.getByTestId('loading')).toHaveTextContent('Not Loading')
    expect(screen.getByTestId('error')).toHaveTextContent('No Error')
    expect(screen.getByTestId('user')).toHaveTextContent('No User')
  })

  it('should fetch user data when authenticated', async () => {
    mockGetCurrentUser.mockResolvedValue(mockUserData)

    render(
      <UserProvider>
        <TestComponent />
      </UserProvider>
    )

    // Should show loading initially
    expect(screen.getByTestId('loading')).toHaveTextContent('Loading')

    // Wait for user data to load
    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent('test@example.com')
    })

    expect(screen.getByTestId('loading')).toHaveTextContent('Not Loading')
    expect(screen.getByTestId('error')).toHaveTextContent('No Error')
  })

  it('should handle fetch errors', async () => {
    const mockError = new Error('Fetch failed')
    mockGetCurrentUser.mockRejectedValue(mockError)

    render(
      <UserProvider>
        <TestComponent />
      </UserProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('error')).toHaveTextContent('Fetch failed')
    })

    expect(screen.getByTestId('loading')).toHaveTextContent('Not Loading')
    expect(screen.getByTestId('user')).toHaveTextContent('No User')
  })

  it('should throw error when used outside provider', () => {
    // Suppress console.error for this test
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    expect(() => {
      render(<TestComponent />)
    }).toThrow('useUserContext must be used within a UserProvider')

    consoleSpy.mockRestore()
  })
})
