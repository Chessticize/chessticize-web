import React from "react"
import { render, screen, waitFor } from "@testing-library/react"
import GameDetailPage from "@/app/games/[gameID]/page"
import { getGame } from "@/lib/api/library"
import { useUserContext } from "@/hooks/useUserContext"
import { useParams } from "next/navigation"
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
  getGame: vi.fn(),
}))

vi.mock("next/navigation", () => ({
  useParams: vi.fn(),
}))

const mockGetGame = vi.mocked(getGame)
const mockUseUserContext = vi.mocked(useUserContext)
const mockUseParams = vi.mocked(useParams)

describe("GameDetailPage", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseParams.mockReturnValue({ gameID: "game-1" })
    mockUseUserContext.mockReturnValue({
      user: {
        id: "user-1",
        email: "user@example.com",
        registered_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
        last_sign_in_at: "2026-01-01T00:00:00Z",
        elos: [],
        chess_profiles: [],
      },
      isLoading: false,
      error: null,
      refreshUser: vi.fn(),
      updateChessProfiles: vi.fn(),
    })
  })

  it("loads and renders v2 game detail", async () => {
    mockGetGame.mockResolvedValue({
      game: {
        id: "game-1",
        platform: "lichess.org",
        username: "alice",
        user_color: "white",
        game_time: "2026-06-19T12:00:00Z",
        time_control: "5+0",
        time_class: "blitz",
        rated: true,
        url: "https://lichess.org/game-1",
        winner: "white",
        result: "mate",
        created_at: "2026-06-19T12:01:00Z",
        updated_at: "2026-06-19T12:02:00Z",
      },
    })

    render(<GameDetailPage />)

    expect(await screen.findByText("lichess.org / alice")).toBeInTheDocument()
    expect(screen.getByText("5+0")).toBeInTheDocument()
    expect(screen.getByText("Blitz")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /open original game/i })).toHaveAttribute("href", "https://lichess.org/game-1")
    expect(mockGetGame).toHaveBeenCalledWith("game-1")
  })

  it("shows an error state when the game cannot load", async () => {
    mockGetGame.mockRejectedValue(new Error("Failed to load game"))

    render(<GameDetailPage />)

    expect(await screen.findByText("Could not load game")).toBeInTheDocument()
    expect(screen.getByText("Failed to load game")).toBeInTheDocument()
  })

  it("clears loaded game details when the user is no longer available", async () => {
    mockGetGame.mockResolvedValue({
      game: {
        id: "game-1",
        platform: "lichess.org",
        username: "alice",
        user_color: "white",
        game_time: "2026-06-19T12:00:00Z",
        time_control: "5+0",
        time_class: "blitz",
        rated: true,
        url: "https://lichess.org/game-1",
        winner: "white",
        result: "mate",
        created_at: "2026-06-19T12:01:00Z",
        updated_at: "2026-06-19T12:02:00Z",
      },
    })

    const { rerender } = render(<GameDetailPage />)

    expect(await screen.findByText("lichess.org / alice")).toBeInTheDocument()

    mockUseUserContext.mockReturnValue({
      user: null,
      isLoading: false,
      error: null,
      refreshUser: vi.fn(),
      updateChessProfiles: vi.fn(),
    })
    rerender(<GameDetailPage />)

    await waitFor(() => {
      expect(screen.queryByText("lichess.org / alice")).not.toBeInTheDocument()
    })
    expect(screen.getByText("Sign in to view this game")).toBeInTheDocument()
  })
})
