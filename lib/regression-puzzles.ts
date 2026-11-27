import type { SprintPuzzleAttempt } from "@/hooks/useSprintApi"

export interface RegressionPuzzleSample {
  id: string
  title: string
  category: "promotion" | "arrow_duel" | "check" | "tactics"
  mode: "regular" | "arrow_duel"
  description: string
  fen: string
  solutionMoves: string[]
  rating: number
  themes: string[]
  candidateMoves?: [string, string]
  bestMove?: string
  blunderMove?: string
}

/**
 * Hardcoded regression suite aligned with Chessticize Mobile fixtures
 * (`fixtures/puzzles/regression-samples.json`, `bundled-core-pack.json`, and
 * Arrow Duel promotion test cases). Staging/local only; never shown in production.
 */
export const STAGING_REGRESSION_PUZZLES: RegressionPuzzleSample[] = [
  {
    id: "00ueM",
    title: "Queen Promotion Mate",
    category: "promotion",
    mode: "regular",
    description: "Includes both an opponent auto-promotion (a2a1q) and a player promotion checkmate (g7g8q).",
    fen: "2kr4/2pR4/2P1K1P1/8/8/p3n3/8/8 b - - 1 49",
    solutionMoves: ["a3a2", "d7d8", "c8d8", "g6g7", "a2a1q", "g7g8q"],
    rating: 1753,
    themes: ["advancedPawn", "endgame", "mateIn3", "promotion"],
  },
  {
    id: "0JwMd",
    title: "Knight Underpromotion",
    category: "promotion",
    mode: "regular",
    description: "Push the d-pawn and underpromote to a Knight (d7d8n) to win the bishop endgame.",
    fen: "8/2K5/5k2/3Pp1p1/4P1P1/4bP2/8/8 b - - 4 67",
    solutionMoves: ["f6e7", "d5d6", "e7e6", "d6d7", "e3d2", "d7d8n"],
    rating: 1586,
    themes: ["advancedPawn", "endgame", "promotion", "underPromotion"],
  },
  {
    id: "reg-arrow-same-sq-promo",
    title: "Arrow Duel: Q vs N Promotion",
    category: "arrow_duel",
    mode: "arrow_duel",
    description: "Both arrows land on e1 (e2e1q vs e2e1n). Tap e1 or drag e2 to e1 to choose between Queen and Knight.",
    fen: "4r3/7R/k1p5/p7/1pP3P1/1Pb5/P3pBKP/8 b - - 0 1",
    solutionMoves: ["e2e1q"],
    candidateMoves: ["e2e1q", "e2e1n"],
    bestMove: "e2e1n",
    blunderMove: "e2e1q",
    rating: 1680,
    themes: ["promotion", "underPromotion", "endgame"],
  },
  {
    id: "reg-arrow-diff-sq-promo",
    title: "Arrow Duel: Rook Promotion vs Rook Move",
    category: "arrow_duel",
    mode: "arrow_duel",
    description: "Two distinct arrows where one promotes to a Rook (e2e1r badge) and the other moves the rook (b3e3).",
    fen: "4k3/R3P3/1p3Kpp/2p5/2P5/1r6/4p1P1/8 b - - 0 1",
    solutionMoves: ["b3e3"],
    candidateMoves: ["b3e3", "e2e1r"],
    bestMove: "e2e1r",
    blunderMove: "b3e3",
    rating: 1620,
    themes: ["promotion", "underPromotion", "endgame"],
  },
  {
    id: "00008",
    title: "Multi-Move Tactical Line",
    category: "tactics",
    mode: "regular",
    description: "Three required player moves with opponent auto-replies.",
    fen: "r6k/pp2r2p/4Rp1Q/3p4/8/1N1P2R1/PqP2bPP/7K b - - 0 24",
    solutionMoves: ["f2g3", "e6e7", "b2b1", "b3c1", "b1c1", "h6c1"],
    rating: 1798,
    themes: ["crushing", "hangingPiece", "long", "middlegame"],
  },
  {
    id: "00LSv",
    title: "Starts In Check After Auto Move",
    category: "check",
    mode: "regular",
    description: "Opponent plays g2g1+ putting White in check before your first move.",
    fen: "3r3k/1p4pp/2p3q1/8/3Q4/8/PP4rP/R4R1K b - - 1 28",
    solutionMoves: ["g2g1", "d4g1", "g6e4", "g1g2"],
    rating: 1697,
    themes: ["advantage", "endgame", "short"],
  },
  {
    id: "00DkJ",
    title: "Initial FEN In Check",
    category: "check",
    mode: "regular",
    description: "Source position begins with Black already in check before stepping out to d6.",
    fen: "3r1bnr/2p2ppp/2b5/R1k5/5P2/2N5/4N1PP/1R4K1 b - - 3 21",
    solutionMoves: ["c5d6", "b1d1", "d6e7", "a5e5", "e7f6", "d1d8"],
    rating: 1641,
    themes: ["crushing", "deflection", "exposedKing", "middlegame"],
  },
  {
    id: "000hf",
    title: "Short Mate in 2",
    category: "tactics",
    mode: "regular",
    description: "Quick 2-move mate smoke check.",
    fen: "r1bqk2r/pp1nbNp1/2p1p2p/8/2BP4/1PN3P1/P3QP1P/3R1RK1 b kq - 0 19",
    solutionMoves: ["e8f7", "e2e6", "f7f8", "e6f7"],
    rating: 1485,
    themes: ["mate", "mateIn2", "middlegame", "short"],
  },
]

export function toRegressionMistakeAttempts(
  samples: RegressionPuzzleSample[] = STAGING_REGRESSION_PUZZLES,
): SprintPuzzleAttempt[] {
  return samples.map((sample, index) => ({
    puzzle_id: sample.id,
    sequence_in_sprint: index + 1,
    fen: sample.fen,
    solution_moves: sample.solutionMoves,
    rating: sample.rating,
    themes: sample.themes,
    attempt_status: "failed",
    user_moves: [],
    was_correct: false,
    time_taken_ms: (index + 4) * 1000,
    attempted_at: new Date().toISOString(),
    attempt_type: sample.mode === "arrow_duel" ? "arrow_duel" : "regular",
    candidate_moves: sample.candidateMoves,
    chosen_move: sample.blunderMove,
    best_move: sample.bestMove,
    blunder_move: sample.blunderMove,
  }))
}
