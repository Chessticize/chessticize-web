/**
 * TypeScript types for authentication
 */

// Login request types
export interface LoginWithCredentials {
  email: string
  password: string
}

export type LoginRequest = LoginWithCredentials

// Registration request
export interface RegisterRequest {
  email: string
  password: string
  invitation_code?: string // Optional for backward compatibility
}

// Authentication responses
export interface LoginResponse {
  token: string
}

export interface RegisterResponse {
  id: string
  email: string
  token: string
}

export interface UserElo {
  elo_type: string
  rating: number
  rating_deviation: number
  is_provisional: boolean
  updated_at: string
}

export interface ChessProfile {
  id: string
  user_id?: string
  profile_id?: string
  platform: string
  username: string
  games_fetched: number
  last_game_fetched_at: string | null
  last_game_played_at: string | null
  updated_at: string
}

// User types
export interface User {
  id: string
  email: string
  registered_at: string
  updated_at: string
  last_sign_in_at: string
  elos?: UserElo[]
  chess_profiles?: ChessProfile[]
}





// Authentication state
export interface AuthState {
  isAuthenticated: boolean
  isLoading: boolean
  user: User | null
  error: string | null
}

// Token storage
export interface TokenData {
  authToken: string | null
  expiryTime: Date | null
}

// API error types
export interface ApiError {
  message: string
  status?: number
  code?: string
}

// Chess profile creation
export interface CreateChessProfileRequest {
  platform: string
  username: string
  skip_import?: boolean
}

export type CreateChessProfileResponse = ChessProfile
