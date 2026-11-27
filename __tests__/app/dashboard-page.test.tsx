import React from "react"
import { render, screen } from "@testing-library/react"
import DashboardPage from "@/app/dashboard/page"
import { useDailyPuzzleStreak } from "@/hooks/useDailyPuzzleStreak"
import { useUserContext } from "@/hooks/useUserContext"
import { useSprintStats } from "@/hooks/useSprintStats"
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

vi.mock("@/hooks/useUserContext", () => ({
  useUserContext: vi.fn(),
}))

vi.mock("@/hooks/useSprintStats", () => ({
  useSprintStats: vi.fn(),
}))

const mockUseDailyPuzzleStreak = vi.mocked(useDailyPuzzleStreak)
const mockUseUserContext = vi.mocked(useUserContext)
const mockUseSprintStats = vi.mocked(useSprintStats)

describe("DashboardPage (Unified Practice Home)", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseUserContext.mockReturnValue({
      user: {
        id: "user-1",
        email: "user@example.com",
        registered_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
        last_sign_in_at: "2026-01-01T00:00:00Z",
        elos: [],
        chess_profiles: [],
        preferences: {},
      },
      isLoading: false,
      error: null,
      refreshUser: vi.fn(),
      updateChessProfiles: vi.fn(),
    })
    mockUseSprintStats.mockReturnValue({
      stats: null,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    })
    mockUseDailyPuzzleStreak.mockReturnValue({
      streak: 7,
      isLoading: false,
      error: null,
    })
  })

  it("renders the unified Practice Home with Daily Streak and Add Run / Edit / How Sprint Works", () => {
    render(<DashboardPage />)

    expect(mockUseDailyPuzzleStreak).toHaveBeenCalled()
    expect(screen.getByRole("heading", { name: "Puzzle Sprint", level: 1 })).toBeInTheDocument()
    expect(screen.getByText("Daily Streak: 7")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Add Run" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Edit" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "How Sprint Works" })).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Standard Sprint" })).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Arrow Duel" })).toBeInTheDocument()
  })
})
