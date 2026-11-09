import React from "react"
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { QuickActionsBar } from "@/components/game-review/layout/QuickActionsBar"

describe("QuickActionsBar", () => {
  it("keeps Game Review practice links scoped to user-game review queue rows", () => {
    render(<QuickActionsBar hasData={true} />)

    expect(screen.getByRole("link", { name: /Practice Missed Opportunities/i })).toHaveAttribute(
      "href",
      "/review-queue?mode=regular&puzzle_source=user_game&theme_groups=missed_opportunity",
    )
    expect(screen.getByRole("link", { name: /Practice My Mistakes/i })).toHaveAttribute(
      "href",
      "/review-queue?mode=arrow_duel&puzzle_source=user_game&theme_groups=missed_attack,own_mistake_punished",
    )
  })

  it("links users without imported game data to Settings", () => {
    render(<QuickActionsBar hasData={false} />)

    expect(screen.getByRole("link", { name: /Add Chess Profile/i })).toHaveAttribute("href", "/settings")
  })
})
