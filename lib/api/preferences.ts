import { apiPatch, ApiError } from '@/lib/auth/api-client'
import { getAuthToken } from '@/lib/auth/tokens'
import { API_CONFIG } from '@/lib/config'

export type ThemeMode = 'system' | 'light' | 'dark'

export interface SavedPracticeRun {
  id: string
  name: string
  theme: string
  duration_minutes: number
  per_puzzle_seconds: number
}

export interface UserPreferences {
  locale?: string
  theme_mode?: ThemeMode
  light_board_theme?: string
  dark_board_theme?: string
  board_theme?: string
  practice_runs?: SavedPracticeRun[]
}

export type UserPreferencesPatch = {
  locale?: string | null
  theme_mode?: ThemeMode | null
  light_board_theme?: string | null
  dark_board_theme?: string | null
  board_theme?: string | null
  practice_runs?: SavedPracticeRun[] | null
}

interface V2PreferencesResponse {
  preferences?: UserPreferences
}

export function normalizeThemeMode(input?: string | null): ThemeMode {
  if (input === 'light' || input === 'dark' || input === 'system') {
    return input
  }
  return 'system'
}

export async function patchUserPreferences(
  patch: UserPreferencesPatch,
): Promise<UserPreferences | null> {
  const response = await apiPatch(`${API_CONFIG.BASE_URL}/me/preferences`, patch)

  if (!response.ok) {
    throw new ApiError('Failed to save user preferences', response.status)
  }

  const body = (await response.json()) as V2PreferencesResponse
  return body.preferences ?? {}
}

/**
 * Best-effort cloud sync for user preferences.
 * No-ops when unauthenticated and never interrupts local UX if offline
 * or pointed at a backend that does not yet expose PATCH /api/v2/me/preferences.
 */
export function syncUserPreferencesInBackground(patch: UserPreferencesPatch): void {
  if (typeof window === 'undefined') return
  if (!getAuthToken()) return

  void patchUserPreferences(patch).catch(() => {
    // Keep local-first preference state intact even if cloud sync fails.
  })
}
