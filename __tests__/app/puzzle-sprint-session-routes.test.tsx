import React from "react"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import ArrowDuelSprintPage from "@/app/puzzle-sprint/arrow-duel/page"
import BlitzSprintPage from "@/app/puzzle-sprint/blitz/page"
import SprintPage from "@/app/puzzle-sprint/sprint/page"
import { useUserContext } from "@/hooks/useUserContext"
import { getArrowDuelEloType, getBlitzEloType, getStandardEloType } from "@/lib/sprint-config"
import { vi } from "vitest"

const push = vi.fn()
const sprintSessions: Array<{ eloType: string }> = []

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}))

vi.mock("@/hooks/useUserContext", () => ({
  useUserContext: vi.fn(),
}))

vi.mock("@/components/puzzle-sprint/ErrorBoundary", () => ({
  SprintErrorBoundary: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

vi.mock("@/components/puzzle-sprint/SprintSession", () => ({
  SprintSession: ({
    eloType,
    onComplete,
    onExit,
  }: {
    eloType: string
    onComplete: (results: unknown, attempts?: unknown[]) => Promise<void>
    onExit: () => void
  }) => {
    sprintSessions.push({ eloType })
    return (
      <section>
        <h1>Sprint Session</h1>
        <div data-testid="sprint-elo-type">{eloType}</div>
        <button
          type="button"
          onClick={() => onComplete({
            session_id: "sprint-1",
            status: "completed_success",
            puzzles_solved: 15,
            mistakes_made: 1,
            duration_seconds: 287,
            elo_change: {
              rating_before: 1200,
              rating_after: 1214,
              rating_change: 14,
            },
          })}
        >
          Complete Sprint
        </button>
        <button type="button" onClick={onExit}>Exit Sprint</button>
      </section>
    )
  },
}))

vi.mock("@/components/puzzle-sprint/SprintResults", () => ({
  SprintResults: ({
    eloType,
    failedAttempts = [],
    onHome,
    onRestart,
  }: {
    eloType: string
    failedAttempts?: unknown[]
    onHome: () => void
    onRestart: () => void
  }) => (
    <section>
      <h1>Sprint Results</h1>
      <div data-testid="results-elo-type">{eloType}</div>
      <div data-testid="failed-attempt-count">{failedAttempts.length}</div>
      <button type="button" onClick={onRestart}>Restart Sprint</button>
      <button type="button" onClick={onHome}>Back Home</button>
    </section>
  ),
}))

const mockUseUserContext = vi.mocked(useUserContext)

describe("Puzzle sprint route pages", () => {
  const refreshUser = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    sprintSessions.length = 0
    mockUseUserContext.mockReturnValue({
      user: null,
      isLoading: false,
      error: null,
      refreshUser,
      updateChessProfiles: vi.fn(),
    })
  })

  it("wires the standard sprint route through session, results, refresh, and home navigation", async () => {
    await assertSprintRoute(<SprintPage />, getStandardEloType())
  })

  it("wires the blitz sprint route through session, results, refresh, and home navigation", async () => {
    await assertSprintRoute(<BlitzSprintPage />, getBlitzEloType())
  })

  it("wires the arrow-duel route through session, results, refresh, and home navigation", async () => {
    await assertSprintRoute(<ArrowDuelSprintPage />, getArrowDuelEloType())
    expect(screen.getByTestId("failed-attempt-count")).toHaveTextContent("0")
  })

  async function assertSprintRoute(route: React.ReactElement, expectedEloType: string) {
    render(route)

    expect(screen.getByRole("heading", { name: "Sprint Session" })).toBeInTheDocument()
    expect(screen.getByTestId("sprint-elo-type")).toHaveTextContent(expectedEloType)
    expect(sprintSessions).toEqual([{ eloType: expectedEloType }])

    await userEvent.click(screen.getByRole("button", { name: "Complete Sprint" }))

    await waitFor(() => {
      expect(refreshUser).toHaveBeenCalledTimes(1)
    })
    expect(screen.getByRole("heading", { name: "Sprint Results" })).toBeInTheDocument()
    expect(screen.getByTestId("results-elo-type")).toHaveTextContent(expectedEloType)

    await userEvent.click(screen.getByRole("button", { name: "Back Home" }))
    expect(push).toHaveBeenCalledWith("/puzzle-sprint")
  }
})
