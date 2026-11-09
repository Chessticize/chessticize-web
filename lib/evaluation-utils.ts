import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

/**
 * Utility functions for chess evaluation display and color coding
 * 
 * Key principles:
 * 1. Scores are always shown from White's perspective (positive = good for White, negative = good for Black)
 * 2. Color coding uses the puzzle resolver's perspective (green = good for resolver, red = bad for resolver)
 */

/**
 * Format evaluation score for display
 * Always shows from White's perspective
 */
export function formatEvaluation(centipawns: number, isMate?: boolean, mateIn?: number): string {
  if (isMate && mateIn !== undefined) {
    return mateIn > 0 ? `+M${mateIn}` : `-M${Math.abs(mateIn)}`
  }

  if (Math.abs(centipawns) > 1000) {
    return centipawns > 0 ? '+M' : '-M' // Mate
  }
  
  const pawns = centipawns / 100
  return pawns > 0 ? `+${pawns.toFixed(1)}` : pawns.toFixed(1)
}

/**
 * Get color class for evaluation display based on puzzle resolver's perspective
 * @param centipawns - Evaluation in centipawns (from White's perspective)
 * @param puzzleResolverColor - The color of the side solving the puzzle ('white' or 'black')
 */
export function getEvaluationColor(centipawns: number, puzzleResolverColor: 'white' | 'black'): string {
  const threshold = 100
  
  if (puzzleResolverColor === 'white') {
    // For white puzzle resolver: positive = green, negative = red
    if (centipawns > threshold) return 'text-green-600'
    if (centipawns < -threshold) return 'text-red-600'
  } else {
    // For black puzzle resolver: negative = green, positive = red
    if (centipawns < -threshold) return 'text-green-600'
    if (centipawns > threshold) return 'text-red-600'
  }
  
  return 'text-gray-600'
}

/**
 * Get icon for evaluation display based on puzzle resolver's perspective
 * @param centipawns - Evaluation in centipawns (from White's perspective)
 * @param puzzleResolverColor - The color of the side solving the puzzle ('white' or 'black')
 */
export function getEvaluationIcon(centipawns: number, puzzleResolverColor: 'white' | 'black') {
  const threshold = 100
  
  if (puzzleResolverColor === 'white') {
    // For white puzzle resolver: positive = up arrow, negative = down arrow
    if (centipawns > threshold) return TrendingUp
    if (centipawns < -threshold) return TrendingDown
  } else {
    // For black puzzle resolver: negative = up arrow, positive = down arrow
    if (centipawns < -threshold) return TrendingUp
    if (centipawns > threshold) return TrendingDown
  }
  
  return Minus
}

/**
 * Get evaluation description based on puzzle resolver's perspective
 * @param centipawns - Evaluation in centipawns (from White's perspective)
 * @param puzzleResolverColor - The color of the side solving the puzzle ('white' or 'black')
 */
export function getEvaluationDescription(centipawns: number, puzzleResolverColor: 'white' | 'black'): string {
  const threshold = 100
  
  if (Math.abs(centipawns) <= threshold) {
    return 'Position is roughly equal'
  }
  
  if (puzzleResolverColor === 'white') {
    return centipawns > threshold 
      ? 'You have a significant advantage'
      : 'Your opponent has a significant advantage'
  } else {
    return centipawns < -threshold 
      ? 'You have a significant advantage'
      : 'Your opponent has a significant advantage'
  }
}

/**
 * Determine the puzzle resolver's color from a FEN string
 * The puzzle resolver is the side that needs to move in the puzzle
 */
export function getPuzzleResolverColor(fen: string): 'white' | 'black' {
  const activeColor = fen.split(' ')[1]
  return activeColor === 'w' ? 'white' : 'black'
}

/**
 * Legacy function for backward compatibility
 * Uses White's perspective for color coding (old behavior)
 * @deprecated Use getEvaluationColor with puzzleResolverColor instead
 */
export function getEvaluationColorLegacy(centipawns: number): string {
  if (centipawns > 100) return 'text-green-600'
  if (centipawns < -100) return 'text-red-600'
  return 'text-gray-600'
}

/**
 * Legacy function for backward compatibility
 * Uses White's perspective for icons (old behavior)
 * @deprecated Use getEvaluationIcon with puzzleResolverColor instead
 */
export function getEvaluationIconLegacy(centipawns: number) {
  if (centipawns > 100) return TrendingUp
  if (centipawns < -100) return TrendingDown
  return Minus
}
