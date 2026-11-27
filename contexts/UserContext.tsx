"use client"

import React, { createContext, useState, useEffect, useRef, ReactNode } from 'react'
import { useTheme } from 'next-themes'
import { useAuthContext } from '@/components/auth/auth-provider'
import { useI18n } from '@/components/i18n/i18n-provider'
import { getCurrentUser } from '@/lib/api/auth'
import { normalizeThemeMode } from '@/lib/api/preferences'
import { hydrateBoardThemesFromPreferences } from '@/lib/chess/board-themes'
import { hydratePracticeRunsFromPreferences } from '@/lib/practice-runs'
import { normalizeLanguagePreference } from '@/lib/i18n'
import { User, ChessProfile } from '@/lib/auth/types'

export type { ChessProfile }

interface UserContextType {
  user: User | null
  isLoading: boolean
  error: string | null
  refreshUser: () => Promise<void>
  updateChessProfiles: (profiles: ChessProfile[]) => void
}

export const UserContext = createContext<UserContextType | undefined>(undefined)

interface UserProviderProps {
  children: ReactNode
}

export function useUserContext() {
  const context = React.useContext(UserContext)
  if (context === undefined) {
    throw new Error('useUserContext must be used within a UserProvider')
  }
  return context
}

export function UserProvider({ children }: UserProviderProps) {
  const { isAuthenticated, isLoading: authLoading } = useAuthContext()
  const { hydratePreference } = useI18n()
  const { setTheme } = useTheme()
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const hydratedUserIdRef = useRef<string | null>(null)

  const refreshUser = async () => {
    if (!isAuthenticated) return

    try {
      setIsLoading(true)
      setError(null)

      console.log('Fetching current user bootstrap...')
      const userData = await getCurrentUser()
      console.log('User bootstrap data:', userData)

      setUser(userData)

      if (userData.id && hydratedUserIdRef.current !== userData.id) {
        hydratedUserIdRef.current = userData.id
        const prefs = userData.preferences
        if (prefs) {
          if (prefs.locale) {
            hydratePreference(normalizeLanguagePreference(prefs.locale))
          }
          if (prefs.theme_mode) {
            setTheme(normalizeThemeMode(prefs.theme_mode))
          }
          if (prefs.light_board_theme || prefs.dark_board_theme || prefs.board_theme) {
            hydrateBoardThemesFromPreferences(prefs)
          }
          if (Array.isArray(prefs.practice_runs)) {
            hydratePracticeRunsFromPreferences(prefs)
          }
        }
      }

    } catch (error) {
      console.error('Error loading user data:', error)
      setError(error instanceof Error ? error.message : 'Failed to load user data')
    } finally {
      setIsLoading(false)
    }
  }

  const updateChessProfiles = (profiles: ChessProfile[]) => {
    setUser(prev => prev ? { ...prev, chess_profiles: profiles } : null)
  }



  // Load user data when authentication state changes
  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      refreshUser()
    } else if (!isAuthenticated && !authLoading) {
      // Clear user data when not authenticated
      hydratedUserIdRef.current = null
      setUser(null)
      setError(null)
    }
  }, [isAuthenticated, authLoading])

  const value: UserContextType = {
    user,
    isLoading: isLoading || authLoading, // Include auth loading state
    error,
    refreshUser,
    updateChessProfiles
  }

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  )
}
