import React from "react"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import PuzzlesPage from "@/app/puzzles/page"
import { getPuzzles } from "@/lib/api/library"
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
  getPuzzles: vi.fn(),
}))

const mockGetPuzzles = vi.mocked(getPuzzles)
const mockUseUserContext = vi.mocked(useUserContext)

describe("PuzzlesPage", () => {
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
          { platform: "chess.com", username: "bob", games_fetched: 12 },
        ],
      },
      isLoading: false,
      error: null,
      refreshUser: vi.fn(),
      updateChessProfiles: vi.fn(),
    })
  })

  it("renders v2 game-derived puzzles and paginates with offset", async () => {
    mockGetPuzzles.mockResolvedValueOnce(puzzlesResponse({ total_count: 24, offset: 0, id: "puzzle/1" }))
    mockGetPuzzles.mockResolvedValueOnce(puzzlesResponse({ total_count: 24, offset: 20, id: "puzzle-2" }))

    render(<PuzzlesPage />)

    expect(await screen.findByText("chess.com / bob")).toBeInTheDocument()
    expect(screen.getAllByText("OPPONENT BLUNDER MISSED").length).toBeGreaterThan(0)
    expect(screen.getAllByRole("link", { name: /details/i }).some(link => link.getAttribute("href") === "/puzzles/puzzle%2F1")).toBe(true)
    expect(screen.getByText("Showing 1-20 of 24")).toBeInTheDocument()

    await userEvent.click(screen.getByRole("button", { name: /next/i }))

    await waitFor(() => {
      expect(mockGetPuzzles).toHaveBeenLastCalledWith(expect.objectContaining({ offset: 20, limit: 20 }))
    })
    expect(await screen.findByText("Showing 21-24 of 24")).toBeInTheDocument()
  })

  it("sends theme and tag filters to the v2 puzzle list", async () => {
    mockGetPuzzles.mockResolvedValue(puzzlesResponse({ total_count: 1, offset: 0 }))

    render(<PuzzlesPage />)

    await screen.findByText("chess.com / bob")
    await userEvent.selectOptions(screen.getByLabelText("Theme Group"), "missed_attack")
    await userEvent.type(screen.getByLabelText("Tag"), "fork")
    await userEvent.click(screen.getByRole("button", { name: /apply/i }))

    await waitFor(() => {
      expect(mockGetPuzzles).toHaveBeenLastCalledWith(expect.objectContaining({
        theme_groups: "missed_attack",
        tags: "fork",
        offset: 0,
      }))
    })
  })

  it("clears stale counts and pagination after a load failure", async () => {
    mockGetPuzzles
      .mockResolvedValueOnce(puzzlesResponse({ total_count: 24, offset: 0 }))
      .mockRejectedValueOnce(new Error("network down"))

    render(<PuzzlesPage />)

    expect(await screen.findByText("Showing 1-20 of 24")).toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: /next/i }))

    expect(await screen.findByText("Could not load puzzles")).toBeInTheDocument()
    expect(screen.queryByText("Showing 1-20 of 24")).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /next/i })).not.toBeInTheDocument()
    expect(screen.getByText("0 puzzles")).toBeInTheDocument()
  })
})

function puzzlesResponse({ total_count, offset, id = "puzzle-1" }: { total_count: number; offset: number; id?: string }) {
  return {
    puzzles: [{
      id,
      puzzle_source: "user_game" as const,
      game_id: "game-1",
      game_move: 32,
      game_phase: "middlegame",
      fen: "r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3",
      theme: "OPPONENT_BLUNDER_MISSED",
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
      updated_at: "2026-06-19T12:01:00Z",
    }],
    total_count,
    offset,
    limit: 20,
  }
}
