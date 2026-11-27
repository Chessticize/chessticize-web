import { describe, expect, it } from 'vitest'
import {
  getArrowDuelActiveColor,
  getBoardOrientationFromFen,
  getPuzzlePlayerColor,
  parseUciMove,
  SLATE_BOARD_THEME,
} from '@/lib/chess/board-helpers'

const WHITE_TO_MOVE_FEN = 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3'
const BLACK_TO_MOVE_FEN = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1'

describe('board helpers', () => {
  it('resolves puzzle player color as opposite of FEN active side', () => {
    expect(getPuzzlePlayerColor(WHITE_TO_MOVE_FEN)).toBe('black')
    expect(getPuzzlePlayerColor(BLACK_TO_MOVE_FEN)).toBe('white')
    expect(getPuzzlePlayerColor('invalid')).toBe('white')
  })

  it('resolves Arrow Duel active color directly from FEN active side', () => {
    expect(getArrowDuelActiveColor(WHITE_TO_MOVE_FEN)).toBe('white')
    expect(getArrowDuelActiveColor(BLACK_TO_MOVE_FEN)).toBe('black')
  })

  it('computes board orientation based on mode and explicit override', () => {
    expect(getBoardOrientationFromFen(WHITE_TO_MOVE_FEN, 'puzzle')).toBe('black')
    expect(getBoardOrientationFromFen(BLACK_TO_MOVE_FEN, 'puzzle')).toBe('white')
    expect(getBoardOrientationFromFen(WHITE_TO_MOVE_FEN, 'arrowduel')).toBe('white')
    expect(getBoardOrientationFromFen(BLACK_TO_MOVE_FEN, 'arrowduel')).toBe('black')
    expect(getBoardOrientationFromFen(WHITE_TO_MOVE_FEN, 'puzzle', 'white')).toBe('white')
    expect(getBoardOrientationFromFen('not-a-fen', 'puzzle')).toBe('white')
  })

  it('parses valid UCI moves including promotions and rejects malformed moves', () => {
    expect(parseUciMove('e2e4')).toEqual({ from: 'e2', to: 'e4' })
    expect(parseUciMove('E7E8Q')).toEqual({ from: 'e7', to: 'e8', promotion: 'q' })
    expect(parseUciMove('e2')).toBeNull()
    expect(parseUciMove('z9a1')).toBeNull()
    expect(parseUciMove('e7e8k')).toBeNull()
  })

  it('exposes Chessticize slate board tokens aligned with mobile spec', () => {
    expect(SLATE_BOARD_THEME).toEqual({
      lightSquare: '#E6E8EB',
      darkSquare: '#7B8794',
    })
  })
})
