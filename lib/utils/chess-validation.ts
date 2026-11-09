/**
 * Chess username validation utilities
 * Validates usernames against chess.com and lichess.org APIs
 */

export interface ChessValidationResult {
  isValid: boolean
  error?: string
}

export interface ValidationState {
  isValidating: boolean
  isValid: boolean | null
  error?: string
}

/**
 * Validate a chess.com username by checking if the account exists
 */
export async function validateChessComUsername(username: string): Promise<ChessValidationResult> {
  if (!username.trim()) {
    return { isValid: true } // Empty username is valid (optional)
  }

  try {
    const response = await fetch(`https://api.chess.com/pub/player/${encodeURIComponent(username.trim())}`)
    
    if (!response.ok) {
      return {
        isValid: false,
        error: "Failed to verify chess.com account."
      }
    }

    const data = await response.json()
    
    if (!data.player_id) {
      return {
        isValid: false,
        error: "Chess.com account does not exist."
      }
    }

    return { isValid: true }
  } catch (error) {
    return {
      isValid: false,
      error: "Failed to verify chess.com account."
    }
  }
}

/**
 * Validate a lichess.org username by checking if the account exists
 */
export async function validateLichessUsername(username: string): Promise<ChessValidationResult> {
  if (!username.trim()) {
    return { isValid: true } // Empty username is valid (optional)
  }

  try {
    const response = await fetch(`https://lichess.org/api/user/${encodeURIComponent(username.trim())}`)
    
    if (!response.ok) {
      return {
        isValid: false,
        error: "Failed to verify lichess account."
      }
    }

    const data = await response.json()
    
    if (!data.id) {
      return {
        isValid: false,
        error: "Lichess account does not exist."
      }
    }

    return { isValid: true }
  } catch (error) {
    return {
      isValid: false,
      error: "Failed to verify lichess account."
    }
  }
}

/**
 * Validate both chess.com and lichess usernames
 */
export async function validateChessUsernames(
  chessComUsername: string,
  lichessUsername: string
): Promise<ChessValidationResult> {
  try {
    // Validate chess.com username if provided
    if (chessComUsername.trim()) {
      const chessComResult = await validateChessComUsername(chessComUsername)
      if (!chessComResult.isValid) {
        return chessComResult
      }
    }

    // Validate lichess username if provided
    if (lichessUsername.trim()) {
      const lichessResult = await validateLichessUsername(lichessUsername)
      if (!lichessResult.isValid) {
        return lichessResult
      }
    }

    return { isValid: true }
  } catch (error) {
    return {
      isValid: false,
      error: "Failed to validate chess usernames. Please try again."
    }
  }
}
