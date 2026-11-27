import { Chess, type Square } from 'chess.js'

export type BoardColor = 'white' | 'black'
export type BoardMode = 'puzzle' | 'analysis' | 'arrowduel'

export interface ParsedUciMove {
  from: Square
  to: Square
  promotion?: 'q' | 'r' | 'b' | 'n'
}

/**
 * Shared Chessticize slate board tokens aligned with Mobile UI Design Spec.
 */
export const SLATE_BOARD_THEME = {
  lightSquare: '#E6E8EB',
  darkSquare: '#7B8794',
} as const

/**
 * In standard Lichess puzzles, the FEN starts right before the opponent's setup move,
 * so the player plays the opposite side of the FEN active color.
 */
export function getPuzzlePlayerColor(fen: string): BoardColor {
  try {
    const activeColor = fen.trim().split(/\s+/)[1]
    return activeColor === 'w' ? 'black' : 'white'
  } catch {
    return 'white'
  }
}

/**
 * In Arrow Duel positions, the FEN active color is the player directly to move.
 */
export function getArrowDuelActiveColor(fen: string): BoardColor {
  try {
    const activeColor = fen.trim().split(/\s+/)[1]
    return activeColor === 'b' ? 'black' : 'white'
  } catch {
    return 'white'
  }
}

/**
 * Determines the board orientation once for a given FEN and mode.
 */
export function getBoardOrientationFromFen(
  fen: string,
  mode: BoardMode = 'puzzle',
  explicitOrientation?: BoardColor,
): BoardColor {
  if (explicitOrientation) {
    return explicitOrientation
  }

  try {
    const chess = new Chess(fen)
    const turn = chess.turn()
    if (mode === 'arrowduel') {
      return turn === 'w' ? 'white' : 'black'
    }
    return turn === 'b' ? 'white' : 'black'
  } catch {
    return 'white'
  }
}

/**
 * Parses a UCI move string (e.g. "e2e4" or "e7e8q") into validated board squares.
 */
export function parseUciMove(uci: string): ParsedUciMove | null {
  const trimmed = uci.trim().toLowerCase()
  const match = /^([a-h][1-8])([a-h][1-8])([qrbn])?$/.exec(trimmed)
  if (!match) {
    return null
  }
  const [, from, to, promotion] = match
  return {
    from: from as Square,
    to: to as Square,
    ...(promotion ? { promotion: promotion as 'q' | 'r' | 'b' | 'n' } : {}),
  }
}
