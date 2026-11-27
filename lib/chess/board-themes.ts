import type { TranslationKey } from '@/lib/i18n/locales/en'
import type { UserPreferences } from '@/lib/api/preferences'

export const BOARD_THEME_IDS = [
  'brown',
  'slate',
  'graphite',
  'green',
  'blue',
  'deep-blue',
  'purple',
  'walnut',
  'forest',
] as const

export type BoardThemeId = (typeof BOARD_THEME_IDS)[number]
export type BoardAppearanceMode = 'light' | 'dark'

export interface BoardThemeOption {
  id: BoardThemeId
  labelKey: TranslationKey
  lightSquare: string
  darkSquare: string
}

export interface StoredBoardThemes {
  light: BoardThemeId
  dark: BoardThemeId
}

/**
 * Default Light board theme is classic wood brown (#F0D9B5 / #B58863).
 * Default Dark board theme is graphite (#B0B0B5 / #747479), matching Chessticize Mobile v1.7.0.
 */
export const DEFAULT_LIGHT_BOARD_THEME_ID: BoardThemeId = 'brown'
export const DEFAULT_DARK_BOARD_THEME_ID: BoardThemeId = 'graphite'
export const DEFAULT_BOARD_THEME_ID: BoardThemeId = DEFAULT_LIGHT_BOARD_THEME_ID

export const BOARD_THEME_STORAGE_KEY = 'chessticize_board_theme'
export const LIGHT_BOARD_THEME_STORAGE_KEY = 'chessticize_light_board_theme'
export const DARK_BOARD_THEME_STORAGE_KEY = 'chessticize_dark_board_theme'
export const BOARD_THEME_COOKIE = 'chessticize_board_theme'
export const LIGHT_BOARD_THEME_COOKIE = 'chessticize_light_board_theme'
export const DARK_BOARD_THEME_COOKIE = 'chessticize_dark_board_theme'
export const BOARD_THEME_CHANGE_EVENT = 'chessticize-board-theme-change'

export const BOARD_THEMES: readonly BoardThemeOption[] = [
  {
    id: 'brown',
    labelKey: 'appearance.boardTheme.brown',
    lightSquare: '#F0D9B5',
    darkSquare: '#B58863',
  },
  {
    id: 'slate',
    labelKey: 'appearance.boardTheme.slate',
    lightSquare: '#E6E8EB',
    darkSquare: '#7B8794',
  },
  {
    id: 'graphite',
    labelKey: 'appearance.boardTheme.graphite',
    lightSquare: '#B0B0B5',
    darkSquare: '#747479',
  },
  {
    id: 'green',
    labelKey: 'appearance.boardTheme.green',
    lightSquare: '#EEEED2',
    darkSquare: '#769656',
  },
  {
    id: 'blue',
    labelKey: 'appearance.boardTheme.blue',
    lightSquare: '#DEE3E6',
    darkSquare: '#8CA2AD',
  },
  {
    id: 'deep-blue',
    labelKey: 'appearance.boardTheme.deep-blue',
    lightSquare: '#EAE9D2',
    darkSquare: '#4B7399',
  },
  {
    id: 'purple',
    labelKey: 'appearance.boardTheme.purple',
    lightSquare: '#E1D0E5',
    darkSquare: '#8F639E',
  },
  {
    id: 'walnut',
    labelKey: 'appearance.boardTheme.walnut',
    lightSquare: '#C4A482',
    darkSquare: '#6E472E',
  },
  {
    id: 'forest',
    labelKey: 'appearance.boardTheme.forest',
    lightSquare: '#9DB094',
    darkSquare: '#4E6B47',
  },
] as const

const BOARD_THEME_MAP: Readonly<Record<BoardThemeId, BoardThemeOption>> = Object.fromEntries(
  BOARD_THEMES.map((theme) => [theme.id, theme]),
) as Record<BoardThemeId, BoardThemeOption>

export function defaultBoardThemeForMode(mode: BoardAppearanceMode): BoardThemeId {
  return mode === 'dark' ? DEFAULT_DARK_BOARD_THEME_ID : DEFAULT_LIGHT_BOARD_THEME_ID
}

export function isValidBoardThemeId(input?: string | null): input is BoardThemeId {
  if (!input) return false
  const normalized = input.trim().toLowerCase()
  return normalized in BOARD_THEME_MAP
}

export function normalizeBoardThemeId(
  input?: string | null,
  fallback: BoardThemeId = DEFAULT_LIGHT_BOARD_THEME_ID,
): BoardThemeId {
  if (!input) return fallback
  const normalized = input.trim().toLowerCase() as BoardThemeId
  return normalized in BOARD_THEME_MAP ? normalized : fallback
}

export function getBoardTheme(id?: string | null): BoardThemeOption {
  return BOARD_THEME_MAP[normalizeBoardThemeId(id)]
}

function readCookieValue(name: string): string | null {
  try {
    const cookieMatch = document.cookie
      .split('; ')
      .find((entry) => entry.startsWith(`${name}=`))
    if (cookieMatch) {
      return decodeURIComponent(cookieMatch.split('=').slice(1).join('='))
    }
  } catch {
    // Ignore cookie read errors
  }
  return null
}

function readStoredModeBoardTheme(mode: BoardAppearanceMode): BoardThemeId {
  const fallback = defaultBoardThemeForMode(mode)
  if (typeof window === 'undefined') return fallback

  const storageKey = mode === 'dark' ? DARK_BOARD_THEME_STORAGE_KEY : LIGHT_BOARD_THEME_STORAGE_KEY
  const cookieKey = mode === 'dark' ? DARK_BOARD_THEME_COOKIE : LIGHT_BOARD_THEME_COOKIE

  try {
    const stored = window.localStorage.getItem(storageKey)
    if (stored) {
      return normalizeBoardThemeId(stored, fallback)
    }
    if (mode === 'light') {
      const legacy = window.localStorage.getItem(BOARD_THEME_STORAGE_KEY)
      if (legacy) {
        return normalizeBoardThemeId(legacy, fallback)
      }
    }
  } catch {
    // Ignore storage read errors in restricted contexts
  }

  const cookieVal = readCookieValue(cookieKey)
  if (cookieVal) {
    return normalizeBoardThemeId(cookieVal, fallback)
  }
  if (mode === 'light') {
    const legacyCookie = readCookieValue(BOARD_THEME_COOKIE)
    if (legacyCookie) {
      return normalizeBoardThemeId(legacyCookie, fallback)
    }
  }

  return fallback
}

export function readStoredBoardThemes(): StoredBoardThemes {
  return {
    light: readStoredModeBoardTheme('light'),
    dark: readStoredModeBoardTheme('dark'),
  }
}

export function readStoredBoardThemeId(mode: BoardAppearanceMode = 'light'): BoardThemeId {
  return readStoredModeBoardTheme(mode)
}

function writeModeBoardTheme(mode: BoardAppearanceMode, id: BoardThemeId): BoardThemeId {
  const normalized = normalizeBoardThemeId(id, defaultBoardThemeForMode(mode))
  if (typeof window === 'undefined') return normalized

  const storageKey = mode === 'dark' ? DARK_BOARD_THEME_STORAGE_KEY : LIGHT_BOARD_THEME_STORAGE_KEY
  const cookieKey = mode === 'dark' ? DARK_BOARD_THEME_COOKIE : LIGHT_BOARD_THEME_COOKIE

  try {
    window.localStorage.setItem(storageKey, normalized)
    if (mode === 'light') {
      window.localStorage.setItem(BOARD_THEME_STORAGE_KEY, normalized)
    }
  } catch {
    // Ignore storage write errors
  }

  try {
    document.cookie = `${cookieKey}=${encodeURIComponent(normalized)}; Path=/; Max-Age=31536000; SameSite=Lax`
    if (mode === 'light') {
      document.cookie = `${BOARD_THEME_COOKIE}=${encodeURIComponent(normalized)}; Path=/; Max-Age=31536000; SameSite=Lax`
    }
  } catch {
    // Ignore cookie write errors
  }

  return normalized
}

export function saveBoardThemeForMode(mode: BoardAppearanceMode, id: BoardThemeId): StoredBoardThemes {
  const normalized = writeModeBoardTheme(mode, id)
  const next: StoredBoardThemes = {
    ...readStoredBoardThemes(),
    [mode]: normalized,
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent<StoredBoardThemes>(BOARD_THEME_CHANGE_EVENT, { detail: next }))
  }
  return next
}

export function saveBoardThemeId(id: BoardThemeId, mode: BoardAppearanceMode = 'light'): BoardThemeId {
  const next = saveBoardThemeForMode(mode, id)
  return next[mode]
}

export function hydrateBoardThemesFromPreferences(prefs?: UserPreferences | null): StoredBoardThemes {
  if (!prefs || typeof window === 'undefined') {
    return readStoredBoardThemes()
  }

  let changed = false
  const lightCandidate = prefs.light_board_theme ?? prefs.board_theme
  if (isValidBoardThemeId(lightCandidate)) {
    writeModeBoardTheme('light', lightCandidate)
    changed = true
  }
  if (isValidBoardThemeId(prefs.dark_board_theme)) {
    writeModeBoardTheme('dark', prefs.dark_board_theme)
    changed = true
  }

  const next = readStoredBoardThemes()
  if (changed) {
    window.dispatchEvent(new CustomEvent<StoredBoardThemes>(BOARD_THEME_CHANGE_EVENT, { detail: next }))
  }
  return next
}
