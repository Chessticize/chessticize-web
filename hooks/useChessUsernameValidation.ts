import { useState, useEffect, useCallback } from 'react'
import { validateChessComUsername, validateLichessUsername, ValidationState } from '@/lib/utils/chess-validation'

interface UseChessUsernameValidationReturn {
  chessComValidation: ValidationState
  lichessValidation: ValidationState
  validateChessComUsernameAsync: (username: string) => Promise<void>
  validateLichessUsernameAsync: (username: string) => Promise<void>
  clearValidation: () => void
}

export function useChessUsernameValidation(): UseChessUsernameValidationReturn {
  const [chessComValidation, setChessComValidation] = useState<ValidationState>({
    isValidating: false,
    isValid: null
  })
  
  const [lichessValidation, setLichessValidation] = useState<ValidationState>({
    isValidating: false,
    isValid: null
  })

  const validateChessComUsernameAsync = useCallback(async (username: string) => {
    if (!username.trim()) {
      setChessComValidation({ isValidating: false, isValid: null })
      return
    }

    setChessComValidation({ isValidating: true, isValid: null })
    
    try {
      const result = await validateChessComUsername(username)
      setChessComValidation({
        isValidating: false,
        isValid: result.isValid,
        error: result.error
      })
    } catch (error) {
      setChessComValidation({
        isValidating: false,
        isValid: false,
        error: 'Failed to validate chess.com username'
      })
    }
  }, [])

  const validateLichessUsernameAsync = useCallback(async (username: string) => {
    if (!username.trim()) {
      setLichessValidation({ isValidating: false, isValid: null })
      return
    }

    setLichessValidation({ isValidating: true, isValid: null })
    
    try {
      const result = await validateLichessUsername(username)
      setLichessValidation({
        isValidating: false,
        isValid: result.isValid,
        error: result.error
      })
    } catch (error) {
      setLichessValidation({
        isValidating: false,
        isValid: false,
        error: 'Failed to validate lichess username'
      })
    }
  }, [])

  const clearValidation = useCallback(() => {
    setChessComValidation({ isValidating: false, isValid: null })
    setLichessValidation({ isValidating: false, isValid: null })
  }, [])

  return {
    chessComValidation,
    lichessValidation,
    validateChessComUsernameAsync,
    validateLichessUsernameAsync,
    clearValidation
  }
}

// Custom hook for debounced validation
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}
