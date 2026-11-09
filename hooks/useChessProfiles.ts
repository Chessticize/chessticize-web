import { useState } from 'react'
import { createChessProfile as apiCreateChessProfile } from '@/lib/api/auth'
import { ChessProfile, CreateChessProfileRequest } from '@/lib/auth/types'

interface UseChessProfilesReturn {
  isCreatingProfile: boolean
  profileError: string | null
  successMessage: string | null
  createChessProfile: (platform: string, username: string) => Promise<ChessProfile>
  clearMessages: () => void
}

export function useChessProfiles(): UseChessProfilesReturn {
  const [isCreatingProfile, setIsCreatingProfile] = useState(false)
  const [profileError, setProfileError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Create chess profile using the existing auth infrastructure
  const createChessProfile = async (platform: string, username: string): Promise<ChessProfile> => {
    setIsCreatingProfile(true)
    setProfileError(null)

    try {
      const request: CreateChessProfileRequest = {
        platform,
        username
      }

      // Use the existing API function which handles auth tokens properly
      const profile = await apiCreateChessProfile(request)

      setSuccessMessage(`Successfully created ${platform} profile for ${username}!`)

      // Clear success message after 5 seconds
      setTimeout(() => {
        setSuccessMessage(null)
      }, 5000)

      return profile

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create chess profile'
      setProfileError(errorMessage)
      throw error
    } finally {
      setIsCreatingProfile(false)
    }
  }

  const clearMessages = () => {
    setProfileError(null)
    setSuccessMessage(null)
  }

  return {
    isCreatingProfile,
    profileError,
    successMessage,
    createChessProfile,
    clearMessages
  }
}
