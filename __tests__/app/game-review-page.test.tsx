import React from "react"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import GameReviewPage from "@/app/game-review/page"
import { useGameReviewData } from "@/hooks/useGameReviewData"
import { useUserContext } from "@/hooks/useUserContext"
import { vi } from "vitest"

vi.mock("@/components/navigation", () => ({
  default: () => <nav data-testid="navigation" />,
}))

vi.mock("@/components/footer", () => ({
  default: () => <footer data-testid="footer" />,
}))

vi.mock("@/components/development-notice", () => ({
  DevelopmentNotice: () => <div data-testid="development-notice" />,
}))

vi.mock("@/hooks/useUserContext", () => ({
  useUserContext: vi.fn(),
}))

vi.mock("@/hooks/useGameReviewData", () => ({
  useGameReviewData: vi.fn(),
}))

const mockUseUserContext = vi.mocked(useUserContext)
const mockUseGameReviewData = vi.mocked(useGameReviewData)

describe("GameReviewPage import status UI", () => {
  const refreshImport = vi.fn()
  const refetch = vi.fn()

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
        chess_profiles: [
          {
            id: "profile-1",
            profile_id: "profile-1",
            platform: "lichess.org",
            username: "alice",
            games_fetched: 0,
            last_game_fetched_at: null,
            last_game_played_at: null,
            updated_at: "2026-01-01T00:00:00Z",
          },
        ],
      },
      isLoading: false,
      error: null,
      refreshUser: vi.fn(),
      updateChessProfiles: vi.fn(),
    })
    mockUseGameReviewData.mockReturnValue(baseGameReviewState())
  })

  it("shows zero generated puzzles as completed import progress", () => {
    mockUseGameReviewData.mockReturnValue(baseGameReviewState({
      importStatus: {
        profiles: [
          {
            profile_id: "profile-1",
            platform: "lichess.org",
            username: "alice",
            status: "complete",
            games_fetched: 0,
            games_imported: 2,
            games_analyzed: 2,
            puzzles_generated: 0,
          },
        ],
        summary: {
          status: "complete",
          has_profiles: true,
          has_imported_games: false,
          queued_count: 0,
          running_count: 0,
          failed_count: 0,
          complete_count: 1,
          not_started_count: 0,
        },
      },
    }))

    render(<GameReviewPage />)

    expect(screen.getByText("Import Complete")).toBeInTheDocument()
    expect(screen.getByRole("group", { name: "Games imported: 2" })).toBeInTheDocument()
    expect(screen.getByRole("group", { name: "Games analyzed: 2" })).toBeInTheDocument()
    expect(screen.getByRole("group", { name: "Puzzles generated: 0" })).toBeInTheDocument()
    expect(screen.queryByRole("group", { name: "Puzzles generated: Pending" })).not.toBeInTheDocument()
  })

  it("starts import refresh from the pending state", async () => {
    refreshImport.mockResolvedValue(undefined)
    render(<GameReviewPage />)

    await userEvent.click(screen.getByRole("button", { name: "Start Import" }))

    await waitFor(() => {
      expect(refreshImport).toHaveBeenCalledTimes(1)
    })
  })

  it("disables refresh while an import is already queued", () => {
    mockUseGameReviewData.mockReturnValue(baseGameReviewState({
      importStatus: {
        profiles: [
          {
            profile_id: "profile-1",
            platform: "lichess.org",
            username: "alice",
            status: "queued",
            games_fetched: 0,
            games_analyzed: null,
            puzzles_generated: null,
          },
        ],
        summary: {
          status: "queued",
          has_profiles: true,
          has_imported_games: false,
          queued_count: 1,
          running_count: 0,
          failed_count: 0,
          complete_count: 0,
          not_started_count: 0,
        },
      },
    }))

    render(<GameReviewPage />)

    expect(screen.getByRole("button", { name: "Import Queued" })).toBeDisabled()
  })

  it("disables refresh while an import is running", () => {
    mockUseGameReviewData.mockReturnValue(baseGameReviewState({
      importStatus: {
        profiles: [
          {
            profile_id: "profile-1",
            platform: "lichess.org",
            username: "alice",
            status: "running",
            games_fetched: 0,
            games_imported: 12,
            games_analyzed: 8,
            puzzles_generated: 0,
          },
        ],
        summary: {
          status: "running",
          has_profiles: true,
          has_imported_games: false,
          queued_count: 0,
          running_count: 1,
          failed_count: 0,
          complete_count: 0,
          not_started_count: 0,
        },
      },
    }))

    render(<GameReviewPage />)

    expect(screen.getByText("Game Import Running")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Import Running" })).toBeDisabled()
    expect(screen.getByRole("group", { name: "Puzzles generated: 0" })).toBeInTheDocument()
  })

  it("allows retrying a failed import", async () => {
    refreshImport.mockResolvedValue(undefined)
    mockUseGameReviewData.mockReturnValue(baseGameReviewState({
      importStatus: {
        profiles: [
          {
            profile_id: "profile-1",
            platform: "lichess.org",
            username: "alice",
            status: "failed",
            games_fetched: 0,
            games_imported: 0,
            games_analyzed: null,
            puzzles_generated: null,
          },
        ],
        summary: {
          status: "failed",
          has_profiles: true,
          has_imported_games: false,
          queued_count: 0,
          running_count: 0,
          failed_count: 1,
          complete_count: 0,
          not_started_count: 0,
        },
      },
    }))

    render(<GameReviewPage />)

    await userEvent.click(screen.getByRole("button", { name: "Retry Import" }))

    await waitFor(() => {
      expect(refreshImport).toHaveBeenCalledTimes(1)
    })
  })

  function baseGameReviewState(overrides: Partial<ReturnType<typeof useGameReviewData>> = {}) {
    return {
      data: null,
      importStatus: {
        profiles: [
          {
            profile_id: "profile-1",
            platform: "lichess.org",
            username: "alice",
            status: "not_started" as const,
            games_fetched: 0,
          },
        ],
        summary: {
          status: "not_started" as const,
          has_profiles: true,
          has_imported_games: false,
          queued_count: 0,
          running_count: 0,
          failed_count: 0,
          complete_count: 0,
          not_started_count: 1,
        },
      },
      importJob: null,
      isLoading: false,
      isRefreshingImport: false,
      error: null,
      refetch,
      refreshImport,
      ...overrides,
    }
  }
})
