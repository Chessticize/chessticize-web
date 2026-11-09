import { describe, it, expect } from 'vitest'
import {
  formatEvaluation,
  getEvaluationColor,
  getEvaluationIcon,
  getEvaluationDescription,
  getPuzzleResolverColor
} from '@/lib/evaluation-utils'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

describe('evaluation-utils', () => {
  describe('formatEvaluation', () => {
    it('formats positive evaluations correctly', () => {
      expect(formatEvaluation(150)).toBe('+1.5')
      expect(formatEvaluation(50)).toBe('+0.5')
    })

    it('formats negative evaluations correctly', () => {
      expect(formatEvaluation(-150)).toBe('-1.5')
      expect(formatEvaluation(-50)).toBe('-0.5')
    })

    it('formats mate scores correctly', () => {
      expect(formatEvaluation(0, true, 3)).toBe('+M3')
      expect(formatEvaluation(0, true, -2)).toBe('-M2')
    })

    it('formats large evaluations as mate', () => {
      expect(formatEvaluation(1500)).toBe('+M')
      expect(formatEvaluation(-1500)).toBe('-M')
    })
  })

  describe('getPuzzleResolverColor', () => {
    it('returns white when white to move', () => {
      const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
      expect(getPuzzleResolverColor(fen)).toBe('white')
    })

    it('returns black when black to move', () => {
      const fen = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1'
      expect(getPuzzleResolverColor(fen)).toBe('black')
    })
  })

  describe('getEvaluationColor', () => {
    describe('for white puzzle resolver', () => {
      it('returns green for positive evaluations', () => {
        expect(getEvaluationColor(150, 'white')).toBe('text-green-600')
      })

      it('returns red for negative evaluations', () => {
        expect(getEvaluationColor(-150, 'white')).toBe('text-red-600')
      })

      it('returns gray for neutral evaluations', () => {
        expect(getEvaluationColor(50, 'white')).toBe('text-gray-600')
        expect(getEvaluationColor(-50, 'white')).toBe('text-gray-600')
      })
    })

    describe('for black puzzle resolver', () => {
      it('returns green for negative evaluations', () => {
        expect(getEvaluationColor(-150, 'black')).toBe('text-green-600')
      })

      it('returns red for positive evaluations', () => {
        expect(getEvaluationColor(150, 'black')).toBe('text-red-600')
      })

      it('returns gray for neutral evaluations', () => {
        expect(getEvaluationColor(50, 'black')).toBe('text-gray-600')
        expect(getEvaluationColor(-50, 'black')).toBe('text-gray-600')
      })
    })
  })

  describe('getEvaluationIcon', () => {
    describe('for white puzzle resolver', () => {
      it('returns TrendingUp for positive evaluations', () => {
        expect(getEvaluationIcon(150, 'white')).toBe(TrendingUp)
      })

      it('returns TrendingDown for negative evaluations', () => {
        expect(getEvaluationIcon(-150, 'white')).toBe(TrendingDown)
      })

      it('returns Minus for neutral evaluations', () => {
        expect(getEvaluationIcon(50, 'white')).toBe(Minus)
        expect(getEvaluationIcon(-50, 'white')).toBe(Minus)
      })
    })

    describe('for black puzzle resolver', () => {
      it('returns TrendingUp for negative evaluations', () => {
        expect(getEvaluationIcon(-150, 'black')).toBe(TrendingUp)
      })

      it('returns TrendingDown for positive evaluations', () => {
        expect(getEvaluationIcon(150, 'black')).toBe(TrendingDown)
      })

      it('returns Minus for neutral evaluations', () => {
        expect(getEvaluationIcon(50, 'black')).toBe(Minus)
        expect(getEvaluationIcon(-50, 'black')).toBe(Minus)
      })
    })
  })

  describe('getEvaluationDescription', () => {
    describe('for white puzzle resolver', () => {
      it('returns advantage message for positive evaluations', () => {
        expect(getEvaluationDescription(150, 'white')).toBe('You have a significant advantage')
      })

      it('returns disadvantage message for negative evaluations', () => {
        expect(getEvaluationDescription(-150, 'white')).toBe('Your opponent has a significant advantage')
      })

      it('returns equal message for neutral evaluations', () => {
        expect(getEvaluationDescription(50, 'white')).toBe('Position is roughly equal')
      })
    })

    describe('for black puzzle resolver', () => {
      it('returns advantage message for negative evaluations', () => {
        expect(getEvaluationDescription(-150, 'black')).toBe('You have a significant advantage')
      })

      it('returns disadvantage message for positive evaluations', () => {
        expect(getEvaluationDescription(150, 'black')).toBe('Your opponent has a significant advantage')
      })

      it('returns equal message for neutral evaluations', () => {
        expect(getEvaluationDescription(50, 'black')).toBe('Position is roughly equal')
      })
    })
  })
})
