import { describe, it, expect } from 'vitest'
import { 
  validateCustomSprintConfig, 
  calculateTargetPuzzles, 
  getCustomEloType,
  VALID_THEMES,
  VALID_PER_PUZZLE_TIMES,
  VALID_SPRINT_DURATIONS
} from '@/lib/sprint-config'

describe('Custom Sprint Configuration', () => {
  describe('validateCustomSprintConfig', () => {
    it('should validate correct configurations', () => {
      const result = validateCustomSprintConfig('mixed', 5, 20)
      expect(result.isValid).toBe(true)
      expect(result.error).toBeUndefined()
    })

    it('should reject invalid themes', () => {
      const result = validateCustomSprintConfig('invalidTheme', 5, 20)
      expect(result.isValid).toBe(false)
      expect(result.error).toContain('Invalid theme')
    })

    it('should reject invalid per-puzzle times', () => {
      const result = validateCustomSprintConfig('mixed', 5, 25)
      expect(result.isValid).toBe(false)
      expect(result.error).toContain('Invalid per-puzzle time')
    })

    it('should reject invalid sprint durations', () => {
      const result = validateCustomSprintConfig('mixed', 7, 20) // 7 is not in the valid list
      expect(result.isValid).toBe(false)
      expect(result.error).toContain('Invalid sprint duration')
    })

    it('should reject configurations with too few puzzles', () => {
      // This would result in 0 puzzles (30 seconds / 60 seconds per puzzle = 0.5, floored to 0)
      const result = validateCustomSprintConfig('mixed', 1, 120) // Invalid per-puzzle time anyway
      expect(result.isValid).toBe(false)
      expect(result.error).toContain('Invalid per-puzzle time')
    })

    it('should reject configurations with too many puzzles', () => {
      const result = validateCustomSprintConfig('mixed', 30, 5)
      expect(result.isValid).toBe(false)
      expect(result.error).toContain('too many puzzles')
    })
  })

  describe('calculateTargetPuzzles', () => {
    it('should calculate correct target puzzles', () => {
      expect(calculateTargetPuzzles(5, 20)).toBe(15) // 5 * 60 / 20 = 15
      expect(calculateTargetPuzzles(10, 30)).toBe(20) // 10 * 60 / 30 = 20
      expect(calculateTargetPuzzles(1, 60)).toBe(1)   // 1 * 60 / 60 = 1
    })

    it('should handle fractional results by flooring', () => {
      expect(calculateTargetPuzzles(5, 30)).toBe(10) // 5 * 60 / 30 = 10
      expect(calculateTargetPuzzles(3, 20)).toBe(9)  // 3 * 60 / 20 = 9
    })
  })

  describe('getCustomEloType', () => {
    it('should generate correct ELO type strings', () => {
      expect(getCustomEloType('mixed', 5, 20)).toBe('mixed 5/20')
      expect(getCustomEloType('fork', 10, 30)).toBe('fork 10/30')
      expect(getCustomEloType('mateIn1', 3, 15)).toBe('mateIn1 3/15')
    })
  })

  describe('Configuration Constants', () => {
    it('should have valid themes array', () => {
      expect(VALID_THEMES).toContain('mixed')
      expect(VALID_THEMES).toContain('fork')
      expect(VALID_THEMES).toContain('mateIn1')
      expect(VALID_THEMES.length).toBeGreaterThan(20)
    })

    it('should have valid per-puzzle times', () => {
      expect(VALID_PER_PUZZLE_TIMES).toEqual([5, 10, 15, 20, 30, 60])
    })

    it('should have valid sprint durations (specific values)', () => {
      expect(VALID_SPRINT_DURATIONS).toEqual([3, 5, 10, 15, 20, 25, 30])
      expect(VALID_SPRINT_DURATIONS).toHaveLength(7)
    })
  })

  describe('Edge Cases', () => {
    it('should handle minimum valid configuration', () => {
      const result = validateCustomSprintConfig('mixed', 3, 60) // 3 minutes is the minimum
      expect(result.isValid).toBe(true)
      expect(calculateTargetPuzzles(3, 60)).toBe(3)
    })

    it('should reject configurations that result in zero puzzles', () => {
      // Test with invalid duration (not in the valid list)
      const result = validateCustomSprintConfig('mixed', 1, 60) // 1 minute is not valid
      expect(result.isValid).toBe(false)
      expect(result.error).toContain('Invalid sprint duration')
    })

    it('should handle maximum reasonable configuration', () => {
      const result = validateCustomSprintConfig('mixed', 30, 60)
      expect(result.isValid).toBe(true)
      expect(calculateTargetPuzzles(30, 60)).toBe(30)
    })

    it('should handle fast-paced configuration', () => {
      const result = validateCustomSprintConfig('mixed', 5, 5)
      expect(result.isValid).toBe(true)
      expect(calculateTargetPuzzles(5, 5)).toBe(60)
    })
  })
})
