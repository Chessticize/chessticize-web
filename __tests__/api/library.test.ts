import { beforeEach, describe, expect, it, vi } from "vitest"
import {
  drawReviewQueuePuzzles,
  excludeReviewQueueItem,
  getAttemptStats,
  getGame,
  getGames,
  getPuzzle,
  getPuzzles,
  getReviewQueueStats,
  getSprintStats,
  listReviewQueueItems,
  submitReviewAttempts,
} from "@/lib/api/library"
import { apiGet, apiPost, ApiError } from "@/lib/auth/api-client"

vi.mock("@/lib/auth/api-client", () => {
  class MockApiError extends Error {
    constructor(message: string, public status?: number, public code?: string) {
      super(message)
      this.name = "ApiError"
    }
  }

  return {
    apiGet: vi.fn(),
    apiPost: vi.fn(),
    ApiError: MockApiError,
  }
})

const mockApiGet = vi.mocked(apiGet)
const mockApiPost = vi.mocked(apiPost)

describe("v2 library API client", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("loads games from the v2 list endpoint with filters", async () => {
    mockApiGet.mockResolvedValue(new Response(JSON.stringify({
      games: [],
      total_count: 0,
      offset: 20,
      limit: 20,
    }), { status: 200 }))

    await getGames({
      platform: "lichess.org",
      username: "alice",
      time_class: "blitz",
      result: "mate",
      offset: 20,
      limit: 20,
    })

    const requestedUrl = new URL(mockApiGet.mock.calls[0][0])
    expect(requestedUrl.pathname).toBe("/api/v2/me/games")
    expect(requestedUrl.searchParams.get("platform")).toBe("lichess.org")
    expect(requestedUrl.searchParams.get("username")).toBe("alice")
    expect(requestedUrl.searchParams.get("time_class")).toBe("blitz")
    expect(requestedUrl.searchParams.get("result")).toBe("mate")
    expect(requestedUrl.searchParams.get("offset")).toBe("20")
    expect(requestedUrl.searchParams.get("limit")).toBe("20")
  })

  it("loads game-derived puzzles with the required puzzle source", async () => {
    mockApiGet.mockResolvedValue(new Response(JSON.stringify({
      puzzles: [],
      total_count: 0,
      offset: 0,
      limit: 20,
    }), { status: 200 }))

    await getPuzzles({
      platform: "chess.com",
      username: "bob",
      theme_groups: "missed_attack",
      game_phase: "middlegame",
      tags: "fork",
      offset: 0,
      limit: 20,
    })

    const requestedUrl = new URL(mockApiGet.mock.calls[0][0])
    expect(requestedUrl.pathname).toBe("/api/v2/me/puzzles")
    expect(requestedUrl.searchParams.get("puzzle_source")).toBe("user_game")
    expect(requestedUrl.searchParams.get("platform")).toBe("chess.com")
    expect(requestedUrl.searchParams.get("username")).toBe("bob")
    expect(requestedUrl.searchParams.get("theme_groups")).toBe("missed_attack")
    expect(requestedUrl.searchParams.get("game_phase")).toBe("middlegame")
    expect(requestedUrl.searchParams.get("tags")).toBe("fork")
  })

  it("loads a game from the v2 detail endpoint", async () => {
    mockApiGet.mockResolvedValue(new Response(JSON.stringify({
      game: { id: "game/with spaces" },
    }), { status: 200 }))

    await getGame("game/with spaces")

    const requestedUrl = new URL(mockApiGet.mock.calls[0][0])
    expect(requestedUrl.pathname).toBe("/api/v2/me/games/game%2Fwith%20spaces")
  })

  it("loads a puzzle from the v2 detail endpoint", async () => {
    mockApiGet.mockResolvedValue(new Response(JSON.stringify({
      puzzle: { id: "puzzle/with spaces" },
    }), { status: 200 }))

    await getPuzzle("puzzle/with spaces")

    const requestedUrl = new URL(mockApiGet.mock.calls[0][0])
    expect(requestedUrl.pathname).toBe("/api/v2/me/puzzles/puzzle%2Fwith%20spaces")
  })

  it("uses the exported ApiError class for failed list reads", async () => {
    mockApiGet.mockResolvedValue(new Response("failed", { status: 500 }))

    await expect(getGames()).rejects.toBeInstanceOf(ApiError)
    await expect(getGames()).rejects.toMatchObject({ message: "Failed to load games", status: 500 })
  })

  it("uses the exported ApiError class for failed detail reads", async () => {
    mockApiGet.mockResolvedValue(new Response("missing", { status: 404 }))

    await expect(getGame("missing-game")).rejects.toMatchObject({ message: "Failed to load game", status: 404 })
    await expect(getPuzzle("missing-puzzle")).rejects.toMatchObject({ message: "Failed to load puzzle", status: 404 })
  })

  it("loads review queue stats from v2", async () => {
    mockApiGet.mockResolvedValue(new Response(JSON.stringify({
      total_queued: 6,
      due_now: 3,
      due_regular: 2,
      due_arrow_duel: 1,
      excluded: 1,
    }), { status: 200 }))

    const stats = await getReviewQueueStats({
      mode: "arrow_duel",
      puzzle_source: "user_game",
      theme_groups: "missed_attack",
    })

    const requestedUrl = new URL(mockApiGet.mock.calls[0][0])
    expect(requestedUrl.pathname).toBe("/api/v2/me/review-queue/stats")
    expect(requestedUrl.searchParams.get("mode")).toBe("arrow_duel")
    expect(requestedUrl.searchParams.get("puzzle_source")).toBe("user_game")
    expect(requestedUrl.searchParams.get("theme_groups")).toBe("missed_attack")
    expect(stats.due_now).toBe(3)
  })

  it("loads sprint stats from the native v2 stats endpoint", async () => {
    mockApiGet.mockResolvedValue(new Response(JSON.stringify({
      summary: {
        started_count: 4,
        completed_count: 3,
        successful_count: 2,
        failed_count: 1,
        completed_fail_mistakes_count: 1,
        completed_fail_time_count: 0,
        active_count: 1,
        abandoned_count: 0,
        sprint_total_duration_seconds: 900,
        puzzles_solved: 27,
        puzzles_attempted: 30,
        average_sprint_duration: 300,
        success_rate: 66.67,
        puzzle_accuracy: 90,
      },
      buckets: { status: [] },
      series: [],
    }), { status: 200 }))

    const stats = await getSprintStats({
      days: 365,
      group_by: "day",
      group_length: 1,
    })

    const requestedUrl = new URL(mockApiGet.mock.calls[0][0])
    expect(requestedUrl.pathname).toBe("/api/v2/me/stats/sprints")
    expect(requestedUrl.searchParams.get("days")).toBe("365")
    expect(requestedUrl.searchParams.get("group_by")).toBe("day")
    expect(requestedUrl.searchParams.get("group_length")).toBe("1")
    expect(stats.summary.completed_count).toBe(3)
  })

  it("uses the exported ApiError class for failed sprint stats reads", async () => {
    mockApiGet.mockResolvedValue(new Response("failed", { status: 500 }))

    await expect(getSprintStats()).rejects.toMatchObject({
      message: "Failed to load sprint stats",
      status: 500,
    })
  })

  it("loads attempt stats from the native v2 stats endpoint", async () => {
    mockApiGet.mockResolvedValue(new Response(JSON.stringify({
      summary: {
        attempt_count: 3,
        correct_count: 2,
        incorrect_count: 1,
        accuracy: 0.67,
        timed_attempt_count: 2,
        average_time_ms: 1500,
      },
      buckets: {},
      series: [],
    }), { status: 200 }))

    const stats = await getAttemptStats({
      from: "2026-03-30",
      to: "2026-06-27",
      context: "review",
      group_by: "day",
      group_length: 1,
    })

    const requestedUrl = new URL(mockApiGet.mock.calls[0][0])
    expect(requestedUrl.pathname).toBe("/api/v2/me/stats/attempts")
    expect(requestedUrl.searchParams.get("from")).toBe("2026-03-30")
    expect(requestedUrl.searchParams.get("to")).toBe("2026-06-27")
    expect(requestedUrl.searchParams.get("context")).toBe("review")
    expect(requestedUrl.searchParams.get("group_by")).toBe("day")
    expect(requestedUrl.searchParams.get("group_length")).toBe("1")
    expect(stats.summary.correct_count).toBe(2)
  })

  it("uses the exported ApiError class for failed attempt stats reads", async () => {
    mockApiGet.mockResolvedValue(new Response("failed", { status: 500 }))

    await expect(getAttemptStats()).rejects.toMatchObject({
      message: "Failed to load attempt stats",
      status: 500,
    })
  })

  it("lists v2 review queue items with mode and due filters", async () => {
    mockApiGet.mockResolvedValue(new Response(JSON.stringify({
      items: [],
      total_count: 0,
      offset: 20,
      limit: 20,
    }), { status: 200 }))

    await listReviewQueueItems({
      mode: "arrow_duel",
      puzzle_source: "user_game",
      due: "now",
      theme_groups: "missed_attack",
      offset: 20,
      limit: 20,
    })

    const requestedUrl = new URL(mockApiGet.mock.calls[0][0])
    expect(requestedUrl.pathname).toBe("/api/v2/me/review-queue")
    expect(requestedUrl.searchParams.get("mode")).toBe("arrow_duel")
    expect(requestedUrl.searchParams.get("puzzle_source")).toBe("user_game")
    expect(requestedUrl.searchParams.get("due")).toBe("now")
    expect(requestedUrl.searchParams.get("theme_groups")).toBe("missed_attack")
    expect(requestedUrl.searchParams.get("offset")).toBe("20")
    expect(requestedUrl.searchParams.get("limit")).toBe("20")
  })

  it("draws v2 review queue puzzles with theme group defaults", async () => {
    mockApiPost.mockResolvedValue(new Response(JSON.stringify({ puzzles: [] }), { status: 200 }))

    await drawReviewQueuePuzzles({
      mode: "regular",
      puzzle_source: "user_game",
      limit: 5,
      theme_groups: ["missed_opportunity"],
    })

    expect(new URL(mockApiPost.mock.calls[0][0]).pathname).toBe("/api/v2/me/review-queue/puzzles:draw")
    expect(mockApiPost.mock.calls[0][1]).toEqual({
      mode: "regular",
      puzzle_source: "user_game",
      limit: 5,
      theme_groups: ["missed_opportunity"],
    })
  })

  it("submits v2 review queue attempts", async () => {
    mockApiPost.mockResolvedValue(new Response(JSON.stringify({
      processed_count: 1,
      updated_items: [{
        review_item_id: "review-1",
        status: "scheduled",
        consecutive_correct: 1,
        next_due_at: "2026-06-22T00:00:00Z",
      }],
    }), { status: 200 }))

    await submitReviewAttempts({
      attempts: [{
        review_item_id: "review-1",
        puzzle_source: "user_game",
        puzzle_id: "puzzle-1",
        mode: "regular",
        user_moves: ["f3e5"],
        was_correct: true,
        time_taken_ms: 1200,
        attempted_at: "2026-06-20T00:00:00Z",
      }],
    })

    expect(new URL(mockApiPost.mock.calls[0][0]).pathname).toBe("/api/v2/me/review-queue/attempts")
    expect(mockApiPost.mock.calls[0][1]).toEqual({
      attempts: [{
        review_item_id: "review-1",
        puzzle_source: "user_game",
        puzzle_id: "puzzle-1",
        mode: "regular",
        user_moves: ["f3e5"],
        was_correct: true,
        time_taken_ms: 1200,
        attempted_at: "2026-06-20T00:00:00Z",
      }],
    })
  })

  it("excludes v2 review queue items", async () => {
    mockApiPost.mockResolvedValue(new Response(JSON.stringify({
      review_item_id: "review-1",
      status: "excluded",
    }), { status: 200 }))

    await excludeReviewQueueItem("review-1", "not_relevant")

    expect(new URL(mockApiPost.mock.calls[0][0]).pathname).toBe("/api/v2/me/review-queue/items/review-1:exclude")
    expect(mockApiPost.mock.calls[0][1]).toEqual({ reason: "not_relevant" })
  })

  it("uses the exported ApiError class for failed review reads", async () => {
    mockApiGet.mockResolvedValue(new Response("failed", { status: 503 }))

    await expect(getReviewQueueStats()).rejects.toBeInstanceOf(ApiError)
    await expect(listReviewQueueItems()).rejects.toMatchObject({ message: "Failed to load review queue", status: 503 })
  })
})
