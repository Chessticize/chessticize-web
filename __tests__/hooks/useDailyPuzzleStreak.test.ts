import { describe, expect, it } from "vitest"
import { buildDailyPuzzleStreakWindow, calculateDailyPuzzleStreak } from "@/hooks/useDailyPuzzleStreak"
import { V2AttemptStatsSeriesPoint } from "@/lib/api/library"

describe("calculateDailyPuzzleStreak", () => {
  it("counts consecutive UTC days with correct attempts ending today", () => {
    const series = [
      point("2026-06-24T00:00:00Z", 1),
      point("2026-06-25T00:00:00Z", 2),
      point("2026-06-26T00:00:00Z", 1),
      point("2026-06-27T00:00:00Z", 3),
    ]

    expect(calculateDailyPuzzleStreak(series, new Date("2026-06-27T18:30:00Z"))).toBe(4)
  })

  it("returns zero when today has no correct attempts", () => {
    const series = [
      point("2026-06-26T00:00:00Z", 2),
      point("2026-06-27T00:00:00Z", 0),
    ]

    expect(calculateDailyPuzzleStreak(series, new Date("2026-06-27T18:30:00Z"))).toBe(0)
  })

  it("stops at the first missing day", () => {
    const series = [
      point("2026-06-24T00:00:00Z", 1),
      point("2026-06-26T00:00:00Z", 1),
      point("2026-06-27T00:00:00Z", 1),
    ]

    expect(calculateDailyPuzzleStreak(series, new Date("2026-06-27T18:30:00Z"))).toBe(2)
  })

  it("builds server-compatible date bounds for the rolling streak window", () => {
    expect(buildDailyPuzzleStreakWindow(new Date("2026-06-27T18:30:00Z"))).toEqual({
      from: "2026-03-30",
      to: "2026-06-27",
    })
  })
})

function point(start: string, correctCount: number): V2AttemptStatsSeriesPoint {
  return {
    start,
    end: start,
    summary: {
      attempt_count: correctCount,
      correct_count: correctCount,
      incorrect_count: 0,
      accuracy: correctCount > 0 ? 1 : 0,
      timed_attempt_count: 0,
      average_time_ms: 0,
    },
    buckets: {},
  }
}
