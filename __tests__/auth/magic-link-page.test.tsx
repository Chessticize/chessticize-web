import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

const mockSignInWithEmailLink = vi.fn()
const mockPush = vi.fn()
const mockIsCurrentUrlSignInLink = vi.fn(() => true)
const mockGetStoredEmailForSignIn = vi.fn<() => string | null>(() => null)

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}))

vi.mock('@/components/auth/auth-provider', () => ({
  useAuthContext: () => ({
    signInWithEmailLink: mockSignInWithEmailLink,
    isFirebaseAvailable: true,
    isAuthenticated: false,
  }),
}))

vi.mock('@/lib/firebase/auth', () => ({
  isCurrentUrlSignInLink: () => mockIsCurrentUrlSignInLink(),
  getStoredEmailForSignIn: () => mockGetStoredEmailForSignIn(),
}))

vi.mock('@/lib/firebase/client-only', () => ({
  isBrowser: () => true,
  getCurrentUrl: () => 'https://staging.chessticize.com/auth/magic-link?oobCode=test&mode=signIn',
}))

import MagicLinkPage from '@/app/auth/magic-link/page'

describe('MagicLinkPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockIsCurrentUrlSignInLink.mockReturnValue(true)
    mockGetStoredEmailForSignIn.mockReturnValue(null)
    mockSignInWithEmailLink.mockResolvedValue(undefined)
  })

  it('prompts for email confirmation when localStorage has no saved email (cross-browser mobile flow)', async () => {
    render(<MagicLinkPage />)

    expect(await screen.findByText('Confirm your email')).toBeInTheDocument()
    expect(mockSignInWithEmailLink).not.toHaveBeenCalled()

    const emailInput = screen.getByLabelText('Email address')
    fireEvent.change(emailInput, { target: { value: 'player@example.com' } })
    fireEvent.click(screen.getByRole('button', { name: 'Complete Sign-In' }))

    await waitFor(() => {
      expect(mockSignInWithEmailLink).toHaveBeenCalledWith(
        'player@example.com',
        'https://staging.chessticize.com/auth/magic-link?oobCode=test&mode=signIn'
      )
    })
  })

  it('auto-completes sign-in once when stored email exists in localStorage', async () => {
    mockGetStoredEmailForSignIn.mockReturnValue('saved@example.com')

    render(<MagicLinkPage />)

    await waitFor(() => {
      expect(mockSignInWithEmailLink).toHaveBeenCalledTimes(1)
      expect(mockSignInWithEmailLink).toHaveBeenCalledWith(
        'saved@example.com',
        'https://staging.chessticize.com/auth/magic-link?oobCode=test&mode=signIn'
      )
    })
  })
})
