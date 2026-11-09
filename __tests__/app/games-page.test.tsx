import React from "react"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import GamesPage from "@/app/games/page"
import { getGames } from "@/lib/api/library"
import { useUserContext } from "@/hooks/useUserContext"
import { vi } from "vitest"

vi.mock("@/components/navigation", () => ({
  default: () => <nav data-testid="navigation" />,
}))

vi.mock("@/components/footer", () => ({
  default: () => <footer data-testid="footer" />,
}))

vi.mock("@/hooks/useUserContext", () => ({
  useUserContext: vi.fn(),
}))

vi.mock("@/lib/api/library", () => ({
  getGames: vi.fn(),
}))

const mockGetGames = vi.mocked(getGames)
const mockUseUserContext = vi.mocked(useUserContext)

describe("GamesPage", () => {
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
          { platform: "lichess.org", username: "alice", games_fetched: 30 },
        ],
      },
      isLoading: false,
      error: null,
      refreshUser: vi.fn(),
      updateChessProfiles: vi.fn(),
    })
  })

  it("renders v2 games and paginates with offset", async () => {
    mockGetGames.mockResolvedValueOnce(gamesResponse({ total_count: 25, offset: 0, id: "game/1" }))
    mockGetGames.mockResolvedValueOnce(gamesResponse({ total_count: 25, offset: 20, id: "game-2" }))

    render(<GamesPage />)

    expect(await screen.findByText("lichess.org / alice")).toBeInTheDocument()
    expect(screen.getByText("5+0")).toBeInTheDocument()
    expect(screen.getAllByRole("link", { name: /details/i }).some(link => link.getAttribute("href") === "/games/game%2F1")).toBe(true)
    expect(screen.getByText("Showing 1-20 of 25")).toBeInTheDocument()

    await userEvent.click(screen.getByRole("button", { name: /next/i }))

    await waitFor(() => {
      expect(mockGetGames).toHaveBeenLastCalledWith(expect.objectContaining({ offset: 20, limit: 20 }))
    })
    expect(await screen.findByText("Showing 21-25 of 25")).toBeInTheDocument()
  })

  it("uses imported profile chips as filters", async () => {
    mockGetGames.mockResolvedValue(gamesResponse({ total_count: 1, offset: 0 }))

    render(<GamesPage />)

    await screen.findByText("lichess.org / alice")
    await userEvent.click(screen.getByRole("button", { name: "lichess.org / alice" }))

    await waitFor(() => {
      expect(mockGetGames).toHaveBeenLastCalledWith(expect.objectContaining({
        platform: "lichess.org",
        username: "alice",
        offset: 0,
      }))
    })
  })

  it("clears stale counts and pagination after a load failure", async () => {
    mockGetGames
      .mockResolvedValueOnce(gamesResponse({ total_count: 25, offset: 0 }))
      .mockRejectedValueOnce(new Error("network down"))

    render(<GamesPage />)

    expect(await screen.findByText("Showing 1-20 of 25")).toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: /next/i }))

    expect(await screen.findByText("Could not load games")).toBeInTheDocument()
    expect(screen.queryByText("Showing 1-20 of 25")).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /next/i })).not.toBeInTheDocument()
    expect(screen.getByText("0 games")).toBeInTheDocument()
  })
})

function gamesResponse({ total_count, offset, id = "game-1" }: { total_count: number; offset: number; id?: string }) {
  return {
    games: [{
      id,
      platform: "lichess.org",
      username: "alice",
      user_color: "white",
      game_time: "2026-06-19T12:00:00Z",
      time_control: "5+0",
      time_class: "blitz",
      rated: true,
      url: "https://lichess.org/game",
      winner: "white",
      result: "mate",
      created_at: "2026-06-19T12:01:00Z",
      updated_at: "2026-06-19T12:01:00Z",
    }],
    total_count,
    offset,
    limit: 20,
  }
}
