/**
 * Test positions for Arrow Duel filtering
 * Contains various chess positions with known characteristics for testing
 */

import type { SprintPuzzle } from '@/lib/arrow-duel-filter'

export interface TestPosition {
  name: string
  puzzle: SprintPuzzle
  expectedBestMove: string
  expectedEvalDiff: number
  shouldAccept: boolean
  description: string
}

export const TEST_POSITIONS: TestPosition[] = [
  {
    name: 'queen_blunder',
    puzzle: {
      puzzle_id: 'test-queen-blunder',
      fen: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2',
      solution_moves: ['Qh5'], // Hangs queen to g5 knight
      rating: 1200,
      themes: ['blunder', 'queenTrap'],
      sequence_in_sprint: 1
    },
    expectedBestMove: 'Nf3',
    expectedEvalDiff: 900, // ~9 pawns (queen value)
    shouldAccept: true,
    description: 'Queen blunder vs normal development - should be accepted'
  },
  
  {
    name: 'opening_moves_equal',
    puzzle: {
      puzzle_id: 'test-opening-equal',
      fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      solution_moves: ['e2e3'], // Slightly inferior to e4
      rating: 800,
      themes: ['opening'],
      sequence_in_sprint: 1
    },
    expectedBestMove: 'e2e4',
    expectedEvalDiff: 40, // Small difference
    shouldAccept: false,
    description: 'Similar opening moves - should be rejected due to small eval difference'
  },

  {
    name: 'tactics_fork',
    puzzle: {
      puzzle_id: 'test-fork-tactic',
      fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/3P1N2/PPP2PPP/RNBQK2R w KQkq - 4 4',
      solution_moves: ['Nd5'], // Knight to d5 forks king and queen
      rating: 1400,
      themes: ['fork', 'tactics'],
      sequence_in_sprint: 1
    },
    expectedBestMove: 'O-O',
    expectedEvalDiff: 150, // Moderate advantage
    shouldAccept: true,
    description: 'Tactical fork vs safe castling - should be accepted'
  },

  {
    name: 'back_rank_mate',
    puzzle: {
      puzzle_id: 'test-back-rank',
      fen: '6k1/5ppp/8/8/8/8/5PPP/4R1K1 w - - 0 1',
      solution_moves: ['g2g3'], // Weakens king safety, allows mate
      rating: 1600,
      themes: ['backRankMate', 'mateIn1'],
      sequence_in_sprint: 1
    },
    expectedBestMove: 'Re8#',
    expectedEvalDiff: 10000, // Mate score
    shouldAccept: true,
    description: 'Allows back rank mate vs immediate mate - should be accepted'
  },

  {
    name: 'piece_trade_equal',
    puzzle: {
      puzzle_id: 'test-trade-equal',
      fen: 'rnbqkb1r/pppppppp/5n2/8/3P4/8/PPP1PPPP/RNBQKBNR w KQkq - 1 2',
      solution_moves: ['Bxf6'], // Equal trade
      rating: 1000,
      themes: ['trade'],
      sequence_in_sprint: 1
    },
    expectedBestMove: 'Nf3',
    expectedEvalDiff: 30, // Very small difference
    shouldAccept: false,
    description: 'Equal piece trade vs development - should be rejected'
  },

  {
    name: 'pin_tactic',
    puzzle: {
      puzzle_id: 'test-pin-tactic',
      fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/3P1N2/PPP2PPP/RNBQ1RK1 b kq - 5 5',
      solution_moves: ['Bg4'], // Pins knight to queen
      rating: 1300,
      themes: ['pin', 'tactics'],
      sequence_in_sprint: 1
    },
    expectedBestMove: 'h2h3',
    expectedEvalDiff: 200, // Wins material due to pin
    shouldAccept: true,
    description: 'Pin tactic vs pawn move - should be accepted'
  },

  {
    name: 'endgame_blunder',
    puzzle: {
      puzzle_id: 'test-endgame-blunder',
      fen: '8/8/8/8/8/3k4/3P4/3K4 w - - 0 1',
      solution_moves: ['d2d4'], // Allows stalemate
      rating: 1100,
      themes: ['endgame', 'stalemate'],
      sequence_in_sprint: 1
    },
    expectedBestMove: 'Kd2',
    expectedEvalDiff: 500, // Stalemate vs winning
    shouldAccept: true,
    description: 'Stalemate blunder vs correct king move - should be accepted'
  },

  {
    name: 'castle_rights_loss',
    puzzle: {
      puzzle_id: 'test-castle-rights',
      fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4',
      solution_moves: ['Kf1'], // Loses castling rights
      rating: 900,
      themes: ['castling'],
      sequence_in_sprint: 1
    },
    expectedBestMove: 'O-O',
    expectedEvalDiff: 70, // Moderate but not huge
    shouldAccept: false,
    description: 'Losing castling rights vs castling - small eval difference'
  }
]

export const EDGE_CASE_POSITIONS: TestPosition[] = [
  {
    name: 'illegal_puzzle_move',
    puzzle: {
      puzzle_id: 'test-illegal-move',
      fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      solution_moves: ['e2e5'], // Illegal pawn jump
      rating: 1000,
      themes: ['invalid'],
      sequence_in_sprint: 1
    },
    expectedBestMove: 'e2e4',
    expectedEvalDiff: 0,
    shouldAccept: false,
    description: 'Illegal puzzle move - should be rejected'
  },

  {
    name: 'empty_solution_moves',
    puzzle: {
      puzzle_id: 'test-empty-moves',
      fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      solution_moves: [],
      rating: 1000,
      themes: ['invalid'],
      sequence_in_sprint: 1
    },
    expectedBestMove: 'e2e4',
    expectedEvalDiff: 0,
    shouldAccept: false,
    description: 'Empty solution moves - should be rejected'
  },

  {
    name: 'invalid_fen',
    puzzle: {
      puzzle_id: 'test-invalid-fen',
      fen: 'invalid-fen-string',
      solution_moves: ['e2e4'],
      rating: 1000,
      themes: ['invalid'],
      sequence_in_sprint: 1
    },
    expectedBestMove: '',
    expectedEvalDiff: 0,
    shouldAccept: false,
    description: 'Invalid FEN string - should be rejected'
  }
]

// Helper function to get test position by name
export function getTestPosition(name: string): TestPosition | undefined {
  return [...TEST_POSITIONS, ...EDGE_CASE_POSITIONS].find(pos => pos.name === name)
}

// Helper function to get positions that should be accepted
export function getAcceptablePositions(): TestPosition[] {
  return TEST_POSITIONS.filter(pos => pos.shouldAccept)
}

// Helper function to get positions that should be rejected
export function getRejectedPositions(): TestPosition[] {
  return [...TEST_POSITIONS, ...EDGE_CASE_POSITIONS].filter(pos => !pos.shouldAccept)
}