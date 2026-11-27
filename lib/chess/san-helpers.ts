import { Chess } from 'chess.js'

function parseUci(uci: string): { from: string; to: string; promotion?: string } | null {
  const trimmed = uci.trim()
  if (trimmed.length < 4) return null
  return {
    from: trimmed.slice(0, 2),
    to: trimmed.slice(2, 4),
    promotion: trimmed.length > 4 ? trimmed[4] : undefined,
  }
}

/**
 * Converts a UCI move (e.g. "f3e5") into SAN (e.g. "Nxe5") for the given FEN.
 * Falls back cleanly to the original UCI move if the FEN or move cannot be parsed.
 */
export function uciMoveToSan(fen: string | undefined, uciMove: string): string {
  if (!fen || !uciMove) return uciMove
  try {
    const chess = new Chess(fen)
    const parsed = parseUci(uciMove)
    if (!parsed) return uciMove
    const result = chess.move(parsed)
    return result?.san ?? uciMove
  } catch {
    return uciMove
  }
}

/**
 * Converts a sequence of UCI solution moves starting from `fen` into readable SAN moves.
 */
export function uciLineToSan(fen: string | undefined, uciMoves: readonly string[] | undefined): string[] {
  if (!uciMoves || uciMoves.length === 0) return []
  if (!fen) return [...uciMoves]

  try {
    const chess = new Chess(fen)
    const out: string[] = []
    for (const move of uciMoves) {
      const parsed = parseUci(move)
      if (!parsed) {
        out.push(move)
        break
      }
      const result = chess.move(parsed)
      if (!result) {
        out.push(move)
        break
      }
      out.push(result.san)
    }
    return out
  } catch {
    return [...uciMoves]
  }
}

/**
 * Deterministically orders a two-move Arrow Duel pair using a stable hash of `seed`
 * so the best move is NOT predictably always in slot 2 (blunder, best).
 */
export function deterministicArrowOrder(
  seed: string,
  pair: readonly [string, string],
): [string, string] {
  let hash = 2166136261
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0) % 2 === 1 ? [pair[1], pair[0]] : [pair[0], pair[1]]
}

/**
 * Validates that both Arrow Duel candidate moves are legal moves for the active side on `fen`.
 * Detects corrupted metadata rows (such as alternating-ply pairs where one arrow belongs to the opponent).
 */
export function areCandidateMovesLegalOnFen(
  fen: string | undefined,
  candidateMoves: readonly [string, string] | undefined,
): boolean {
  if (!fen || !candidateMoves || candidateMoves.length !== 2) return false
  try {
    const chess = new Chess(fen)
    for (const uci of candidateMoves) {
      const parsed = parseUci(uci)
      if (!parsed) return false
      const clone = new Chess(chess.fen())
      if (!clone.move(parsed)) {
        return false
      }
    }
    return true
  } catch {
    return false
  }
}

/**
 * Returns the FEN after applying the initial opponent setup move for standard puzzles
 * (where `solutionMoves[0]` is the opponent's move that triggers the tactic),
 * or returns the original FEN if `mode === 'arrow_duel'` or if the setup move isn't legal.
 */
export function getAnalysisStartFen(
  fen: string | undefined,
  mode: 'regular' | 'arrow_duel',
  solutionMoves?: readonly string[],
): string {
  if (!fen) return ''
  if (mode === 'arrow_duel' || !solutionMoves || solutionMoves.length < 2) {
    return fen
  }
  try {
    const chess = new Chess(fen)
    const first = parseUci(solutionMoves[0])
    if (!first) return fen
    const moved = chess.move(first)
    return moved ? chess.fen() : fen
  } catch {
    return fen
  }
}
