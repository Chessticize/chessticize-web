import React from "react"
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { PerformanceOverviewGrid } from "@/components/game-review/layout/PerformanceOverviewGrid"
import { GameReviewData } from "@/hooks/useGameReviewData"

describe("PerformanceOverviewGrid", () => {
  it("renders the v2 mistakes-per-game trend instead of a stable placeholder", () => {
    render(
      <PerformanceOverviewGrid
        data={gameReviewData({ mistakesPerGameTrend: -1.2 })}
        isLoading={false}
      />
    )

    expect(screen.getByText("My Mistakes Per Game")).toBeInTheDocument()
    expect(screen.getByText("-1.2")).toBeInTheDocument()
    expect(document.body).toHaveTextContent("Improving")
  })
})

function gameReviewData(summaryOverrides: Partial<NonNullable<GameReviewData["summary"]>>): GameReviewData {
  return {
    opponentMistakesTimeSeries: {
      nodes: [
        {
          start_time: "2026-05-01T00:00:00Z",
          end_time: "2026-05-08T00:00:00Z",
          stats: {
            theme_counts: [],
            average_move_length: 3,
          },
        },
      ],
    },
    opponentMistakesMissed3M: {
      tag_counts: [],
      game_move_buckets: [],
      user_color_counts: [],
      move_length_counts: [],
    },
    opponentMistakesCaught3M: {
      tag_counts: [],
      game_move_buckets: [],
      user_color_counts: [],
      move_length_counts: [],
    },
    summary: {
      recognitionRate: 60,
      mistakesPerGame: 2.4,
      mistakesPerGameTrend: 0,
      totalGamesAnalyzed: 12,
      weeklyTrend: 5,
      totalPuzzles: 20,
      missedOpportunities: 3,
      missedAttacks: 1,
      caughtOpportunities: 4,
      caughtAttacks: 2,
      ownMistakes: 6,
      ...summaryOverrides,
    },
  }
}
