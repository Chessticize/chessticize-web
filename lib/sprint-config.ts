/**
 * Centralized Sprint Configuration
 *
 * This file contains all sprint timing configurations to make it easy to tune
 * sprint parameters in one place.
 */

// Valid themes for custom sprint selection
export const VALID_THEMES = [
  'mixed',
  'fork',
  'mateIn1',
  'mateIn2',
  'sacrifice',
  'pin',
  'advancedPawn',
  'discoveredAttack',
  'deflection',
  'hangingPiece',
  'attraction',
  'pawnEndgame',
  'backRankMate',
  'mateIn3',
  'promotion',
  'skewer',
  'intermezzo',
  'trappedPiece',
  'zugzwang',
  'capturingDefender',
  'doubleCheck',
  'mateIn4',
  'interference',
  'smotheredMate',
  'xRayAttack'
] as const

// Valid per-puzzle times in seconds
export const VALID_PER_PUZZLE_TIMES = [5, 10, 15, 20, 30, 60] as const

// Valid sprint durations in minutes
export const VALID_SPRINT_DURATIONS = [3, 5, 10, 15, 20, 25, 30] as const

// Sprint timing configurations
export const SPRINT_TIMINGS = {
  // Standard sprint: 5 minutes total, 20 seconds per puzzle
  STANDARD: {
    duration: 5,      // minutes
    perPuzzle: 20,    // seconds
    eloType: 'mixed 5/20'
  },

  // Blitz sprint: 5 minutes total, 10 seconds per puzzle
  BLITZ: {
    duration: 5,      // minutes
    perPuzzle: 10,    // seconds
    eloType: 'mixed 5/10'
  },

  // Arrow Duel sprint: 5 minutes total, 30 seconds per puzzle
  ARROW_DUEL: {
    duration: 5,      // minutes
    perPuzzle: 30,    // seconds (longer for evaluation)
    eloType: 'arrowduel 5/30'
  },

  // Theme-specific sprints: 5 minutes total, 20 seconds per puzzle
  THEME: {
    duration: 5,      // minutes
    perPuzzle: 20,    // seconds
    getEloType: (theme: string) => `${theme} 5/20`
  }
} as const

// Helper functions to get ELO types
export const getStandardEloType = () => SPRINT_TIMINGS.STANDARD.eloType
export const getBlitzEloType = () => SPRINT_TIMINGS.BLITZ.eloType
export const getArrowDuelEloType = () => SPRINT_TIMINGS.ARROW_DUEL.eloType
export const getThemeEloType = (theme: string) => SPRINT_TIMINGS.THEME.getEloType(theme)

// Display strings for UI
export const SPRINT_DISPLAY = {
  STANDARD: {
    name: 'Standard Sprint',
    description: `${SPRINT_TIMINGS.STANDARD.duration} min / ${SPRINT_TIMINGS.STANDARD.perPuzzle} sec • Win with no mistakes or lose with 3 mistakes.`,
    shortDescription: `${SPRINT_TIMINGS.STANDARD.duration} min / ${SPRINT_TIMINGS.STANDARD.perPuzzle} sec`
  },

  BLITZ: {
    name: 'Blitz Sprint',
    description: `${SPRINT_TIMINGS.BLITZ.duration} min / ${SPRINT_TIMINGS.BLITZ.perPuzzle} sec • Maximum intensity training for quick pattern recognition.`,
    shortDescription: `${SPRINT_TIMINGS.BLITZ.duration} min / ${SPRINT_TIMINGS.BLITZ.perPuzzle} sec`
  },

  ARROW_DUEL: {
    name: 'Arrow Duel',
    description: `${SPRINT_TIMINGS.ARROW_DUEL.duration} min / ${SPRINT_TIMINGS.ARROW_DUEL.perPuzzle} sec • Choose the best move between two candidates.`,
    shortDescription: `${SPRINT_TIMINGS.ARROW_DUEL.duration} min / ${SPRINT_TIMINGS.ARROW_DUEL.perPuzzle} sec`
  },

  THEME: {
    getName: (themeDisplayName: string) => `${themeDisplayName} Training`,
    getDescription: (themeDisplayName: string) => `${SPRINT_TIMINGS.THEME.duration}-minute sprint focused on ${themeDisplayName.toLowerCase()} tactics`,
    shortDescription: `${SPRINT_TIMINGS.THEME.duration} min / ${SPRINT_TIMINGS.THEME.perPuzzle} sec`
  }
} as const

// Legacy support - these match the current backend default
export const LEGACY_DEFAULT_ELO_TYPE = 'mixed 10/30'

/**
 * Get ELO type for a specific sprint mode
 */
export function getEloTypeForMode(mode: 'standard' | 'blitz' | 'arrowduel' | 'theme', theme?: string): string {
  switch (mode) {
    case 'standard':
      return getStandardEloType()
    case 'blitz':
      return getBlitzEloType()
    case 'arrowduel':
      return getArrowDuelEloType()
    case 'theme':
      if (!theme) throw new Error('Theme is required for theme mode')
      return getThemeEloType(theme)
    default:
      throw new Error(`Unknown sprint mode: ${mode}`)
  }
}

/**
 * Parse an ELO type string to extract timing information
 */
export function parseEloType(eloType: string): { theme: string; duration: number; perPuzzle: number } | null {
  const match = eloType.match(/^(.+)\s+(\d+)\/(\d+)$/)
  if (!match) return null

  const [, theme, duration, perPuzzle] = match
  return {
    theme,
    duration: parseInt(duration, 10),
    perPuzzle: parseInt(perPuzzle, 10)
  }
}

/**
 * Generate ELO type for custom sprint configuration
 */
export function getCustomEloType(theme: string, durationMinutes: number, perPuzzleSeconds: number): string {
  return `${theme} ${durationMinutes}/${perPuzzleSeconds}`
}

/**
 * Validate custom sprint configuration
 */
export function validateCustomSprintConfig(
  theme: string,
  durationMinutes: number,
  perPuzzleSeconds: number
): { isValid: boolean; error?: string } {
  // Validate theme
  if (!VALID_THEMES.includes(theme as any)) {
    return { isValid: false, error: `Invalid theme: ${theme}` }
  }

  // Validate per-puzzle time
  if (!VALID_PER_PUZZLE_TIMES.includes(perPuzzleSeconds as any)) {
    return { isValid: false, error: `Invalid per-puzzle time: ${perPuzzleSeconds}s` }
  }

  // Validate sprint duration
  if (!VALID_SPRINT_DURATIONS.includes(durationMinutes as any)) {
    return { isValid: false, error: `Invalid sprint duration: ${durationMinutes} minutes` }
  }

  // Validate that sprint size can divide the time
  const totalSeconds = durationMinutes * 60
  const targetPuzzles = Math.floor(totalSeconds / perPuzzleSeconds)

  if (targetPuzzles < 1) {
    return { isValid: false, error: 'Sprint duration too short for selected puzzle time' }
  }

  if (targetPuzzles > 100) {
    return { isValid: false, error: 'Sprint would have too many puzzles (max 100)' }
  }

  return { isValid: true }
}

/**
 * Calculate target puzzles for custom sprint
 */
export function calculateTargetPuzzles(durationMinutes: number, perPuzzleSeconds: number): number {
  const totalSeconds = durationMinutes * 60
  return Math.floor(totalSeconds / perPuzzleSeconds)
}
