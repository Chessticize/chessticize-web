import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import SettingsPage from '@/app/settings/page'
import { deleteChessProfile, getChessProfiles } from '@/lib/api/auth'
import { useAuthContext } from '@/components/auth/auth-provider'
import { useUserContext } from '@/hooks/useUserContext'
import { vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  logout: vi.fn(),
  refreshUser: vi.fn(),
  updateChessProfiles: vi.fn(),
  createChessProfile: vi.fn(),
  clearMessages: vi.fn(),
  validateChessComUsernameAsync: vi.fn(),
  validateLichessUsernameAsync: vi.fn(),
  clearValidation: vi.fn(),
  toast: vi.fn(),
}))

vi.mock('@/components/navigation', () => ({
  default: () => <nav data-testid="navigation" />,
}))

vi.mock('@/components/footer', () => ({
  default: () => <footer data-testid="footer" />,
}))

vi.mock('@/components/auth/auth-provider', () => ({
  useAuthContext: vi.fn(),
}))

vi.mock('@/hooks/useUserContext', () => ({
  useUserContext: vi.fn(),
}))

vi.mock('@/hooks/useChessProfiles', () => ({
  useChessProfiles: () => ({
    isCreatingProfile: false,
    profileError: null,
    successMessage: null,
    createChessProfile: mocks.createChessProfile,
    clearMessages: mocks.clearMessages,
  }),
}))

vi.mock('@/hooks/useChessUsernameValidation', () => ({
  useDebounce: (value: string) => value,
  useChessUsernameValidation: () => ({
    chessComValidation: { isValidating: false, isValid: null, error: null },
    lichessValidation: { isValidating: false, isValid: null, error: null },
    validateChessComUsernameAsync: mocks.validateChessComUsernameAsync,
    validateLichessUsernameAsync: mocks.validateLichessUsernameAsync,
    clearValidation: mocks.clearValidation,
  }),
}))

vi.mock('@/lib/api/auth', () => ({
  getChessProfiles: vi.fn(),
  deleteChessProfile: vi.fn(),
}))

vi.mock('@/hooks/use-toast', () => ({
  toast: mocks.toast,
}))

const mockUseAuthContext = vi.mocked(useAuthContext)
const mockUseUserContext = vi.mocked(useUserContext)
const mockGetChessProfiles = vi.mocked(getChessProfiles)
const mockDeleteChessProfile = vi.mocked(deleteChessProfile)

const baseUser = {
  id: 'user-1',
  email: 'user@example.com',
  registered_at: '2026-05-18T00:00:00Z',
  updated_at: '2026-05-18T00:00:00Z',
  last_sign_in_at: '2026-05-18T00:00:00Z',
  elos: [],
  chess_profiles: [],
}

describe('SettingsPage profile management', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseAuthContext.mockReturnValue({
      logout: mocks.logout,
      isAuthenticated: true,
      isLoading: false,
      user: null,
      error: null,
    } as any)
    mockUseUserContext.mockReturnValue({
      user: baseUser,
      isLoading: false,
      error: null,
      refreshUser: mocks.refreshUser,
      updateChessProfiles: mocks.updateChessProfiles,
    })
    mockGetChessProfiles.mockResolvedValue([])
  })

  it('loads Settings chess profiles from the v2 profile client into user context', async () => {
    const v2Profiles = [
      {
        id: 'profile-1',
        profile_id: 'profile-1',
        platform: 'lichess.org',
        username: 'alice',
        games_fetched: 12,
        last_game_fetched_at: '2026-05-18T10:00:00Z',
        last_game_played_at: null,
        updated_at: '2026-05-18T10:01:00Z',
      },
    ]
    mockGetChessProfiles.mockResolvedValue(v2Profiles)

    render(<SettingsPage />)

    expect(screen.getByText('Loading profiles...')).toBeInTheDocument()
    await waitFor(() => {
      expect(mocks.updateChessProfiles).toHaveBeenCalledWith(v2Profiles)
    })
    expect(mockGetChessProfiles).toHaveBeenCalledTimes(1)
  })

  it('deletes a normalized v2 profile id and removes it from user context', async () => {
    const existingProfile = {
      id: 'profile-1',
      profile_id: 'profile-1',
      platform: 'lichess.org',
      username: 'alice',
      games_fetched: 12,
      last_game_fetched_at: '2026-05-18T10:00:00Z',
      last_game_played_at: null,
      updated_at: '2026-05-18T10:01:00Z',
    }
    mockUseUserContext.mockReturnValue({
      user: { ...baseUser, chess_profiles: [existingProfile] },
      isLoading: false,
      error: null,
      refreshUser: mocks.refreshUser,
      updateChessProfiles: mocks.updateChessProfiles,
    })
    mockGetChessProfiles.mockResolvedValue([existingProfile])
    mockDeleteChessProfile.mockResolvedValue()

    render(<SettingsPage />)

    expect(await screen.findByText('@alice')).toBeInTheDocument()
    const buttons = screen.getAllByRole('button')
    const deleteTrigger = buttons.find((button) => button.querySelector('svg') && button.textContent === '')
    expect(deleteTrigger).toBeTruthy()

    await userEvent.click(deleteTrigger!)
    await userEvent.click(await screen.findByRole('button', { name: 'Delete' }))

    await waitFor(() => {
      expect(mockDeleteChessProfile).toHaveBeenCalledWith('profile-1')
    })
    expect(mocks.updateChessProfiles).toHaveBeenLastCalledWith([])
  })

  it('creates a new Lichess profile from the Settings form', async () => {
    const createdProfile = {
      id: 'profile-1',
      profile_id: 'profile-1',
      platform: 'lichess.org',
      username: 'alice',
      games_fetched: 0,
      last_game_fetched_at: null,
      last_game_played_at: null,
      updated_at: '2026-06-24T10:00:00Z',
    }
    mocks.createChessProfile.mockResolvedValue(createdProfile)

    render(<SettingsPage />)

    await userEvent.click(screen.getByRole('button', { name: 'Add Profile' }))
    await userEvent.type(screen.getByLabelText('Lichess Username'), 'alice')
    await userEvent.click(screen.getByRole('button', { name: 'Connect Profiles' }))

    await waitFor(() => {
      expect(mocks.createChessProfile).toHaveBeenCalledWith('lichess.org', 'alice')
    })
    expect(mocks.validateLichessUsernameAsync).toHaveBeenCalledWith('alice')
    expect(mocks.updateChessProfiles).toHaveBeenLastCalledWith([createdProfile])
    expect(screen.queryByRole('button', { name: 'Connect Profiles' })).not.toBeInTheDocument()
  })

  it('does not submit an already connected profile platform', async () => {
    const existingProfile = {
      id: 'lichess-profile',
      profile_id: 'lichess-profile',
      platform: 'lichess.org',
      username: 'alice',
      games_fetched: 12,
      last_game_fetched_at: '2026-05-18T10:00:00Z',
      last_game_played_at: null,
      updated_at: '2026-05-18T10:01:00Z',
    }
    const createdProfile = {
      id: 'chess-com-profile',
      profile_id: 'chess-com-profile',
      platform: 'chess.com',
      username: 'bob',
      games_fetched: 0,
      last_game_fetched_at: null,
      last_game_played_at: null,
      updated_at: '2026-06-24T10:00:00Z',
    }
    mockUseUserContext.mockReturnValue({
      user: { ...baseUser, chess_profiles: [existingProfile] },
      isLoading: false,
      error: null,
      refreshUser: mocks.refreshUser,
      updateChessProfiles: mocks.updateChessProfiles,
    })
    mockGetChessProfiles.mockResolvedValue([existingProfile])
    mocks.createChessProfile.mockResolvedValue(createdProfile)

    render(<SettingsPage />)

    expect(await screen.findByText('@alice')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Add Profile' }))

    expect(screen.queryByLabelText('Lichess Username')).not.toBeInTheDocument()
    await userEvent.type(screen.getByLabelText('Chess.com Username'), 'bob')
    await userEvent.click(screen.getByRole('button', { name: 'Connect Profiles' }))

    await waitFor(() => {
      expect(mocks.createChessProfile).toHaveBeenCalledWith('chess.com', 'bob')
    })
    expect(mocks.createChessProfile).not.toHaveBeenCalledWith('lichess.org', expect.any(String))
    expect(mocks.validateChessComUsernameAsync).toHaveBeenCalledWith('bob')
    expect(mocks.updateChessProfiles).toHaveBeenLastCalledWith([existingProfile, createdProfile])
  })

  it('does not render ELO Settings in Settings and renders About with open-source, license, and feedback links', () => {
    render(<SettingsPage />)
    expect(screen.queryByText('ELO Settings')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Save ELOs' })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Source Code/i })).toHaveAttribute(
      'href',
      'https://github.com/Chessticize/chessticize-web',
    )
    expect(screen.getByRole('link', { name: /GPL-3\.0 License/i })).toHaveAttribute(
      'href',
      'https://github.com/Chessticize/chessticize-web/blob/main/LICENSE',
    )
    expect(screen.getByRole('link', { name: /Send Feedback/i })).toHaveAttribute(
      'href',
      'https://github.com/Chessticize/chessticize-web/issues/new',
    )
    expect(screen.getByRole('link', { name: /support@chessticize\.com/i })).toHaveAttribute(
      'href',
      'mailto:support@chessticize.com',
    )
  })
})
