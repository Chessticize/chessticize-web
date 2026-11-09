/**
 * Sprint API hooks for puzzle sprint functionality
 * Provides hooks for all sprint operations following existing patterns
 */

import { useState, useCallback } from 'react'
import { apiPost, apiGet } from '@/lib/auth/api-client'
import { API_CONFIG } from '@/lib/config'

// TypeScript interfaces for Sprint API
export interface StartSprintRequest {
  elo_type: string
}

export interface StartSprintResponse {
  session_id: string
  user_elo: {
    rating: number
    rating_deviation: number
    is_provisional: boolean
  }
  target_puzzles: number
  time_limit_seconds: number
  max_mistakes: number
}

export interface SprintStateResponse {
  session_id: string
  status: 'active' | 'completed_success' | 'completed_fail_mistakes' | 'completed_fail_time' | 'abandoned'
  puzzles_solved: number
  mistakes_made: number
  started_at: string
  time_remaining_seconds?: number
}

export interface NextPuzzlesRequest {
  count: number
}

export interface SprintPuzzle {
  puzzle_id: string
  fen: string
  solution_moves: string[]
  rating: number
  themes: string[]
  sequence_in_sprint: number
  // New Arrow Duel fields from server
  attempt_type?: 'regular' | 'arrow_duel'
  best_move_eval?: number
  best_move?: string
  blunder_move?: string
  position_eval_after_first_move?: number
}

export interface ArrowDuelPuzzle extends SprintPuzzle {
  bestMove: string
  blunderMove: string
  evaluationDiff: number
  candidateMoves: [string, string] // [blunder, correct]
  bestMoveEval?: number
  blunderMoveEval?: number
  initialEval?: number
  analysisDepth?: number
}

export interface NextPuzzlesResponse {
  puzzles: SprintPuzzle[]
}

export interface PuzzleAttemptRequest {
  puzzle_id: string
  sequence_in_sprint: number
  user_moves: string[]
  was_correct: boolean
  time_taken_ms: number
  attempted_at: string
  attempt_type?: 'regular' | 'arrow_duel'
  candidate_moves?: string[] // [blunder, correct] for arrow duel
  chosen_move?: string // For arrow duel
  best_move?: string // Best move (for arrow duel)
  blunder_move?: string // Blunder move (puzzle solution, for arrow duel)
}

export interface SubmitResultsRequest {
  results: PuzzleAttemptRequest[]
}

export interface SubmitResultsResponse {
  processed_count: number
  session_status: 'active' | 'completed_success' | 'completed_fail_mistakes' | 'completed_fail_time'
  mistakes_count: number
}

export interface EndSprintResponse {
  session_id: string
  status: 'completed_success' | 'completed_fail_mistakes' | 'completed_fail_time' | 'abandoned'
  puzzles_solved: number
  mistakes_made: number
  duration_seconds: number
  elo_change?: {
    rating_before: number
    rating_after: number
    rating_change: number
  }
}

export interface SprintPuzzleAttempt {
  puzzle_id: string
  sequence_in_sprint: number
  fen: string
  solution_moves: string[]
  rating: number
  themes: string[]
  attempt_status: 'unattempted' | 'solved' | 'failed' | 'attempted'
  user_moves?: string[]
  was_correct: boolean
  time_taken_ms?: number
  attempted_at?: string
  // Arrow duel specific fields
  attempt_type?: 'regular' | 'arrow_duel'
  candidate_moves?: string[] // [blunder, correct] for arrow duel
  chosen_move?: string // For arrow duel
  best_move?: string // Best move
  blunder_move?: string // Blunder move (puzzle solution)
}

export interface GetSprintPuzzlesResponse {
  puzzles: SprintPuzzleAttempt[]
  total_count: number
  offset: number
  limit: number
}

interface V2SprintResponse {
  sprint_id: string
  status: SprintStateResponse['status']
  target_puzzles: number
  time_limit_seconds: number
  max_mistakes: number
  mistakes_made: number
  puzzles_solved: number
  time_remaining_seconds?: number
  started_at: string
  duration_seconds?: number | null
  elo: {
    rating_before: number
    rating_after?: number | null
    rating_change?: number | null
    rating_deviation?: number | null
    is_provisional?: boolean | null
  }
}

interface V2SprintPuzzle {
  sprint_puzzle_id: string
  sequence: number
  puzzle_source: 'lichess'
  puzzle_id: string
  mode: 'regular' | 'arrow_duel'
  fen?: string
  solution_moves?: string[]
  rating?: number
  themes?: string[]
  candidate_moves?: Array<{ move: string; kind: string; eval_after?: number | null }>
  correct_move?: string
  best_move?: string
  best_move_eval?: number | null
  position_eval_after_first_move?: number | null
}

interface V2DrawSprintPuzzlesResponse {
  puzzles: V2SprintPuzzle[]
}

interface V2SubmitSprintAttemptsResponse {
  processed_count: number
  sprint_status: SubmitResultsResponse['session_status']
  mistakes_made: number
}

interface V2ListSprintAttemptsResponse {
  attempts: V2SprintAttempt[]
  total_count: number
  offset: number
  limit: number
}

interface V2SprintAttempt {
  sprint_puzzle_id: string
  sequence: number
  status: 'unattempted' | 'correct' | 'failed'
  mode: 'regular' | 'arrow_duel'
  puzzle_source: 'lichess'
  puzzle_id: string
  fen?: string
  solution_moves?: string[]
  rating?: number
  themes?: string[]
  moves?: string[]
  candidate_moves?: string[]
  chosen_move?: string | null
  best_move?: string
  blunder_move?: string
  time_taken_ms?: number | null
  attempted_at?: string | null
}

function v2SprintURL(path: string): string {
  return `${API_CONFIG.BASE_URL}${path}`
}

function toLegacyStartSprintResponse(data: V2SprintResponse): StartSprintResponse {
  return {
    session_id: data.sprint_id,
    user_elo: {
      rating: data.elo.rating_before,
      rating_deviation: data.elo.rating_deviation ?? 0,
      is_provisional: data.elo.is_provisional ?? false
    },
    target_puzzles: data.target_puzzles,
    time_limit_seconds: data.time_limit_seconds,
    max_mistakes: data.max_mistakes
  }
}

function toLegacySprintStateResponse(data: V2SprintResponse): SprintStateResponse {
  return {
    session_id: data.sprint_id,
    status: data.status,
    puzzles_solved: data.puzzles_solved,
    mistakes_made: data.mistakes_made,
    started_at: data.started_at,
    time_remaining_seconds: data.time_remaining_seconds
  }
}

function toLegacySprintPuzzle(puzzle: V2SprintPuzzle): SprintPuzzle {
  const blunderMove = puzzle.candidate_moves?.find(candidate => candidate.kind === 'blunder')?.move
  const bestMove = puzzle.candidate_moves?.find(candidate => candidate.kind === 'best')?.move

  return {
    puzzle_id: puzzle.puzzle_id,
    fen: puzzle.fen ?? '',
    solution_moves: puzzle.solution_moves ?? [],
    rating: puzzle.rating ?? 0,
    themes: puzzle.themes ?? [],
    sequence_in_sprint: puzzle.sequence,
    attempt_type: puzzle.mode,
    best_move_eval: puzzle.best_move_eval ?? undefined,
    best_move: puzzle.best_move ?? puzzle.correct_move ?? bestMove,
    blunder_move: blunderMove,
    position_eval_after_first_move: puzzle.position_eval_after_first_move ?? undefined
  }
}

function toV2SprintAttempt(attempt: PuzzleAttemptRequest) {
  return {
    puzzle_source: 'lichess',
    puzzle_id: attempt.puzzle_id,
    sequence: attempt.sequence_in_sprint,
    mode: attempt.attempt_type === 'arrow_duel' ? 'arrow_duel' : 'regular',
    user_moves: attempt.user_moves,
    candidate_moves: attempt.candidate_moves,
    chosen_move: attempt.chosen_move,
    was_correct: attempt.was_correct,
    time_taken_ms: attempt.time_taken_ms,
    attempted_at: attempt.attempted_at
  }
}

function toLegacySubmitResultsResponse(data: V2SubmitSprintAttemptsResponse): SubmitResultsResponse {
  return {
    processed_count: data.processed_count,
    session_status: data.sprint_status,
    mistakes_count: data.mistakes_made
  }
}

function toLegacyEndSprintResponse(data: V2SprintResponse): EndSprintResponse {
  const ratingAfter = data.elo.rating_after
  const ratingChange = data.elo.rating_change

  return {
    session_id: data.sprint_id,
    status: data.status as EndSprintResponse['status'],
    puzzles_solved: data.puzzles_solved,
    mistakes_made: data.mistakes_made,
    duration_seconds: data.duration_seconds ?? 0,
    elo_change: ratingAfter !== undefined && ratingAfter !== null && ratingChange !== undefined && ratingChange !== null
      ? {
          rating_before: data.elo.rating_before,
          rating_after: ratingAfter,
          rating_change: ratingChange
        }
      : undefined
  }
}

function toV2AttemptStatus(status?: SprintPuzzleAttempt['attempt_status']): string | undefined {
  if (!status) return undefined
  if (status === 'failed') return 'failed'
  if (status === 'solved') return 'solved'
  if (status === 'attempted') return 'attempted'
  if (status === 'unattempted') return 'unattempted'
  return undefined
}

function toLegacySprintPuzzleAttempt(attempt: V2SprintAttempt): SprintPuzzleAttempt {
  const wasCorrect = attempt.status === 'correct'
  const attemptStatus = attempt.status === 'correct'
    ? 'solved'
    : attempt.status === 'failed'
      ? 'failed'
      : 'unattempted'

  return {
    puzzle_id: attempt.puzzle_id,
    sequence_in_sprint: attempt.sequence,
    fen: attempt.fen ?? '',
    solution_moves: attempt.solution_moves ?? [],
    rating: attempt.rating ?? 0,
    themes: attempt.themes ?? [],
    attempt_status: attemptStatus,
    user_moves: attempt.moves,
    was_correct: wasCorrect,
    time_taken_ms: attempt.time_taken_ms ?? undefined,
    attempted_at: attempt.attempted_at ?? undefined,
    attempt_type: attempt.mode,
    candidate_moves: attempt.candidate_moves,
    chosen_move: attempt.chosen_move ?? undefined,
    best_move: attempt.best_move,
    blunder_move: attempt.blunder_move
  }
}

// Hook for starting a sprint
export function useStartSprint() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const startSprint = useCallback(async (eloType: string, abortSignal?: AbortSignal): Promise<StartSprintResponse | null> => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await apiPost(v2SprintURL('/me/sprints'), { elo_type: eloType }, { abortSignal })

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error')
        throw new Error(`Failed to start sprint: ${response.status} ${response.statusText}. ${errorText}`)
      }

      const data: V2SprintResponse = await response.json()
      return toLegacyStartSprintResponse(data)
    } catch (err) {
      // Don't set error state if the request was aborted
      if (err instanceof Error && err.name === 'AbortError') {
        return null
      }
      const errorMessage = err instanceof Error ? err.message : 'Failed to start sprint'
      setError(errorMessage)
      return null
    } finally {
      setIsLoading(false)
    }
  }, [])

  return {
    startSprint,
    isLoading,
    error
  }
}

// Hook for getting sprint state
export function useSprintState() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const getSprintState = useCallback(async (sessionId: string): Promise<SprintStateResponse | null> => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await apiGet(v2SprintURL(`/me/sprints/${sessionId}`))
      
      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error')
        throw new Error(`Failed to get sprint state: ${response.status} ${response.statusText}. ${errorText}`)
      }

      const data: V2SprintResponse = await response.json()
      return toLegacySprintStateResponse(data)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get sprint state'
      setError(errorMessage)
      return null
    } finally {
      setIsLoading(false)
    }
  }, [])

  return {
    getSprintState,
    isLoading,
    error
  }
}

// Hook for getting next puzzles
export function useNextPuzzles() {
  const [error, setError] = useState<string | null>(null)

  const getNextPuzzles = useCallback(async (
    sessionId: string,
    count: number = 10,
    mode: 'regular' | 'arrowduel' = 'regular',
    abortSignal?: AbortSignal,
  ): Promise<NextPuzzlesResponse | null> => {
    setError(null)

    if (mode === 'arrowduel') {
      return await getNextArrowDuelPuzzles(sessionId, count, abortSignal)
    } else {
      return await getNextLichessPuzzles(sessionId, count, abortSignal)
    }
  }, [])

  // Internal function for regular puzzles (renamed from getNextPuzzles)
  const getNextLichessPuzzles = useCallback(async (
    sessionId: string,
    count: number = 10,
    abortSignal?: AbortSignal,
  ): Promise<NextPuzzlesResponse | null> => {
    try {
      const response = await apiPost(v2SprintURL(`/me/sprints/${sessionId}/puzzles:draw`), { count }, { abortSignal })

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error')
        throw new Error(`Failed to get next puzzles: ${response.status} ${response.statusText}. ${errorText}`)
      }

      const data: V2DrawSprintPuzzlesResponse = await response.json()
      return {
        puzzles: data.puzzles.map(toLegacySprintPuzzle)
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get next puzzles'
      setError(errorMessage)
      return null
    }
  }, [])

  // Internal function for Arrow Duel puzzles (server-side filtering)
  const getNextArrowDuelPuzzles = useCallback(async (
    sessionId: string,
    targetCount: number,
    abortSignal?: AbortSignal
  ): Promise<NextPuzzlesResponse | null> => {
    console.log(`🎯 Arrow Duel: Requesting ${targetCount} puzzles from server`)
    
    // Request puzzles from server - server handles Arrow Duel filtering
    const response = await getNextLichessPuzzles(sessionId, targetCount, abortSignal)
    if (!response || abortSignal?.aborted) return null

    // Process server response to convert to ArrowDuelPuzzle format
    const arrowDuelPuzzles = response.puzzles
      .filter(puzzle => puzzle.attempt_type === 'arrow_duel')
      .map(puzzle => ({
        ...puzzle,
        // Add computed fields for UI compatibility
        bestMove: puzzle.best_move!,
        blunderMove: puzzle.blunder_move ?? puzzle.solution_moves[0],
        evaluationDiff: (puzzle.best_move_eval || 0) - (puzzle.position_eval_after_first_move || 0),
        candidateMoves: [puzzle.blunder_move ?? puzzle.solution_moves[0], puzzle.best_move!] as [string, string],
        // Debugging info (optional)
        bestMoveEval: puzzle.best_move_eval || 0,
        blunderMoveEval: puzzle.position_eval_after_first_move || 0,
        initialEval: puzzle.best_move_eval || 0,
        analysisDepth: 12 // Server-side analysis depth
      }))

    console.log(`✅ Arrow Duel: Received ${arrowDuelPuzzles.length} puzzles from server`)
    
    return {
      puzzles: arrowDuelPuzzles
    }
  }, [getNextLichessPuzzles])

  return {
    getNextPuzzles,
    error
  }
}

// Hook for submitting puzzle results
export function useSubmitResults() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submitResults = useCallback(async (
    sessionId: string, 
    results: PuzzleAttemptRequest[],
    isBackground: boolean = false
  ): Promise<SubmitResultsResponse | null> => {
    if (!isBackground) {
      setIsLoading(true)
    }
    setError(null)

    try {
      const response = await apiPost(v2SprintURL(`/me/sprints/${sessionId}/attempts`), {
        attempts: results.map(toV2SprintAttempt)
      })
      
      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error')
        throw new Error(`Failed to submit results: ${response.status} ${response.statusText}. ${errorText}`)
      }

      const data: V2SubmitSprintAttemptsResponse = await response.json()
      return toLegacySubmitResultsResponse(data)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to submit results'
      setError(errorMessage)
      return null
    } finally {
      if (!isBackground) {
        setIsLoading(false)
      }
    }
  }, [])

  return {
    submitResults,
    isLoading,
    error
  }
}

// Request interface for end sprint with optional client counts
export interface EndSprintRequest {
  puzzles_solved?: number
  mistakes_made?: number
}

// Hook for ending a sprint
export function useEndSprint() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const endSprint = useCallback(async (
    sessionId: string, 
    clientCounts?: EndSprintRequest
  ): Promise<EndSprintResponse | null> => {
    setIsLoading(true)
    setError(null)

    try {
      const response = clientCounts
        ? await apiPost(v2SprintURL(`/me/sprints/${sessionId}:finish`), { client_final_counts: clientCounts })
        : await apiPost(v2SprintURL(`/me/sprints/${sessionId}:finish`))
      
      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error')
        throw new Error(`Failed to end sprint: ${response.status} ${response.statusText}. ${errorText}`)
      }

      const data: V2SprintResponse = await response.json()
      return toLegacyEndSprintResponse(data)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to end sprint'
      setError(errorMessage)
      return null
    } finally {
      setIsLoading(false)
    }
  }, [])

  return {
    endSprint,
    isLoading,
    error
  }
}

// Hook for getting sprint puzzles (including mistakes)
export function useSprintPuzzles() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const getSprintPuzzles = useCallback(async (
    sessionId: string,
    options: {
      status?: 'unattempted' | 'solved' | 'failed' | 'attempted'
      offset?: number
      limit?: number
      sequence_min?: number
      sequence_max?: number
    } = {}
  ): Promise<GetSprintPuzzlesResponse | null> => {
    setIsLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      const v2Status = toV2AttemptStatus(options.status)
      if (v2Status) params.append('status', v2Status)
      if (options.offset !== undefined) params.append('offset', options.offset.toString())
      if (options.limit !== undefined) params.append('limit', options.limit.toString())
      if (options.sequence_min !== undefined) params.append('sequence_min', options.sequence_min.toString())
      if (options.sequence_max !== undefined) params.append('sequence_max', options.sequence_max.toString())
      params.append('include_puzzle', 'true')

      const url = v2SprintURL(`/me/sprints/${sessionId}/attempts${params.toString() ? '?' + params.toString() : ''}`)
      const response = await apiGet(url)

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error')
        throw new Error(`Failed to get sprint puzzles: ${response.status} ${response.statusText}. ${errorText}`)
      }

      const data: V2ListSprintAttemptsResponse = await response.json()
      return {
        puzzles: data.attempts.map(toLegacySprintPuzzleAttempt),
        total_count: data.total_count,
        offset: data.offset,
        limit: data.limit
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get sprint puzzles'
      setError(errorMessage)
      return null
    } finally {
      setIsLoading(false)
    }
  }, [])

  return {
    getSprintPuzzles,
    isLoading,
    error
  }
}

// Combined hook for complete sprint management
export function useSprintManager() {
  const { startSprint, isLoading: isStarting, error: startError } = useStartSprint()
  const { getSprintState, isLoading: isGettingState, error: stateError } = useSprintState()
  const { getNextPuzzles, error: puzzlesError } = useNextPuzzles()
  const { submitResults, isLoading: isSubmitting, error: submitError } = useSubmitResults()
  const { endSprint, isLoading: isEnding, error: endError } = useEndSprint()

  const isLoading = isStarting || isGettingState || isSubmitting || isEnding
  const error = startError || stateError || puzzlesError || submitError || endError

  return {
    startSprint,
    getSprintState,
    getNextPuzzles,
    submitResults,
    endSprint,
    isLoading,
    error
  }
}
