import React from "react"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import PuzzleSprintPage from "@/app/puzzle-sprint/page"
import { useSprintStats } from "@/hooks/useSprintStats"
import { useUserContext } from "@/hooks/useUserContext"
import { apiPut } from "@/lib/auth/api-client"
import { V2SprintStatsSummary } from "@/lib/api/library"
import { getArrowDuelEloType, getBlitzEloType, getStandardEloType } from "@/lib/sprint-config"
import { vi } from "vitest"

vi.mock("@/lib/auth/api-client", () => ({
  apiPut: vi.fn(),
}))

vi.mock("@/hooks/use-toast", () => ({
  toast: vi.fn(),
}))

vi.mock("@/components/navigation", () => ({
  default: () => <nav data-testid="navigation" />,
}))

vi.mock("@/components/footer", () => ({
  default: () => <footer data-testid="footer" />,
}))

vi.mock("@/hooks/useUserContext", () => ({
  useUserContext: vi.fn(),
}))

vi.mock("@/hooks/useSprintStats", () => ({
  useSprintStats: vi.fn(),
}))

const mockUseUserContext = vi.mocked(useUserContext)
const mockUseSprintStats = vi.mocked(useSprintStats)
const mockApiPut = vi.mocked(apiPut)

describe("PuzzleSprintPage", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseUserContext.mockReturnValue({
      user: {
        id: "user-1",
        email: "alice@example.com",
        registered_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
        last_sign_in_at: "2026-01-01T00:00:00Z",
        elos: [
          {
            elo_type: getStandardEloType(),
            rating: 940,
            rating_deviation: 80,
            is_provisional: false,
            updated_at: "2026-06-01T00:00:00Z",
          },
          {
            elo_type: getBlitzEloType(),
            rating: 905,
            rating_deviation: 85,
            is_provisional: false,
            updated_at: "2026-06-01T00:00:00Z",
          },
          {
            elo_type: getArrowDuelEloType(),
            rating: 880,
            rating_deviation: 90,
            is_provisional: false,
            updated_at: "2026-06-01T00:00:00Z",
          },
        ],
      },
      isLoading: false,
      error: null,
      refreshUser: vi.fn(),
      updateChessProfiles: vi.fn(),
    })
    mockUseSprintStats.mockReturnValue({
      stats: {
        range: {
          days: "365",
          group_by: "day",
          group_length: "1",
        },
        summary: sprintSummary({
          started_count: 6,
          completed_count: 5,
          successful_count: 4,
          sprint_total_duration_seconds: 1500,
          puzzles_solved: 42,
          puzzles_attempted: 48,
        }),
        buckets: { status: [] },
        series: [
          {
            start: "2026-06-26T00:00:00Z",
            end: "2026-06-27T00:00:00Z",
            summary: sprintSummary(),
            buckets: { status: [] },
          },
          {
            start: "2026-06-27T00:00:00Z",
            end: "2026-06-28T00:00:00Z",
            summary: sprintSummary({
              started_count: 2,
              completed_count: 1,
              successful_count: 1,
              sprint_total_duration_seconds: 300,
              puzzles_solved: 11,
              puzzles_attempted: 12,
            }),
            buckets: { status: [] },
          },
        ],
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    })
  })

  it("renders sprint counters from native v2 stats instead of bootstrap sprint daily stats", () => {
    render(<PuzzleSprintPage />)

    expect(mockUseSprintStats).toHaveBeenCalledWith({
      days: 365,
      group_by: "day",
      group_length: 1,
    }, true)
    expect(screen.getByText("Total Sprints: 5")).toBeInTheDocument()
    expect(screen.getByText("Sprints today")).toBeInTheDocument()
    expect(screen.getByText("2")).toBeInTheDocument()
    expect(screen.getByText("Correct today")).toBeInTheDocument()
    expect(screen.getByText("11")).toBeInTheDocument()
    expect(screen.getByText("Time today")).toBeInTheDocument()
    expect(screen.getByText("5m")).toBeInTheDocument()
    expect(screen.getByText("Elo: 940")).toBeInTheDocument()
    expect(screen.getByText("Elo: 905")).toBeInTheDocument()
    expect(screen.getByText("Elo: 880")).toBeInTheDocument()
  })

  it("edits a run's training ELO from Practice Home Edit mode via v2 ELO endpoint", async () => {
    const refreshUser = vi.fn().mockResolvedValue(undefined)
    mockUseUserContext.mockReturnValue({
      user: {
        id: "user-1",
        email: "alice@example.com",
        registered_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
        last_sign_in_at: "2026-01-01T00:00:00Z",
        elos: [
          {
            elo_type: getStandardEloType(),
            rating: 940,
            rating_deviation: 80,
            is_provisional: false,
            updated_at: "2026-06-01T00:00:00Z",
          },
        ],
        chess_profiles: [],
      },
      isLoading: false,
      error: null,
      refreshUser,
      updateChessProfiles: vi.fn(),
    })
    mockApiPut.mockResolvedValue(
      new Response(JSON.stringify({ updated: [{ elo_type: "mixed 5/20", rating: 1100 }] }), {
        status: 200,
      }),
    )

    render(<PuzzleSprintPage />)

    await userEvent.click(screen.getByRole("button", { name: "Edit" }))
    await userEvent.click(screen.getByRole("button", { name: "Edit Standard Sprint" }))

    const eloInput = screen.getByLabelText("Training ELO")
    expect(eloInput).toHaveValue(940)
    await userEvent.clear(eloInput)
    await userEvent.type(eloInput, "1100")
    await userEvent.click(screen.getByRole("button", { name: "Save Changes" }))

    await waitFor(() => {
      expect(mockApiPut).toHaveBeenCalledTimes(1)
    })
    expect(new URL(mockApiPut.mock.calls[0][0]).pathname).toBe("/api/v2/me/elos")
    expect(mockApiPut.mock.calls[0][1]).toEqual({
      updates: [
        {
          elo_type: "mixed 5/20",
          rating: 1100,
          rating_deviation: 50.0,
        },
      ],
    })
    expect(refreshUser).toHaveBeenCalledTimes(1)
  })
})

function sprintSummary(overrides: Partial<V2SprintStatsSummary> = {}): V2SprintStatsSummary {
  return {
    started_count: 0,
    completed_count: 0,
    successful_count: 0,
    failed_count: 0,
    completed_fail_mistakes_count: 0,
    completed_fail_time_count: 0,
    active_count: 0,
    abandoned_count: 0,
    sprint_total_duration_seconds: 0,
    puzzles_solved: 0,
    puzzles_attempted: 0,
    average_sprint_duration: 0,
    success_rate: 0,
    puzzle_accuracy: 0,
    ...overrides,
  }
}
