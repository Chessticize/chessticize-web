"use client"

import { useEffect, useState } from "react"
import { getAttemptStats, V2AttemptStatsSeriesPoint } from "@/lib/api/library"

interface DailyPuzzleStreakState {
  streak: number
  isLoading: boolean
  error: string | null
}

const STREAK_LOOKBACK_DAYS = 90

export function useDailyPuzzleStreak(): DailyPuzzleStreakState {
  const [state, setState] = useState<DailyPuzzleStreakState>({
    streak: 0,
    isLoading: true,
    error: null,
  })

  useEffect(() => {
    let cancelled = false

    async function loadStreak() {
      try {
        const window = buildDailyPuzzleStreakWindow()
        const stats = await getAttemptStats({
          from: window.from,
          to: window.to,
          group_by: "day",
          group_length: 1,
        })
        if (cancelled) return
        setState({
          streak: calculateDailyPuzzleStreak(stats.series),
          isLoading: false,
          error: null,
        })
      } catch (error) {
        if (cancelled) return
        setState({
          streak: 0,
          isLoading: false,
          error: error instanceof Error ? error.message : "Failed to load daily streak",
        })
      }
    }

    loadStreak()

    return () => {
      cancelled = true
    }
  }, [])

  return state
}

export function calculateDailyPuzzleStreak(series: V2AttemptStatsSeriesPoint[], now: Date = new Date()): number {
  const correctByDay = new Map<string, number>()

  series.forEach((point) => {
    const day = toUTCDateKey(new Date(point.start))
    correctByDay.set(day, point.summary.correct_count || 0)
  })

  let streak = 0
  const cursor = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))

  while ((correctByDay.get(toUTCDateKey(cursor)) || 0) > 0) {
    streak += 1
    cursor.setUTCDate(cursor.getUTCDate() - 1)
  }

  return streak
}

export function buildDailyPuzzleStreakWindow(now: Date = new Date()): { from: string; to: string } {
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  const from = new Date(today)
  from.setUTCDate(from.getUTCDate() - STREAK_LOOKBACK_DAYS + 1)

  return {
    from: toUTCDateKey(from),
    to: toUTCDateKey(today),
  }
}

function toUTCDateKey(date: Date): string {
  return date.toISOString().slice(0, 10)
}
