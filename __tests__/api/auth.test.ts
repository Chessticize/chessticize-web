import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createChessProfile, deleteChessProfile, getChessProfiles, getCurrentUser } from '@/lib/api/auth'
import { apiDelete, apiGet, apiPost, ApiError } from '@/lib/auth/api-client'

vi.mock('@/lib/auth/api-client', () => {
  class MockApiError extends Error {
    constructor(message: string, public status?: number, public code?: string) {
      super(message)
      this.name = 'ApiError'
    }
  }

  return {
    apiGet: vi.fn(),
    apiPost: vi.fn(),
    apiDelete: vi.fn(),
    ApiError: MockApiError
  }
})

const mockApiGet = vi.mocked(apiGet)
const mockApiPost = vi.mocked(apiPost)
const mockApiDelete = vi.mocked(apiDelete)

describe('profile API client', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('loads current user through the v2 bootstrap endpoint', async () => {
    mockApiGet.mockResolvedValue(new Response(JSON.stringify({
      user: {
        id: 'user-1',
        email: 'alice@example.com',
        registered_at: '2026-05-18T09:00:00Z',
        updated_at: '2026-05-18T09:05:00Z',
        last_sign_in_at: '2026-05-18T09:30:00Z'
      },
      profiles: [
        {
          profile_id: 'profile-1',
          platform: 'lichess.org',
          username: 'alice',
          games_fetched: 12,
          last_game_fetched_at: '2026-05-18T10:00:00Z',
          updated_at: '2026-05-18T10:01:00Z'
        }
      ],
      elos: [
        {
          elo_type: 'regular mixed 10/30',
          rating: 930,
          rating_deviation: 80,
          is_provisional: false,
          updated_at: '2026-05-18T10:02:00Z'
        }
      ],
      review: {
        due_count: 2,
        due_regular_count: 1,
        due_arrow_duel_count: 1
      }
    }), { status: 200 }))

    const user = await getCurrentUser()

    expect(new URL(mockApiGet.mock.calls[0][0]).pathname).toBe('/api/v2/me/bootstrap')
    expect(user).toEqual({
      id: 'user-1',
      email: 'alice@example.com',
      registered_at: '2026-05-18T09:00:00Z',
      updated_at: '2026-05-18T09:05:00Z',
      last_sign_in_at: '2026-05-18T09:30:00Z',
      elos: [
        {
          elo_type: 'regular mixed 10/30',
          rating: 930,
          rating_deviation: 80,
          is_provisional: false,
          updated_at: '2026-05-18T10:02:00Z'
        }
      ],
      chess_profiles: [
        {
          id: 'profile-1',
          profile_id: 'profile-1',
          platform: 'lichess.org',
          username: 'alice',
          games_fetched: 12,
          last_game_fetched_at: '2026-05-18T10:00:00Z',
          last_game_played_at: null,
          updated_at: '2026-05-18T10:01:00Z'
        }
      ]
    })
  })

  it('normalizes sparse v2 bootstrap responses into stable user arrays', async () => {
    mockApiGet.mockResolvedValue(new Response(JSON.stringify({
      user: {
        id: 'user-2',
        email: 'bob@example.com'
      }
    }), { status: 200 }))

    const user = await getCurrentUser()

    expect(user).toEqual({
      id: 'user-2',
      email: 'bob@example.com',
      registered_at: '',
      updated_at: '',
      last_sign_in_at: '',
      elos: [],
      chess_profiles: []
    })
  })

  it('uses the exported ApiError class for current-user failures', async () => {
    mockApiGet.mockResolvedValue(new Response('failed', { status: 500 }))

    await expect(getCurrentUser()).rejects.toMatchObject({
      message: 'Failed to get user information',
      status: 500
    })
  })

  it('lists chess profiles through the v2 profile endpoint', async () => {
    mockApiGet.mockResolvedValue(new Response(JSON.stringify({
      profiles: [
        {
          profile_id: 'profile-1',
          platform: 'lichess.org',
          username: 'alice',
          games_fetched: 12,
          last_game_fetched_at: '2026-05-18T10:00:00Z',
          last_game_played_at: null,
          updated_at: '2026-05-18T10:01:00Z'
        }
      ]
    }), { status: 200 }))

    const profiles = await getChessProfiles()

    expect(new URL(mockApiGet.mock.calls[0][0]).pathname).toBe('/api/v2/me/chess-profiles')
    expect(profiles).toEqual([
      {
        id: 'profile-1',
        profile_id: 'profile-1',
        platform: 'lichess.org',
        username: 'alice',
        games_fetched: 12,
        last_game_fetched_at: '2026-05-18T10:00:00Z',
        last_game_played_at: null,
        updated_at: '2026-05-18T10:01:00Z'
      }
    ])
  })

  it('creates chess profiles through v2 and returns the normalized profile', async () => {
    mockApiPost.mockResolvedValue(new Response(JSON.stringify({
      profile_id: 'profile-2',
      created_import_job_id: 'job-1',
      profile: {
        id: 'profile-2',
        profile_id: 'profile-2',
        platform: 'chess.com',
        username: 'bob',
        status: 'active',
        games_fetched: 0,
        updated_at: '2026-05-18T11:00:00Z'
      }
    }), { status: 201 }))

    const profile = await createChessProfile({ platform: 'chess.com', username: 'bob' })

    const requestedUrl = new URL(mockApiPost.mock.calls[0][0])
    expect(requestedUrl.pathname).toBe('/api/v2/me/chess-profiles')
    expect(mockApiPost.mock.calls[0][1]).toEqual({ platform: 'chess.com', username: 'bob' })
    expect(profile).toMatchObject({
      id: 'profile-2',
      profile_id: 'profile-2',
      platform: 'chess.com',
      username: 'bob',
      games_fetched: 0
    })
  })

  it('can request profile creation without starting an import job', async () => {
    mockApiPost.mockResolvedValue(new Response(JSON.stringify({
      profile_id: 'profile-3',
      profile: {
        id: 'profile-3',
        profile_id: 'profile-3',
        platform: 'lichess.org',
        username: 'validation-user',
        status: 'active',
        games_fetched: 0,
        updated_at: '2026-05-18T11:05:00Z'
      }
    }), { status: 201 }))

    await createChessProfile({ platform: 'lichess.org', username: 'validation-user', skip_import: true })

    expect(mockApiPost.mock.calls[0][1]).toEqual({
      platform: 'lichess.org',
      username: 'validation-user',
      skip_import: true
    })
  })

  it('maps v2 profile limit errors to a useful message', async () => {
    mockApiPost.mockResolvedValue(new Response('limit reached', { status: 403 }))

    await expect(createChessProfile({ platform: 'lichess.org', username: 'carol' }))
      .rejects.toMatchObject({ message: 'Chess profile limit reached', status: 403 })
  })

  it('deletes chess profiles through the v2 profile endpoint', async () => {
    mockApiDelete.mockResolvedValue(new Response(null, { status: 204 }))

    await deleteChessProfile('profile/id')

    expect(new URL(mockApiDelete.mock.calls[0][0]).pathname).toBe('/api/v2/me/chess-profiles/profile%2Fid')
  })

  it('uses the exported ApiError class for profile failures', async () => {
    mockApiGet.mockResolvedValue(new Response('failed', { status: 500 }))

    await expect(getChessProfiles()).rejects.toBeInstanceOf(ApiError)
  })
})
