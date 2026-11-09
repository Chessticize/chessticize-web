import { API_CONFIG } from "@/lib/config"
import { apiGet, apiPost, ApiError } from "@/lib/auth/api-client"

export interface GameListParams {
  platform?: string
  username?: string
  time_class?: string
  result?: string
  offset?: number
  limit?: number
}

export interface PuzzleListParams extends GameListParams {
  puzzle_source?: "user_game"
  game_phase?: string
  theme_groups?: string
  tags?: string
}

export interface ReviewQueueListParams {
  mode?: "regular" | "arrow_duel"
  puzzle_source?: "lichess" | "user_game"
  due?: "all" | "now"
  theme_groups?: string
  offset?: number
  limit?: number
}

export interface ReviewQueueStatsParams {
  mode?: "regular" | "arrow_duel"
  puzzle_source?: "lichess" | "user_game"
  theme_groups?: string
}

export interface DrawReviewQueueParams {
  mode?: "regular" | "arrow_duel"
  puzzle_source?: "lichess" | "user_game"
  limit?: number
  theme_groups?: string[]
}

export interface SprintStatsParams {
  from?: string
  to?: string
  days?: number
  elo_type?: string
  group_by?: "day" | "week" | "month"
  group_length?: number
}

export interface AttemptStatsParams {
  from?: string
  to?: string
  puzzle_source?: "lichess" | "user_game"
  mode?: "regular" | "arrow_duel"
  context?: "sprint" | "review"
  group_by?: "day" | "week" | "month"
  group_length?: number
}

export interface V2GameListItem {
  id: string
  platform: string
  username: string
  user_color: string
  game_time: string
  time_control: string
  time_class?: string
  rated: boolean
  url?: string | null
  winner: string
  result: string
  created_at: string
  updated_at: string
}

export interface V2GameListResponse {
  games: V2GameListItem[]
  total_count: number
  offset: number
  limit: number
  filters?: Record<string, string>
}

export interface V2GameDetailResponse {
  game: V2GameListItem
}

export interface V2PuzzleGameSummary {
  id: string
  platform: string
  username: string
  game_time: string
  time_control: string
  time_class?: string
  rated: boolean
  result: string
}

export interface V2PuzzleListItem {
  id: string
  puzzle_source: "user_game"
  game_id: string
  game_move: number
  game_phase?: string
  fen: string
  theme: string
  theme_group?: string
  user_color: string
  puzzle_color: string
  zugzwang: boolean
  tags: string[]
  game: V2PuzzleGameSummary
  created_at: string
  updated_at: string
}

export interface V2PuzzleListResponse {
  puzzles: V2PuzzleListItem[]
  total_count: number
  offset: number
  limit: number
  filters?: Record<string, string>
}

export interface V2PuzzleDetailResponse {
  puzzle: V2PuzzleListItem
}

export interface V2ReviewQueueStatsResponse {
  total_queued: number
  due_now: number
  due_regular: number
  due_arrow_duel: number
  excluded: number
}

export interface V2StatsBucket {
  key: string | number | boolean
  count: number
  min_move?: number
  max_move?: number
}

export interface V2SprintStatsSummary {
  started_count: number
  completed_count: number
  successful_count: number
  failed_count: number
  completed_fail_mistakes_count: number
  completed_fail_time_count: number
  active_count: number
  abandoned_count: number
  sprint_total_duration_seconds: number
  puzzles_solved: number
  puzzles_attempted: number
  average_sprint_duration: number
  success_rate: number
  puzzle_accuracy: number
}

export interface V2SprintStatsSeriesPoint {
  start: string
  end: string
  summary: V2SprintStatsSummary
  buckets: Record<string, V2StatsBucket[]>
}

export interface V2SprintStatsResponse {
  range?: Record<string, string>
  summary: V2SprintStatsSummary
  buckets: Record<string, V2StatsBucket[]>
  series: V2SprintStatsSeriesPoint[]
}

export interface V2AttemptStatsSummary {
  attempt_count: number
  correct_count: number
  incorrect_count: number
  accuracy: number
  timed_attempt_count: number
  average_time_ms: number
}

export interface V2AttemptStatsSeriesPoint {
  start: string
  end: string
  summary: V2AttemptStatsSummary
  buckets: Record<string, V2StatsBucket[]>
}

export interface V2AttemptStatsResponse {
  range?: Record<string, string>
  summary: V2AttemptStatsSummary
  buckets: Record<string, V2StatsBucket[]>
  series: V2AttemptStatsSeriesPoint[]
}

export interface V2ReviewQueueCandidateMove {
  move: string
  kind: "blunder" | "best" | string
  eval_after?: number | null
}

export interface V2ReviewQueuePuzzle {
  review_item_id: string
  puzzle_source: "lichess" | "user_game"
  puzzle_id: string
  mode: "regular" | "arrow_duel"
  due_at: string
  attempts_since_added: number
  consecutive_correct: number
  fen?: string
  solution_moves?: string[]
  rating?: number
  themes?: string[]
  candidate_moves?: V2ReviewQueueCandidateMove[]
  correct_move?: string
  metadata?: Record<string, unknown>
}

export interface V2ReviewQueueListResponse {
  items: V2ReviewQueuePuzzle[]
  total_count: number
  offset: number
  limit: number
}

export interface V2DrawReviewQueuePuzzlesResponse {
  puzzles: V2ReviewQueuePuzzle[]
}

export interface V2SubmitReviewAttempt {
  review_item_id: string
  puzzle_source: "lichess" | "user_game"
  puzzle_id: string
  mode: "regular" | "arrow_duel"
  moves?: string[]
  user_moves?: string[]
  candidate_moves?: string[]
  chosen_move?: string
  was_correct: boolean
  time_taken_ms: number
  attempted_at?: string
}

export interface V2SubmitReviewAttemptsRequest {
  attempts: V2SubmitReviewAttempt[]
}

export interface V2ReviewQueueUpdateResult {
  review_item_id: string
  status: "scheduled" | "mastered" | string
  consecutive_correct: number
  next_due_at?: string
}

export interface V2SubmitReviewAttemptsResponse {
  processed_count: number
  updated_items: V2ReviewQueueUpdateResult[]
}

export interface V2ExcludeReviewQueueItemResponse {
  review_item_id: string
  status: "excluded" | string
}

export async function getGames(params: GameListParams = {}): Promise<V2GameListResponse> {
  const response = await apiGet(buildV2URL("/me/games", params))

  if (!response.ok) {
    throw new ApiError("Failed to load games", response.status)
  }

  return await response.json() as V2GameListResponse
}

export async function getGame(gameID: string): Promise<V2GameDetailResponse> {
  const response = await apiGet(`${API_CONFIG.BASE_URL}/me/games/${encodeURIComponent(gameID)}`)

  if (!response.ok) {
    throw new ApiError("Failed to load game", response.status)
  }

  return await response.json() as V2GameDetailResponse
}

export async function getPuzzles(params: PuzzleListParams = {}): Promise<V2PuzzleListResponse> {
  const response = await apiGet(buildV2URL("/me/puzzles", { puzzle_source: "user_game", ...params }))

  if (!response.ok) {
    throw new ApiError("Failed to load puzzles", response.status)
  }

  return await response.json() as V2PuzzleListResponse
}

export async function getPuzzle(puzzleID: string): Promise<V2PuzzleDetailResponse> {
  const response = await apiGet(`${API_CONFIG.BASE_URL}/me/puzzles/${encodeURIComponent(puzzleID)}`)

  if (!response.ok) {
    throw new ApiError("Failed to load puzzle", response.status)
  }

  return await response.json() as V2PuzzleDetailResponse
}

export async function getReviewQueueStats(params: ReviewQueueStatsParams = {}): Promise<V2ReviewQueueStatsResponse> {
  const response = await apiGet(buildV2URL("/me/review-queue/stats", params))

  if (!response.ok) {
    throw new ApiError("Failed to load review queue stats", response.status)
  }

  return await response.json() as V2ReviewQueueStatsResponse
}

export async function getSprintStats(params: SprintStatsParams = {}): Promise<V2SprintStatsResponse> {
  const response = await apiGet(buildV2URL("/me/stats/sprints", params))

  if (!response.ok) {
    throw new ApiError("Failed to load sprint stats", response.status)
  }

  return await response.json() as V2SprintStatsResponse
}

export async function getAttemptStats(params: AttemptStatsParams = {}): Promise<V2AttemptStatsResponse> {
  const response = await apiGet(buildV2URL("/me/stats/attempts", params))

  if (!response.ok) {
    throw new ApiError("Failed to load attempt stats", response.status)
  }

  return await response.json() as V2AttemptStatsResponse
}

export async function listReviewQueueItems(params: ReviewQueueListParams = {}): Promise<V2ReviewQueueListResponse> {
  const response = await apiGet(buildV2URL("/me/review-queue", params))

  if (!response.ok) {
    throw new ApiError("Failed to load review queue", response.status)
  }

  return await response.json() as V2ReviewQueueListResponse
}

export async function drawReviewQueuePuzzles(params: DrawReviewQueueParams = {}): Promise<V2DrawReviewQueuePuzzlesResponse> {
  const response = await apiPost(`${API_CONFIG.BASE_URL}/me/review-queue/puzzles:draw`, params)

  if (!response.ok) {
    throw new ApiError("Failed to start review", response.status)
  }

  return await response.json() as V2DrawReviewQueuePuzzlesResponse
}

export async function submitReviewAttempts(params: V2SubmitReviewAttemptsRequest): Promise<V2SubmitReviewAttemptsResponse> {
  const response = await apiPost(`${API_CONFIG.BASE_URL}/me/review-queue/attempts`, params)

  if (!response.ok) {
    throw new ApiError("Failed to submit review attempt", response.status)
  }

  return await response.json() as V2SubmitReviewAttemptsResponse
}

export async function excludeReviewQueueItem(reviewItemID: string, reason: string = "not_relevant"): Promise<V2ExcludeReviewQueueItemResponse> {
  const response = await apiPost(`${API_CONFIG.BASE_URL}/me/review-queue/items/${reviewItemID}:exclude`, { reason })

  if (!response.ok) {
    throw new ApiError("Failed to exclude review item", response.status)
  }

  return await response.json() as V2ExcludeReviewQueueItemResponse
}

function buildV2URL(path: string, params: object): string {
  const url = new URL(`${API_CONFIG.BASE_URL}${path}`)

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === "") return
    url.searchParams.set(key, String(value))
  })

  return url.toString()
}
