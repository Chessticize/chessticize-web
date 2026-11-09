import React from "react"
import { render, screen } from "@testing-library/react"
import DashboardPage from "@/app/dashboard/page"
import { useDailyPuzzleStreak } from "@/hooks/useDailyPuzzleStreak"
import { vi } from "vitest"

vi.mock("@/components/navigation", () => ({
  default: () => <nav data-testid="navigation" />,
}))

vi.mock("@/components/footer", () => ({
  default: () => <footer data-testid="footer" />,
}))

vi.mock("@/components/auth/protected-route", () => ({
  ProtectedRoute: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

vi.mock("@/hooks/useDailyPuzzleStreak", () => ({
  useDailyPuzzleStreak: vi.fn(),
}))

const mockUseDailyPuzzleStreak = vi.mocked(useDailyPuzzleStreak)

describe("DashboardPage", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders the daily streak from v2 attempt stats hook data", () => {
    mockUseDailyPuzzleStreak.mockReturnValue({
      streak: 7,
      isLoading: false,
      error: null,
    })

    render(<DashboardPage />)

    expect(mockUseDailyPuzzleStreak).toHaveBeenCalled()
    expect(screen.getByText("Daily Streak: 7")).toBeInTheDocument()
  })

  it("links Game Review and the source-neutral Review Queue separately", () => {
    mockUseDailyPuzzleStreak.mockReturnValue({
      streak: 7,
      isLoading: false,
      error: null,
    })

    render(<DashboardPage />)

    const gameReviewHeading = screen.getByRole("heading", { name: "Game Review" })
    const reviewQueueHeading = screen.getByRole("heading", { name: "Review Queue" })

    expect(gameReviewHeading.closest("a")).toHaveAttribute("href", "/game-review")
    expect(reviewQueueHeading.closest("a")).toHaveAttribute("href", "/review-queue")
    expect(screen.queryByText(/Mistake Retry/i)).not.toBeInTheDocument()
  })
})
