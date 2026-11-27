"use client"

import { useCallback, useEffect, useState } from 'react'
import { useTheme } from 'next-themes'
import {
  BOARD_THEME_CHANGE_EVENT,
  BOARD_THEME_STORAGE_KEY,
  DARK_BOARD_THEME_STORAGE_KEY,
  DEFAULT_DARK_BOARD_THEME_ID,
  DEFAULT_LIGHT_BOARD_THEME_ID,
  LIGHT_BOARD_THEME_STORAGE_KEY,
  getBoardTheme,
  readStoredBoardThemes,
  saveBoardThemeForMode,
  type BoardAppearanceMode,
  type BoardThemeId,
  type BoardThemeOption,
  type StoredBoardThemes,
} from '@/lib/chess/board-themes'
import { syncUserPreferencesInBackground } from '@/lib/api/preferences'

export function useBoardTheme(): {
  boardThemeId: BoardThemeId
  boardTheme: BoardThemeOption
  lightBoardThemeId: BoardThemeId
  darkBoardThemeId: BoardThemeId
  resolvedAppearance: BoardAppearanceMode
  setBoardTheme: (id: BoardThemeId) => void
  setBoardThemeForMode: (mode: BoardAppearanceMode, id: BoardThemeId) => void
} {
  const { resolvedTheme } = useTheme()
  const resolvedAppearance: BoardAppearanceMode = resolvedTheme === 'dark' ? 'dark' : 'light'

  const [themes, setThemes] = useState<StoredBoardThemes>({
    light: DEFAULT_LIGHT_BOARD_THEME_ID,
    dark: DEFAULT_DARK_BOARD_THEME_ID,
  })

  useEffect(() => {
    setThemes(readStoredBoardThemes())

    const handleCustomChange = (event: Event) => {
      const customEvent = event as CustomEvent<StoredBoardThemes>
      if (customEvent.detail?.light && customEvent.detail?.dark) {
        setThemes(customEvent.detail)
      } else {
        setThemes(readStoredBoardThemes())
      }
    }

    const handleStorageChange = (event: StorageEvent) => {
      if (
        event.key === LIGHT_BOARD_THEME_STORAGE_KEY ||
        event.key === DARK_BOARD_THEME_STORAGE_KEY ||
        event.key === BOARD_THEME_STORAGE_KEY
      ) {
        setThemes(readStoredBoardThemes())
      }
    }

    window.addEventListener(BOARD_THEME_CHANGE_EVENT, handleCustomChange)
    window.addEventListener('storage', handleStorageChange)
    return () => {
      window.removeEventListener(BOARD_THEME_CHANGE_EVENT, handleCustomChange)
      window.removeEventListener('storage', handleStorageChange)
    }
  }, [])

  const setBoardThemeForMode = useCallback((mode: BoardAppearanceMode, id: BoardThemeId) => {
    const saved = saveBoardThemeForMode(mode, id)
    setThemes(saved)
    syncUserPreferencesInBackground(
      mode === 'dark'
        ? { dark_board_theme: saved.dark }
        : { light_board_theme: saved.light },
    )
  }, [])

  const setBoardTheme = useCallback(
    (id: BoardThemeId) => {
      setBoardThemeForMode(resolvedAppearance, id)
    },
    [resolvedAppearance, setBoardThemeForMode],
  )

  const activeId = resolvedAppearance === 'dark' ? themes.dark : themes.light

  return {
    boardThemeId: activeId,
    boardTheme: getBoardTheme(activeId),
    lightBoardThemeId: themes.light,
    darkBoardThemeId: themes.dark,
    resolvedAppearance,
    setBoardTheme,
    setBoardThemeForMode,
  }
}
