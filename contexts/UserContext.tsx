"use client"

import React, { createContext, useState, useEffect, ReactNode } from 'react'
import { useAuthContext } from '@/components/auth/auth-provider'
import { getCurrentUser } from '@/lib/api/auth'
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
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refreshUser = async () => {
    if (!isAuthenticated) return

    try {
      setIsLoading(true)
      setError(null)

      console.log('Fetching current user bootstrap...')
      const userData = await getCurrentUser()
      console.log('User bootstrap data:', userData)

      setUser(userData)

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
