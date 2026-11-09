import React from "react"
import { render, screen, waitFor } from "@testing-library/react"
import PuzzleDetailPage from "@/app/puzzles/[puzzleID]/page"
import { getPuzzle } from "@/lib/api/library"
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
  getPuzzle: vi.fn(),
}))

vi.mock("next/navigation", () => ({
  useParams: vi.fn(),
}))

const mockGetPuzzle = vi.mocked(getPuzzle)
const mockUseUserContext = vi.mocked(useUserContext)
const mockUseParams = vi.mocked(useParams)

describe("PuzzleDetailPage", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseParams.mockReturnValue({ puzzleID: "puzzle-1" })
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

  it("loads and renders v2 puzzle detail", async () => {
    mockGetPuzzle.mockResolvedValue({
      puzzle: {
        id: "puzzle-1",
        puzzle_source: "user_game",
        game_id: "game-1",
        game_move: 32,
        game_phase: "middlegame",
        fen: "r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3",
        theme: "opponent_blunder_missed",
        theme_group: "missed_attack",
        user_color: "white",
        puzzle_color: "black",
        zugzwang: false,
        tags: ["fork", "attack"],
        game: {
          id: "game/1",
          platform: "chess.com",
          username: "bob",
          game_time: "2026-06-19T12:00:00Z",
          time_control: "10+0",
          time_class: "rapid",
          rated: true,
          result: "resign",
        },
        created_at: "2026-06-19T12:01:00Z",
        updated_at: "2026-06-19T12:02:00Z",
      },
    })

    render(<PuzzleDetailPage />)

    expect(await screen.findByText("Opponent Blunder Missed")).toBeInTheDocument()
    expect(screen.getByText("Missed Attack")).toBeInTheDocument()
    expect(screen.getByText("chess.com / bob")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /view game details/i })).toHaveAttribute("href", "/games/game%2F1")
    expect(mockGetPuzzle).toHaveBeenCalledWith("puzzle-1")
  })

  it("shows an error state when the puzzle cannot load", async () => {
    mockGetPuzzle.mockRejectedValue(new Error("Failed to load puzzle"))

    render(<PuzzleDetailPage />)

    expect(await screen.findByText("Could not load puzzle")).toBeInTheDocument()
    expect(screen.getByText("Failed to load puzzle")).toBeInTheDocument()
  })

  it("clears loaded puzzle details when the user is no longer available", async () => {
    mockGetPuzzle.mockResolvedValue({
      puzzle: {
        id: "puzzle-1",
        puzzle_source: "user_game",
        game_id: "game-1",
        game_move: 32,
        game_phase: "middlegame",
        fen: "r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3",
        theme: "opponent_blunder_missed",
        theme_group: "missed_attack",
        user_color: "white",
        puzzle_color: "black",
        zugzwang: false,
        tags: ["fork", "attack"],
        game: {
          id: "game-1",
          platform: "chess.com",
          username: "bob",
          game_time: "2026-06-19T12:00:00Z",
          time_control: "10+0",
          time_class: "rapid",
          rated: true,
          result: "resign",
        },
        created_at: "2026-06-19T12:01:00Z",
        updated_at: "2026-06-19T12:02:00Z",
      },
    })

    const { rerender } = render(<PuzzleDetailPage />)

    expect(await screen.findByText("Opponent Blunder Missed")).toBeInTheDocument()

    mockUseUserContext.mockReturnValue({
      user: null,
      isLoading: false,
      error: null,
      refreshUser: vi.fn(),
      updateChessProfiles: vi.fn(),
    })
    rerender(<PuzzleDetailPage />)

    await waitFor(() => {
      expect(screen.queryByText("Opponent Blunder Missed")).not.toBeInTheDocument()
    })
    expect(screen.getByText("Sign in to view this puzzle")).toBeInTheDocument()
  })
})
