/**
 * Authentication API functions
 */

import { apiPost, apiGet, apiDelete, ApiError } from '../auth/api-client'
import { API_CONFIG } from '../config'
import {
  User,
  UserElo,
  CreateChessProfileRequest,
  CreateChessProfileResponse
} from '../auth/types'

interface V2BootstrapResponse {
  user: V2BootstrapUser
  profiles?: V2ChessProfile[]
  elos?: UserElo[]
}

interface V2BootstrapUser {
  id: string
  email: string
  registered_at?: string
  updated_at?: string
  last_sign_in_at?: string | null
}

interface V2ChessProfilesResponse {
  profiles: V2ChessProfile[]
}

interface V2CreateChessProfileResponse {
  profile: V2ChessProfile
  profile_id: string
  created_import_job_id?: string
}

interface V2ChessProfile {
  id?: string
  profile_id?: string
  platform: string
  username: string
  status?: string
  games_fetched?: number
  last_game_fetched_at?: string | null
  last_game_played_at?: string | null
  updated_at?: string
}

/**
 * Login with email/password or session token
 */


/**
 * Register a new user with invitation code
 */


/**
 * Get current user information
 */
export async function getCurrentUser(): Promise<User> {
  try {
    const response = await apiGet(`${API_CONFIG.BASE_URL}/me/bootstrap`)
    
    if (!response.ok) {
      throw new ApiError('Failed to get user information', response.status)
    }
    
    const body = await response.json() as V2BootstrapResponse
    return normalizeV2Bootstrap(body)
  } catch (error) {
    if (error instanceof ApiError) {
      throw error
    }
    throw new ApiError('Network error getting user information')
  }
}

/**
 * Get user's session tokens
 */


/**
 * Revoke a session token
 */


/**
 * Get user's chess profiles
 */
export async function getChessProfiles(): Promise<CreateChessProfileResponse[]> {
  try {
    const response = await apiGet(`${API_CONFIG.BASE_URL}/me/chess-profiles`)

    if (!response.ok) {
      throw new ApiError('Failed to get chess profiles', response.status)
    }

    const body = await response.json() as V2ChessProfilesResponse
    return (body.profiles || []).map((profile) => normalizeV2ChessProfile(profile))
  } catch (error) {
    if (error instanceof ApiError) {
      throw error
    }
    throw new ApiError('Network error getting chess profiles')
  }
}

/**
 * Create a new chess profile
 */
export async function createChessProfile(request: CreateChessProfileRequest): Promise<CreateChessProfileResponse> {
  try {
    const response = await apiPost(`${API_CONFIG.BASE_URL}/me/chess-profiles`, request)

    if (!response.ok) {
      let errorMessage = 'Failed to create chess profile'

      if (response.status === 400) {
        errorMessage = 'Invalid chess profile data'
      } else if (response.status === 409) {
        errorMessage = 'Chess profile already exists'
      } else if (response.status === 403) {
        errorMessage = 'Chess profile limit reached'
      }

      throw new ApiError(errorMessage, response.status)
    }

    const body = await response.json() as V2CreateChessProfileResponse
    return normalizeV2ChessProfile(body.profile, body.profile_id)
  } catch (error) {
    if (error instanceof ApiError) {
      throw error
    }
    throw new ApiError('Network error creating chess profile')
  }
}


/**
 * Delete a chess profile
 */
export async function deleteChessProfile(profileId: string): Promise<void> {
  try {
    const response = await apiDelete(`${API_CONFIG.BASE_URL}/me/chess-profiles/${encodeURIComponent(profileId)}`)
    
    if (!response.ok) {
      throw new ApiError('Failed to delete chess profile', response.status)
    }
  } catch (error) {
    if (error instanceof ApiError) {
      throw error
    }
    throw new ApiError('Network error deleting chess profile')
  }
}

function normalizeV2Bootstrap(body: V2BootstrapResponse): User {
  const registeredAt = body.user.registered_at || ''
  const updatedAt = body.user.updated_at || registeredAt

  return {
    id: body.user.id,
    email: body.user.email,
    registered_at: registeredAt,
    updated_at: updatedAt,
    last_sign_in_at: body.user.last_sign_in_at || '',
    elos: body.elos || [],
    chess_profiles: (body.profiles || []).map((profile) => normalizeV2ChessProfile(profile))
  }
}

function normalizeV2ChessProfile(profile: V2ChessProfile, fallbackID?: string): CreateChessProfileResponse {
  const id = profile.id || profile.profile_id || fallbackID || ''

  return {
    id,
    profile_id: profile.profile_id || id,
    platform: profile.platform,
    username: profile.username,
    games_fetched: profile.games_fetched || 0,
    last_game_fetched_at: profile.last_game_fetched_at || null,
    last_game_played_at: profile.last_game_played_at || null,
    updated_at: profile.updated_at || ''
  }
}
