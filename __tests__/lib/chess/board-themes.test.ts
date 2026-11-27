// @vitest-environment jsdom
import { describe, expect, it, beforeEach, vi } from 'vitest'
import {
  BOARD_THEMES,
  BOARD_THEME_STORAGE_KEY,
  DARK_BOARD_THEME_STORAGE_KEY,
  DEFAULT_BOARD_THEME_ID,
  DEFAULT_DARK_BOARD_THEME_ID,
  DEFAULT_LIGHT_BOARD_THEME_ID,
  LIGHT_BOARD_THEME_STORAGE_KEY,
  getBoardTheme,
  hydrateBoardThemesFromPreferences,
  normalizeBoardThemeId,
  readStoredBoardThemeId,
  readStoredBoardThemes,
  saveBoardThemeForMode,
  saveBoardThemeId,
} from '@/lib/chess/board-themes'

describe('board-themes', () => {
  const storage = new Map<string, string>()

  beforeEach(() => {
    storage.clear()
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => {
        storage.set(key, String(value))
      },
      removeItem: (key: string) => {
        storage.delete(key)
      },
      clear: () => {
        storage.clear()
      },
    })
    document.cookie = `${BOARD_THEME_STORAGE_KEY}=; Path=/; Max-Age=0`
    document.cookie = `${LIGHT_BOARD_THEME_STORAGE_KEY}=; Path=/; Max-Age=0`
    document.cookie = `${DARK_BOARD_THEME_STORAGE_KEY}=; Path=/; Max-Age=0`
  })

  it('defaults to classic brown in light mode and graphite in dark mode', () => {
    expect(DEFAULT_BOARD_THEME_ID).toBe('brown')
    expect(DEFAULT_LIGHT_BOARD_THEME_ID).toBe('brown')
    expect(DEFAULT_DARK_BOARD_THEME_ID).toBe('graphite')
    expect(readStoredBoardThemes()).toEqual({ light: 'brown', dark: 'graphite' })
    const defaultTheme = getBoardTheme()
    expect(defaultTheme.id).toBe('brown')
    expect(defaultTheme.lightSquare).toBe('#F0D9B5')
    expect(defaultTheme.darkSquare).toBe('#B58863')
  })

  it('includes all 9 mobile-aligned board themes', () => {
    expect(BOARD_THEMES.map((t) => t.id)).toEqual([
      'brown',
      'slate',
      'graphite',
      'green',
      'blue',
      'deep-blue',
      'purple',
      'walnut',
      'forest',
    ])
    expect(getBoardTheme('slate')).toMatchObject({
      lightSquare: '#E6E8EB',
      darkSquare: '#7B8794',
    })
    expect(getBoardTheme('deep-blue')).toMatchObject({
      lightSquare: '#EAE9D2',
      darkSquare: '#4B7399',
    })
  })

  it('falls back to brown for unknown or empty values', () => {
    expect(normalizeBoardThemeId('')).toBe('brown')
    expect(normalizeBoardThemeId(null)).toBe('brown')
    expect(normalizeBoardThemeId('nonexistent')).toBe('brown')
    expect(normalizeBoardThemeId('  GREEN  ')).toBe('green')
  })

  it('persists light and dark board themes independently', () => {
    expect(readStoredBoardThemeId('light')).toBe('brown')
    expect(readStoredBoardThemeId('dark')).toBe('graphite')

    saveBoardThemeForMode('light', 'walnut')
    saveBoardThemeForMode('dark', 'deep-blue')

    expect(window.localStorage.getItem(LIGHT_BOARD_THEME_STORAGE_KEY)).toBe('walnut')
    expect(window.localStorage.getItem(DARK_BOARD_THEME_STORAGE_KEY)).toBe('deep-blue')
    expect(readStoredBoardThemes()).toEqual({ light: 'walnut', dark: 'deep-blue' })

    saveBoardThemeId('green')
    expect(readStoredBoardThemes()).toEqual({ light: 'green', dark: 'deep-blue' })
  })

  it('hydrates board themes from cloud preferences', () => {
    const hydrated = hydrateBoardThemesFromPreferences({
      light_board_theme: 'forest',
      dark_board_theme: 'slate',
    })
    expect(hydrated).toEqual({ light: 'forest', dark: 'slate' })
    expect(readStoredBoardThemes()).toEqual({ light: 'forest', dark: 'slate' })
  })
})
