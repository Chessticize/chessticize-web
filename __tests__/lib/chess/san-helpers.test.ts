import { describe, expect, it } from 'vitest'
import {
  areCandidateMovesLegalOnFen,
  deterministicArrowOrder,
  getAnalysisStartFen,
  uciLineToSan,
  uciMoveToSan,
} from '@/lib/chess/san-helpers'

const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

describe('san-helpers', () => {
  it('converts legal UCI moves into SAN and falls back safely for invalid FEN', () => {
    expect(uciMoveToSan(START_FEN, 'e2e4')).toBe('e4')
    expect(uciMoveToSan(START_FEN, 'g1f3')).toBe('Nf3')
    expect(uciMoveToSan('invalid-fen', 'e2e4')).toBe('e2e4')
  })

  it('converts a sequence of UCI moves into SAN', () => {
    expect(uciLineToSan(START_FEN, ['e2e4', 'e7e5', 'g1f3'])).toEqual(['e4', 'e5', 'Nf3'])
  })

  it('deterministically distributes Arrow Duel candidate ordering across seeds', () => {
    const first = deterministicArrowOrder('item-1', ['e2e3', 'e2e4'])
    expect(deterministicArrowOrder('item-1', ['e2e3', 'e2e4'])).toEqual(first)

    const orders = new Set(
      Array.from({ length: 20 }, (_, i) =>
        deterministicArrowOrder(`review-item-${i}`, ['e2e3', 'e2e4']).join(','),
      ),
    )
    expect(orders.size).toBe(2)
  })

  it('advances past opponent setup move for regular puzzle analysis start FEN', () => {
    const nextFen = getAnalysisStartFen(START_FEN, 'regular', ['e2e4', 'e7e5'])
    expect(nextFen).toContain('4P3')
    expect(getAnalysisStartFen(START_FEN, 'arrow_duel', ['e2e4', 'e7e5'])).toBe(START_FEN)
  })

  it('detects illegal opposite-color Arrow Duel candidate pairs', () => {
    const corruptedFen = '2kr3r/p3bq2/1np2p2/1p3P1p/1P1pP1pP/3PB1N1/P3RP1K/R3Q3 w - - 0 26'
    expect(areCandidateMovesLegalOnFen(corruptedFen, ['e3d4', 'd8d4'])).toBe(false)
    expect(areCandidateMovesLegalOnFen(corruptedFen, ['e3d4', 'e3f4'])).toBe(true)
    expect(areCandidateMovesLegalOnFen(START_FEN, ['e2e3', 'e2e4'])).toBe(true)
  })
})
