// Central configuration for chess puzzle themes
// This file contains the display names and filtering rules for all theme-based charts

// Tags to exclude as they are not meaningful or specific tactical patterns
export const EXCLUDED_TAGS = new Set([
  'advantage',
  'crushing',
  'short',
  'equality',
  'defensive_move',
  'defensivemove',
  'quietmove',
  'quiet_move',
  'mate',
  'onemove',
  'one_move',
  'long',
  'verylong',
  'kingsideattack',
  'queensideattack',
  'attackingf2f7'
])

// Theme name mapping for better display (supports both snake_case and camelCase)
export const THEME_DISPLAY_NAMES: Record<string, string> = {
  // Snake_case variants
  'fork': 'Fork',
  'pin': 'Pin',
  'skewer': 'Skewer',
  'discovered_attack': 'Discovered Attack',
  'double_attack': 'Double Attack',
  'deflection': 'Deflection',
  'decoy': 'Decoy',
  'clearance': 'Clearance',
  'interference': 'Interference',
  'x_ray_attack': 'X-Ray Attack',
  'attraction': 'Attraction',
  'zugzwang': 'Zugzwang',
  'trapped_piece': 'Trapped Piece',
  'hanging_piece': 'Hanging Piece',
  'sacrifice': 'Sacrifice',
  'mate_in_1': 'Mate in 1',
  'mate_in_2': 'Mate in 2',
  'mate_in_3': 'Mate in 3',
  'mate_in_4': 'Mate in 4',
  'matein1': 'Mate in 1',
  'matein2': 'Mate in 2',
  'matein3': 'Mate in 3',
  'matein4': 'Mate in 4',
  'back_rank_mate': 'Back Rank Mate',
  'smothered_mate': 'Smothered Mate',
  'promotion': 'Promotion',
  'advanced_pawn': 'Advanced Pawn',
  'pawn_endgame': 'Pawn Endgame',
  'capturing_defender': 'Capturing Defender',
  'double_check': 'Double Check',
  'intermezzo': 'Intermezzo',

  // CamelCase variants
  'Fork': 'Fork',
  'Pin': 'Pin',
  'Skewer': 'Skewer',
  'DiscoveredAttack': 'Discovered Attack',
  'DoubleAttack': 'Double Attack',
  'Deflection': 'Deflection',
  'Decoy': 'Decoy',
  'Clearance': 'Clearance',
  'Interference': 'Interference',
  'XRayAttack': 'X-Ray Attack',
  'Attraction': 'Attraction',
  'Zugzwang': 'Zugzwang',
  'TrappedPiece': 'Trapped Piece',
  'HangingPiece': 'Hanging Piece',
  'Sacrifice': 'Sacrifice',
  'MateIn1': 'Mate in 1',
  'MateIn2': 'Mate in 2',
  'MateIn3': 'Mate in 3',
  'MateIn4': 'Mate in 4',
  'BackRankMate': 'Back Rank Mate',
  'SmotheredMate': 'Smothered Mate',
  'Promotion': 'Promotion',
  'AdvancedPawn': 'Advanced Pawn',
  'PawnEndgame': 'Pawn Endgame',
  'CapturingDefender': 'Capturing Defender',
  'DoubleCheck': 'Double Check',
  'Intermezzo': 'Intermezzo'
}

/**
 * Get display name for a chess puzzle theme tag
 * Handles various case formats and provides fallback formatting
 */
export function getThemeDisplayName(tag: string): string {
  // Try exact match first
  if (THEME_DISPLAY_NAMES[tag]) {
    return THEME_DISPLAY_NAMES[tag]
  }

  // Try lowercase version
  if (THEME_DISPLAY_NAMES[tag.toLowerCase()]) {
    return THEME_DISPLAY_NAMES[tag.toLowerCase()]
  }

  // For camelCase, convert to readable format
  // e.g., "HangingPiece" -> "Hanging Piece"
  const camelCaseToWords = tag.replace(/([A-Z])/g, ' $1').trim()

  // For snake_case, convert to readable format
  // e.g., "hanging_piece" -> "Hanging Piece"
  const snakeCaseToWords = tag.replace(/_/g, ' ')

  // Capitalize first letter of each word
  const capitalize = (str: string) => str.replace(/\b\w/g, l => l.toUpperCase())

  return capitalize(camelCaseToWords || snakeCaseToWords)
}

/**
 * Check if a theme tag should be excluded from charts
 */
export function isThemeExcluded(tag: string): boolean {
  return EXCLUDED_TAGS.has(tag.toLowerCase())
}

/**
 * Filter and process theme data for charts
 * Removes excluded tags and applies display name mapping
 */
export function processThemeData<T extends { tag: string }>(
  data: T[],
  transform?: (item: T, displayName: string) => any
): any[] {
  return data
    .filter(item => !isThemeExcluded(item.tag))
    .map(item => {
      const displayName = getThemeDisplayName(item.tag)
      return transform ? transform(item, displayName) : { ...item, displayName }
    })
}
