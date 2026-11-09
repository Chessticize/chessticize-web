import React from "react"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import ReviewQueuePage from "@/app/review-queue/page"
import { drawReviewQueuePuzzles, excludeReviewQueueItem, getReviewQueueStats, listReviewQueueItems, submitReviewAttempts } from "@/lib/api/library"
import { useUserContext } from "@/hooks/useUserContext"
import { vi } from "vitest"

const navigationMocks = vi.hoisted(() => ({
  replace: vi.fn(),
  searchParams: new URLSearchParams("mode=regular&theme_groups=missed_opportunity"),
}))

vi.mock("next/navigation", () => ({
  usePathname: () => "/review-queue",
  useRouter: () => ({
    replace: navigationMocks.replace,
  }),
  useSearchParams: () => navigationMocks.searchParams,
}))

vi.mock("@/components/navigation", () => ({
  default: () => <nav data-testid="navigation" />,
}))

vi.mock("@/components/footer", () => ({
  default: () => <footer data-testid="footer" />,
}))

vi.mock("@/components/puzzle-sprint/ChessBoard", () => ({
  ChessBoard: ({ onPuzzleComplete }: { onPuzzleComplete?: (success: boolean, userMoves: string[]) => void }) => (
    <div data-testid="chess-board">
      <button type="button" onClick={() => onPuzzleComplete?.(true, ["f3e5"])}>Solve Board</button>
    </div>
  ),
}))

vi.mock("@/hooks/useUserContext", () => ({
  useUserContext: vi.fn(),
}))

vi.mock("@/lib/api/library", () => ({
  getReviewQueueStats: vi.fn(),
  listReviewQueueItems: vi.fn(),
  drawReviewQueuePuzzles: vi.fn(),
  submitReviewAttempts: vi.fn(),
  excludeReviewQueueItem: vi.fn(),
}))

const mockUseUserContext = vi.mocked(useUserContext)
const mockGetReviewQueueStats = vi.mocked(getReviewQueueStats)
const mockListReviewQueueItems = vi.mocked(listReviewQueueItems)
const mockDrawReviewQueuePuzzles = vi.mocked(drawReviewQueuePuzzles)
const mockSubmitReviewAttempts = vi.mocked(submitReviewAttempts)
const mockExcludeReviewQueueItem = vi.mocked(excludeReviewQueueItem)

describe("ReviewQueuePage", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    navigationMocks.searchParams = new URLSearchParams("mode=regular&theme_groups=missed_opportunity")
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
    mockGetReviewQueueStats.mockResolvedValue(reviewStats())
    mockListReviewQueueItems.mockResolvedValue(reviewQueueResponse())
    mockDrawReviewQueuePuzzles.mockResolvedValue({ puzzles: [reviewItem({ review_item_id: "drawn-1", puzzle_id: "drawn-puzzle", fen: "drawn-puzzle" })] })
    mockSubmitReviewAttempts.mockResolvedValue({
      processed_count: 1,
      updated_items: [{
        review_item_id: "drawn-1",
        status: "scheduled",
        consecutive_correct: 1,
        next_due_at: "2026-06-22T00:00:00Z",
      }],
    })
    mockExcludeReviewQueueItem.mockResolvedValue({ review_item_id: "drawn-1", status: "excluded" })
  })

  it("renders v2 review queue stats and due items", async () => {
    render(<ReviewQueuePage />)

    expect(await screen.findByRole("heading", { name: "Review Queue", level: 1 })).toBeInTheDocument()
    expect(screen.getAllByText("Due Now")[0]).toBeInTheDocument()
    expect(screen.getByText("r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3")).toBeInTheDocument()
    expect(screen.getByText("Showing 1-1 of 1")).toBeInTheDocument()

    await waitFor(() => {
      expect(mockGetReviewQueueStats).toHaveBeenCalledTimes(1)
      expect(mockGetReviewQueueStats).toHaveBeenCalledWith({
        mode: "regular",
        puzzle_source: undefined,
        theme_groups: "missed_opportunity",
      })
      expect(mockListReviewQueueItems).toHaveBeenCalledWith({
        mode: "regular",
        puzzle_source: undefined,
        due: "now",
        theme_groups: "missed_opportunity",
        offset: 0,
        limit: 20,
      })
    })
  })

  it("draws a review session through the v2 review queue endpoint", async () => {
    render(<ReviewQueuePage />)

    await screen.findByText("Showing 1-1 of 1")
    await userEvent.click(screen.getByRole("button", { name: "Start Review" }))

    await waitFor(() => {
      expect(mockDrawReviewQueuePuzzles).toHaveBeenCalledWith({
        mode: "regular",
        puzzle_source: undefined,
        limit: 5,
        theme_groups: ["missed_opportunity"],
      })
    })
    expect(await screen.findByText("Review Session")).toBeInTheDocument()
    expect(screen.getByText("drawn-puzzle")).toBeInTheDocument()
  })

  it("submits regular review attempts through v2", async () => {
    render(<ReviewQueuePage />)

    await screen.findByText("Showing 1-1 of 1")
    await userEvent.click(screen.getByRole("button", { name: "Start Review" }))
    await screen.findByText("Review Session")
    await userEvent.click(screen.getByRole("button", { name: "Solve Board" }))

    await waitFor(() => {
      expect(mockSubmitReviewAttempts).toHaveBeenCalledWith({
        attempts: [expect.objectContaining({
          review_item_id: "drawn-1",
          puzzle_source: "user_game",
          puzzle_id: "drawn-puzzle",
          mode: "regular",
          user_moves: ["f3e5"],
          was_correct: true,
        })],
      })
    })
    expect(await screen.findByText("Status: Scheduled")).toBeInTheDocument()
  })

  it("excludes review queue items through v2", async () => {
    render(<ReviewQueuePage />)

    await screen.findByText("Showing 1-1 of 1")
    await userEvent.click(screen.getByRole("button", { name: "Start Review" }))
    await screen.findByText("Review Session")
    await userEvent.click(screen.getByRole("button", { name: "Exclude" }))

    await waitFor(() => {
      expect(mockExcludeReviewQueueItem).toHaveBeenCalledWith("drawn-1", "not_relevant")
    })
    expect(await screen.findByText("Position excluded from review.")).toBeInTheDocument()
  })

  it("applies mode, source, due, and theme filters to list reads", async () => {
    render(<ReviewQueuePage />)

    await screen.findByText("Showing 1-1 of 1")
    await userEvent.selectOptions(screen.getByLabelText("Mode"), "arrow_duel")
    await userEvent.selectOptions(screen.getByLabelText("Source"), "user_game")
    await userEvent.selectOptions(screen.getByLabelText("Due"), "all")
    await userEvent.selectOptions(screen.getByLabelText("Theme Scope"), "missed_attack,own_mistake_punished")
    await userEvent.click(screen.getByRole("button", { name: "Apply" }))

    await waitFor(() => {
      expect(mockGetReviewQueueStats).toHaveBeenLastCalledWith({
        mode: "arrow_duel",
        puzzle_source: "user_game",
        theme_groups: "missed_attack,own_mistake_punished",
      })
      expect(mockListReviewQueueItems).toHaveBeenLastCalledWith({
        mode: "arrow_duel",
        puzzle_source: "user_game",
        due: "all",
        theme_groups: "missed_attack,own_mistake_punished",
        offset: 0,
        limit: 20,
      })
    })
    expect(navigationMocks.replace).toHaveBeenLastCalledWith(
      "/review-queue?mode=arrow_duel&puzzle_source=user_game&due=all&theme_groups=missed_attack%2Cown_mistake_punished",
      { scroll: false },
    )
  })

  it("clears URL-seeded theme filters before drawing", async () => {
    render(<ReviewQueuePage />)

    await screen.findByText("Showing 1-1 of 1")
    await userEvent.click(screen.getByRole("button", { name: "Clear" }))

    await waitFor(() => {
      expect(mockGetReviewQueueStats).toHaveBeenLastCalledWith({
        mode: undefined,
        puzzle_source: undefined,
        theme_groups: undefined,
      })
      expect(mockListReviewQueueItems).toHaveBeenLastCalledWith({
        mode: undefined,
        puzzle_source: undefined,
        due: "now",
        theme_groups: undefined,
        offset: 0,
        limit: 20,
      })
    })

    await userEvent.click(screen.getByRole("button", { name: "Start Review" }))

    await waitFor(() => {
      expect(mockDrawReviewQueuePuzzles).toHaveBeenLastCalledWith({
        mode: undefined,
        puzzle_source: undefined,
        limit: 5,
        theme_groups: undefined,
      })
    })
    expect(navigationMocks.replace).toHaveBeenLastCalledWith("/review-queue", { scroll: false })
  })

  it("draws Lichess-only reviews without game-analysis theme filters", async () => {
    render(<ReviewQueuePage />)

    await screen.findByText("Showing 1-1 of 1")
    await userEvent.selectOptions(screen.getByLabelText("Source"), "lichess")
    expect(screen.getByLabelText("Theme Scope")).toBeDisabled()
    await userEvent.click(screen.getByRole("button", { name: "Apply" }))

    await waitFor(() => {
      expect(mockGetReviewQueueStats).toHaveBeenLastCalledWith({
        mode: "regular",
        puzzle_source: "lichess",
        theme_groups: undefined,
      })
      expect(mockListReviewQueueItems).toHaveBeenLastCalledWith({
        mode: "regular",
        puzzle_source: "lichess",
        due: "now",
        theme_groups: undefined,
        offset: 0,
        limit: 20,
      })
    })

    await userEvent.click(screen.getByRole("button", { name: "Start Review" }))

    await waitFor(() => {
      expect(mockDrawReviewQueuePuzzles).toHaveBeenLastCalledWith({
        mode: "regular",
        puzzle_source: "lichess",
        limit: 5,
        theme_groups: undefined,
      })
    })
    expect(navigationMocks.replace).toHaveBeenLastCalledWith(
      "/review-queue?mode=regular&puzzle_source=lichess",
      { scroll: false },
    )
  })

  it("hydrates due and pagination from the URL and keeps page navigation shareable", async () => {
    navigationMocks.searchParams = new URLSearchParams("mode=arrow_duel&puzzle_source=user_game&due=all&offset=20")
    mockListReviewQueueItems.mockResolvedValue({
      ...reviewQueueResponse(),
      total_count: 41,
    })

    render(<ReviewQueuePage />)

    expect(await screen.findByText("Showing 21-40 of 41")).toBeInTheDocument()

    await waitFor(() => {
      expect(mockListReviewQueueItems).toHaveBeenCalledWith({
        mode: "arrow_duel",
        puzzle_source: "user_game",
        due: "all",
        theme_groups: undefined,
        offset: 20,
        limit: 20,
      })
    })

    await userEvent.click(screen.getByRole("button", { name: "Next" }))

    expect(navigationMocks.replace).toHaveBeenLastCalledWith(
      "/review-queue?mode=arrow_duel&puzzle_source=user_game&due=all&offset=40",
      { scroll: false },
    )
  })

  it("does not start review when all-active rows have no due positions in the current scope", async () => {
    mockGetReviewQueueStats.mockResolvedValue({
      ...reviewStats(),
      due_now: 0,
      total_queued: 1,
    })

    render(<ReviewQueuePage />)

    await screen.findByText("Showing 1-1 of 1")
    await userEvent.selectOptions(screen.getByLabelText("Due"), "all")
    await userEvent.click(screen.getByRole("button", { name: "Apply" }))

    const startButton = screen.getByRole("button", { name: "Start Review" })
    expect(startButton).toBeDisabled()
    expect(screen.getByText("Starts with due positions matching the current mode, source, and theme filters.")).toBeInTheDocument()
    expect(mockDrawReviewQueuePuzzles).not.toHaveBeenCalled()
  })
})

function reviewStats() {
  return {
    total_queued: 8,
    due_now: 3,
    due_regular: 2,
    due_arrow_duel: 1,
    excluded: 1,
  }
}

function reviewQueueResponse() {
  return {
    items: [reviewItem()],
    total_count: 1,
    offset: 0,
    limit: 20,
  }
}

function reviewItem(overrides = {}) {
  return {
    review_item_id: "review-1",
    puzzle_source: "user_game" as const,
    puzzle_id: "puzzle-1",
    mode: "regular" as const,
    due_at: "2026-06-20T00:00:00Z",
    attempts_since_added: 1,
    consecutive_correct: 0,
    fen: "r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3",
    solution_moves: ["f3e5"],
    rating: 1200,
    themes: ["fork"],
    metadata: {
      theme_group: "missed_opportunity",
    },
    ...overrides,
  }
}
