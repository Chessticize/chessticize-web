import React from "react"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { vi } from "vitest"
import { WeaknessDiagnosisSection } from "@/components/game-review/diagnosis/WeaknessDiagnosisSection"
import type { V2GameReviewDiagnosis } from "@/hooks/useGameReviewData"

describe("WeaknessDiagnosisSection", () => {
  const sampleDiagnosis: V2GameReviewDiagnosis = {
    time_class_breakdown: [
      {
        time_class: "rapid",
        games: 18,
        caught_count: 21,
        missed_count: 9,
        recognition_rate: 0.7,
        own_mistakes: 18,
        mistakes_per_game: 1.0,
      },
      {
        time_class: "bullet",
        games: 25,
        caught_count: 10,
        missed_count: 30,
        recognition_rate: 0.25,
        own_mistakes: 75,
        mistakes_per_game: 3.0,
      },
    ],
    clock_breakdown: {
      total_with_clock: 20,
      time_trouble_count: 8,
      impulsive_count: 6,
      deliberate_count: 6,
      avg_time_spent_sec: 7.4,
      time_trouble_rate: 0.4,
      impulsive_rate: 0.3,
      deliberate_rate: 0.3,
    },
    priority_weaknesses: [
      {
        tag: "pin",
        missed_count: 10,
        caught_count: 3,
        total_count: 13,
        raw_capture_rate: 0.2308,
        smoothed_capture_rate: 0.2941,
        impact_score: 7.0588,
      },
    ],
    own_mistake_causes: [
      { cause: "hanging_piece", count: 12, share: 0.6 },
      { cause: "tactical_trap", count: 8, share: 0.4 },
    ],
  }

  it("renders blindspots, own-mistake causes, time-control comparison, and clock diagnosis", async () => {
    const onSelectTimeClass = vi.fn()
    render(
      <WeaknessDiagnosisSection
        diagnosis={sampleDiagnosis}
        activeTimeClass=""
        onSelectTimeClass={onSelectTimeClass}
      />,
    )

    expect(screen.getByText("Weakness Diagnosis")).toBeInTheDocument()
    expect(screen.getByText("Top Tactical Blindspots")).toBeInTheDocument()
    expect(screen.getByText("Pin")).toBeInTheDocument()
    expect(screen.getByText("29%")).toBeInTheDocument()
    expect(screen.getByText("Hanging Piece")).toBeInTheDocument()
    expect(screen.getByText("40%")).toBeInTheDocument()
    expect(screen.getByText("Avg 7.4s / move")).toBeInTheDocument()

    await userEvent.click(screen.getByRole("button", { name: /Rapid/i }))
    expect(onSelectTimeClass).toHaveBeenCalledWith("rapid")
  })

  it("preserves active time_class in blindspot and practice links", () => {
    render(
      <WeaknessDiagnosisSection
        diagnosis={sampleDiagnosis}
        activeTimeClass="rapid"
      />,
    )

    const pinLink = screen.getByRole("link", { name: /Pin/i })
    expect(pinLink).toHaveAttribute("href", "/puzzles?tags=pin&time_class=rapid")

    const practiceLink = screen.getByRole("link", { name: /Practice Blunders/i })
    expect(practiceLink).toHaveAttribute(
      "href",
      "/review-queue?mode=arrow_duel&puzzle_source=user_game&theme_groups=own_mistake_punished,own_mistake_escaped&time_class=rapid",
    )
  })
})
