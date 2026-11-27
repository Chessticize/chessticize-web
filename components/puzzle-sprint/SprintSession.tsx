"use client"

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { ChessBoard, ChessBoardRef } from './ChessBoard'
import { SprintTimer } from './SprintTimer'
import { PuzzleLoader } from './PuzzleLoader'
import { useSprintManager, SprintPuzzle, ArrowDuelPuzzle, PuzzleAttemptRequest, EndSprintResponse } from '@/hooks/useSprintApi'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle, Target, X } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog'
import produce from 'immer'
import { debugLog } from '@/lib/config'
import { ArrowDuelIndicator, TurnIndicator } from './SprintIndicators'
import { recordLocalAttempt } from '@/lib/storage/local-attempt-history'
import { useI18n } from '@/components/i18n/i18n-provider'

interface SprintSessionProps {
  eloType: string
  onExit: () => void
  onComplete: (results: EndSprintResponse, failedAttempts?: PuzzleAttemptRequest[]) => void
}

interface SprintState {
  sessionId: string | null
  status: 'starting' | 'active' | 'completed' | 'failed' | 'abandoned' | 'error'
  currentPuzzle: SprintPuzzle | ArrowDuelPuzzle | null
  puzzleQueue: (SprintPuzzle | ArrowDuelPuzzle)[]
  puzzleIndex: number
  mistakeCount: number
  successCount: number
  startTime: number
  timeLimit: number
  targetPuzzles: number
  maxMistakes: number
  userElo: { rating: number; rating_deviation: number; is_provisional: boolean } | null
  pendingResults: PuzzleAttemptRequest[]
  pendingPromises: Promise<any>[]
  failedAttempts: PuzzleAttemptRequest[] // Track failed attempts for review
  mode?: 'regular' | 'arrowduel' // Add mode field
  currentCandidates?: [string, string] // [blunder, correct] for arrow duel
  chosenMove?: string // For arrow duel
}

export function SprintSession({ eloType, onExit, onComplete }: SprintSessionProps) {
  const { t } = useI18n()
  const { startSprint, getNextPuzzles, submitResults, endSprint, isLoading, error } = useSprintManager()
  
  const [sprintState, _setSprintState] = useState<SprintState>({
    sessionId: null,
    status: 'starting',
    currentPuzzle: null,
    puzzleQueue: [],
    puzzleIndex: 0,
    mistakeCount: 0,
    successCount: 0,
    startTime: 0,
    timeLimit: 300, // 5 minutes default (updated to match new standard)
    targetPuzzles: 15, // Updated to match 5min/20sec = 15 puzzles
    maxMistakes: 2, // Default, will be updated from server
    userElo: null,
    pendingResults: [],
    pendingPromises: [],
    failedAttempts: [],
    mode: eloType.includes('arrowduel') ? 'arrowduel' : 'regular',
    currentCandidates: undefined,
    chosenMove: undefined,
  })

  const [timeRemaining, setTimeRemaining] = useState(0)
  const [showAbandonDialog, setShowAbandonDialog] = useState(false)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const chessBoardRef = useRef<ChessBoardRef>(null)

  const isLoadingPuzzlesRef = useRef(false)
  const isEndingSprintRef = useRef(false) // Add guard to prevent multiple endings
  const timerStartedRef = useRef(false) // Track if timer has been started

  // Immer-powered updater to merge concurrent state changes safely
  const updateSprintState = useCallback((updater: (draft: SprintState) => void) => {
    const stackTrace = new Error().stack?.split('\n')[2]?.trim()
    debugLog('🔄 updateSprintState called from:', stackTrace)

    // Capture state before update for comparison
    const prevPuzzleId = sprintState.currentPuzzle?.puzzle_id
    const prevStatus = sprintState.status

    _setSprintState(produce((draft) => {
      updater(draft)

      // Log what changed
      const newPuzzleId = draft.currentPuzzle?.puzzle_id
      const newStatus = draft.status

      if (prevPuzzleId !== newPuzzleId) {
        debugLog('🎯 Puzzle changed:', { from: prevPuzzleId, to: newPuzzleId })
      }
      if (prevStatus !== newStatus) {
        debugLog('📊 Status changed:', { from: prevStatus, to: newStatus })
      }
    }))
  }, [sprintState.currentPuzzle?.puzzle_id, sprintState.status])

  // Initialize sprint
  useEffect(() => {
    debugLog('🚀 SprintSession component mounted/re-mounted, initializing sprint...')
    let isEffectActive = true
    const controller = new AbortController()

    const initializeSprintSafely = async () => {
      if (isEffectActive) {
        await initializeSprint(controller.signal)
      }
    }

    initializeSprintSafely()

    return () => {
      debugLog('🧹 SprintSession component unmounting, cleaning up timers and refs...')
      isEffectActive = false
      controller.abort()
      if (timerRef.current) {
        debugLog('⏰ Clearing timer on unmount')
        clearInterval(timerRef.current)
        timerRef.current = null
        timerStartedRef.current = false
      }
      // Clear puzzle loading ref to prevent issues on re-mount
      debugLog('🧹 Clearing isLoadingPuzzlesRef on unmount')
      isLoadingPuzzlesRef.current = false
    }
  }, [])

  // Clear timer when sprint ends
  useEffect(() => {
    if (sprintState.status === 'completed' || sprintState.status === 'failed' || sprintState.status === 'abandoned') {
      debugLog(`⏰ Sprint ended with status: ${sprintState.status}, clearing timer`)
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
        timerStartedRef.current = false
      }
    }
  }, [sprintState.status])

  // Warn user before leaving/reloading/pressing Back during an active sprint
  useEffect(() => {
    if (sprintState.status !== 'active' || typeof window === 'undefined') {
      return
    }

    const baseUrl = `${window.location.pathname}${window.location.search}`
    const guardUrl = `${baseUrl}#active`
    const savedState = {
      ...(window.history.state && typeof window.history.state === 'object'
        ? window.history.state
        : {}),
      chessticizeSprintGuard: true,
    }
    let gestureGuardPushed = false

    const pushGuardState = () => {
      try {
        window.history.pushState(savedState, '', guardUrl)
      } catch {
        // Ignore history restrictions in sandboxed environments
      }
    }

    pushGuardState()

    // Re-arm the sentinel on the first user gesture so mobile Safari/Chrome
    // History Manipulation Intervention never skips our back-button guard.
    const handleFirstGesture = () => {
      if (gestureGuardPushed) return
      gestureGuardPushed = true
      if (window.location.hash !== '#active') {
        pushGuardState()
      }
    }

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }

    // Capture phase runs BEFORE Next.js App Router's bubble-phase popstate listener,
    // allowing us to block the route unwind and show the Abandon confirmation dialog.
    const handlePopState = (event: PopStateEvent) => {
      event.stopImmediatePropagation()
      pushGuardState()
      setShowAbandonDialog(true)
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    window.addEventListener('popstate', handlePopState, true)
    window.addEventListener('pointerdown', handleFirstGesture, { passive: true, capture: true })

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      window.removeEventListener('popstate', handlePopState, true)
      window.removeEventListener('pointerdown', handleFirstGesture, true)
      if (window.location.hash === '#active') {
        try {
          window.history.replaceState(window.history.state, '', baseUrl)
        } catch {
          // Ignore history restrictions
        }
      }
    }
  }, [sprintState.status])

  // Track ChessBoard prop changes
  useEffect(() => {
    if (sprintState.currentPuzzle) {
      debugLog('🎯 ChessBoard props updated:', {
        puzzleId: sprintState.currentPuzzle.puzzle_id,
        fen: sprintState.currentPuzzle.fen,
        status: sprintState.status,
        timestamp: new Date().toISOString()
      })
    }
  }, [sprintState.currentPuzzle?.puzzle_id, sprintState.currentPuzzle?.fen, sprintState.status])

  // Track session ID changes
  useEffect(() => {
    if (sprintState.sessionId) {
      debugLog('🆔 Session ID updated:', {
        sessionId: sprintState.sessionId,
        status: sprintState.status,
        timestamp: new Date().toISOString()
      })
    }
  }, [sprintState.sessionId, sprintState.status])

  // Watch for sprint completion conditions after state updates
  useEffect(() => {
    // Only check completion conditions when sprint is active
    if (sprintState.status !== 'active' || !sprintState.sessionId) {
      return
    }

    // Check if sprint should fail due to too many mistakes
    if (sprintState.mistakeCount > sprintState.maxMistakes) {
      debugLog(`💀 Too many mistakes! Sprint failed. (${sprintState.mistakeCount} > ${sprintState.maxMistakes})`)
      handleSprintFailed('mistakes')
      return
    }

    // Check if sprint completed successfully (reached target successful solves)
    if (sprintState.successCount >= sprintState.targetPuzzles) {
      debugLog(`🏁 Sprint completed successfully! Solved ${sprintState.successCount}/${sprintState.targetPuzzles} target puzzles.`)
      handleSprintCompleted()
      return
    }
  }, [sprintState.mistakeCount, sprintState.successCount, sprintState.maxMistakes, sprintState.targetPuzzles, sprintState.status, sprintState.sessionId])

  // Watch time remaining for ending sprint
  useEffect(() => {
    if (timeRemaining <= 0 && sprintState.status === 'active') {
      debugLog('⏰ Time up! Ending sprint...')
      handleTimeUp()
    }
  }, [timeRemaining, sprintState.status])

  // Stop the clock when it's loading or when we don't have a puzzle ready.
  useEffect(() => {
    if (isLoading || !sprintState.currentPuzzle) {
      debugLog('⏳ Loading or no puzzle ready, pausing timer...', {
        isLoading,
        hasPuzzle: !!sprintState.currentPuzzle,
        status: sprintState.status
      })
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
        timerStartedRef.current = false
      }
    } else if (!timerStartedRef.current && sprintState.status === 'active' && sprintState.currentPuzzle) {
      debugLog('⌛ Loading complete and puzzle ready, starting timer...', {
        puzzleId: sprintState.currentPuzzle.puzzle_id,
        timeRemaining
      })
      startTimer(timeRemaining)
    }
  }, [isLoading, timeRemaining, sprintState.status, sprintState.currentPuzzle])

  const initializeSprint = async (abortSignal?: AbortSignal) => {
    debugLog('🏁 initializeSprint called:', {
      eloType,
      currentStatus: sprintState.status,
      sessionId: sprintState.sessionId,
      isLoadingPuzzlesRef: isLoadingPuzzlesRef.current,
      timestamp: new Date().toISOString()
    })

    // Guard against re-initializing an already active sprint
    if (sprintState.sessionId && sprintState.status === 'active') {
      debugLog('⚠️ Sprint already active, skipping initialization:', {
        sessionId: sprintState.sessionId,
        status: sprintState.status
      })
      return
    }

    try {
      const response = await startSprint(eloType, abortSignal)
      if (!response) {
        console.error('❌ Failed to start sprint - no response')
        updateSprintState(draft => { draft.status = 'error' })
        return
      }

      debugLog('✅ Sprint started successfully:', {
        sessionId: response.session_id,
        timeLimit: response.time_limit_seconds,
        targetPuzzles: response.target_puzzles,
        maxMistakes: response.max_mistakes
      })

      const startTime = Date.now()
      updateSprintState(draft => {
        draft.sessionId = response.session_id
        draft.startTime = startTime
        draft.timeLimit = response.time_limit_seconds
        draft.targetPuzzles = response.target_puzzles
        draft.maxMistakes = response.max_mistakes
        draft.userElo = response.user_elo
        draft.status = 'active'
      })

      setTimeRemaining(response.time_limit_seconds)
    } catch (err) {
      // Don't update state if the request was aborted (component unmounting)
      if (err instanceof Error && err.name === 'AbortError') {
        debugLog('🚫 Sprint initialization aborted (component unmounting)')
        return
      }
      console.error('Failed to initialize sprint:', err)
      updateSprintState(draft => { draft.status = 'error' })
    }
  }

  const startTimer = (_duration: number) => {
    // Prevent multiple timer instances
    if (timerStartedRef.current) {
      debugLog('⚠️ Timer already started, skipping duplicate start')
      return
    }

    // Clear any existing timer first to prevent multiple timers
    if (timerRef.current) {
      debugLog('⚠️ Clearing existing timer before starting new one')
      clearInterval(timerRef.current)
      timerRef.current = null
    }

    debugLog(`⏰ Starting timer for ${_duration} seconds`)
    timerStartedRef.current = true

    timerRef.current = setInterval(() => {
      setTimeRemaining(prev => {
        const newTime = prev - 1
        
        if (newTime <= 0) {
          // Clear the timer immediately to prevent multiple calls
          if (timerRef.current) {
            debugLog('⏰ Timer reached 0, clearing interval')
            clearInterval(timerRef.current)
            timerRef.current = null
            timerStartedRef.current = false
          }
        }
        return newTime
      })
    }, 1000)
  }

  const loadNextPuzzles = async (sessionId: string, abortSignal: AbortSignal, count: number = 10) => {
    // Prevent concurrent puzzle loading
    if (isLoadingPuzzlesRef.current) {
      debugLog('Already loading puzzles, skipping:', {
        requestedSessionId: sessionId,
        currentSessionId: sprintState.sessionId,
        isLoadingPuzzlesRef: isLoadingPuzzlesRef.current
      })
      return
    }

    debugLog('🔄 Starting loadNextPuzzles:', {
      requestedSessionId: sessionId,
      currentSessionId: sprintState.sessionId,
      count,
      sprintStatus: sprintState.status
    })

    isLoadingPuzzlesRef.current = true

    try {
      debugLog(`📦 Loading ${count} new puzzles...`)
      // Determine mode from ELO type
      const mode = eloType.includes('arrowduel') ? 'arrowduel' : 'regular'
      const response = await getNextPuzzles(sessionId, count, mode, abortSignal)
      if (!response || !response.puzzles) {
        console.error('Failed to load puzzles - no response')
        return
      }

      debugLog(`✅ Loaded ${response.puzzles.length} puzzles for sprint ${sessionId}`)

      updateSprintState(draft => {
        if (draft.sessionId !== sessionId) {
          debugLog('⚠️ Loaded puzzles for wrong session, skipping:', {
            requestedSessionId: sessionId,
            currentSessionId: sprintState.sessionId,
            sprintStatus: sprintState.status
          })
          return
        }

        // Safety check: prevent array from growing too large
        if (draft.puzzleQueue.length > 100) {
          console.warn('Puzzle queue too large, skipping load')
          return
        }

        // Safety check: prevent duplicate puzzles
        const newPuzzles = response.puzzles.filter(puzzle =>
          !draft.puzzleQueue.some(existing => existing.puzzle_id === puzzle.puzzle_id)
        )

        if (newPuzzles.length === 0) {
          return
        }

        // Add new puzzles to the queue
        draft.puzzleQueue.push(...newPuzzles)

        // If we don't have a current puzzle, set it to the next one in the queue
        if (!draft.currentPuzzle && draft.puzzleQueue[draft.puzzleIndex]) {
          const nextPuzzle = draft.puzzleQueue[draft.puzzleIndex]
          debugLog('🎯 Setting current puzzle from loaded queue:', {
            puzzleId: nextPuzzle.puzzle_id,
            puzzleIndex: draft.puzzleIndex
          })
          draft.currentPuzzle = nextPuzzle
        }
      })
    } catch (err) {
      console.error('Failed to load puzzles:', err)
    } finally {
      isLoadingPuzzlesRef.current = false
    }
  }

  // Handle Arrow Duel move selection
  const handleArrowDuelMoveChosen = useCallback((chosenMove: string, isCorrect: boolean) => {
    if (sprintState.status !== 'active' || !sprintState.currentPuzzle || sprintState.mode !== 'arrowduel') {
      console.warn('⚠️ Arrow Duel move selection ignored - invalid state:', {
        status: sprintState.status,
        hasPuzzle: !!sprintState.currentPuzzle,
        mode: sprintState.mode
      })
      return
    }

    const puzzle = sprintState.currentPuzzle as ArrowDuelPuzzle
    const attemptTime = Date.now() - sprintState.startTime

    debugLog(`🏹 Arrow Duel move chosen:`, {
      puzzleId: puzzle.puzzle_id,
      chosenMove,
      isCorrect,
      candidateMoves: puzzle.candidateMoves,
      attemptTime,
      sequence: puzzle.sequence_in_sprint
    })

    // Trigger color-coded highlighting on the chess board
    if (chessBoardRef.current) {
      chessBoardRef.current.highlightMove(chosenMove, isCorrect)
    }

    // Create Arrow Duel attempt
    const attempt: PuzzleAttemptRequest = {
      puzzle_id: puzzle.puzzle_id,
      sequence_in_sprint: puzzle.sequence_in_sprint,
      user_moves: [chosenMove],
      was_correct: isCorrect,
      time_taken_ms: attemptTime,
      attempted_at: new Date().toISOString(),
      attempt_type: 'arrow_duel',
      candidate_moves: puzzle.candidateMoves,
      chosen_move: chosenMove,
      best_move: puzzle.bestMove,
      blunder_move: puzzle.blunderMove
    }

    recordLocalAttempt({
      attempt_id: `local-sprint-${sprintState.sessionId || 'session'}-${puzzle.puzzle_id}-${Date.now()}`,
      puzzle_source: 'lichess',
      puzzle_id: puzzle.puzzle_id,
      mode: 'arrow_duel',
      context: 'sprint',
      context_id: sprintState.sessionId ?? null,
      was_correct: isCorrect,
      user_moves: [chosenMove],
      chosen_move: chosenMove,
      time_taken_ms: attemptTime,
      attempted_at: attempt.attempted_at,
      fen: puzzle.fen,
      solution_moves: puzzle.solution_moves,
      rating: puzzle.rating,
      themes: puzzle.themes,
      candidate_moves: [
        { move: puzzle.blunderMove, kind: 'blunder' },
        { move: puzzle.bestMove, kind: 'best' },
      ],
      correct_move: puzzle.bestMove,
    })

    // Calculate new counts based on result
    const newMistakeCount = !isCorrect ? sprintState.mistakeCount + 1 : sprintState.mistakeCount
    const newSuccessCount = isCorrect ? sprintState.successCount + 1 : sprintState.successCount

    // Move to next puzzle
    const nextIndex = sprintState.puzzleIndex + 1
    const nextPuzzle = sprintState.puzzleQueue[nextIndex]

    debugLog('🏹 Arrow Duel progress:', {
      puzzleIndex: sprintState.puzzleIndex,
      nextIndex: nextIndex,
      successCount: newSuccessCount,
      targetPuzzles: sprintState.targetPuzzles,
      mistakeCount: newMistakeCount,
      maxMistakes: sprintState.maxMistakes,
      timeRemaining: timeRemaining,
      nextPuzzle: nextPuzzle ? { id: nextPuzzle.puzzle_id, fen: nextPuzzle.fen } : null
    })

    // Add attempt to pending results immediately
    updateSprintState(draft => {
      draft.pendingResults.push(attempt)
      // Also add to failed attempts if incorrect
      if (!isCorrect) {
        draft.failedAttempts.push(attempt)
      }
      draft.chosenMove = chosenMove // Store the chosen move for immediate UI feedback
    })

    // Delay before moving to next puzzle - 1 second for both correct and wrong moves
    const moveDelay = 1000 // 1 second for all moves
    setTimeout(() => {
      updateSprintState(draft => {
        draft.mistakeCount = newMistakeCount
        draft.successCount = newSuccessCount
        draft.puzzleIndex = nextIndex
        draft.currentPuzzle = nextPuzzle
      })
    }, moveDelay)
  }, [sprintState.status, sprintState.currentPuzzle, sprintState.mode, sprintState.mistakeCount, sprintState.puzzleIndex, sprintState.puzzleQueue, sprintState.targetPuzzles, sprintState.sessionId, sprintState.startTime, timeRemaining])

  const handlePuzzleComplete = useCallback((success: boolean, userMoves: string[]) => {
    debugLog('🎯 PUZZLE COMPLETE HANDLER CALLED:', {
      success,
      currentPuzzleIndex: sprintState.puzzleIndex,
      puzzleQueueLength: sprintState.puzzleQueue.length,
      targetPuzzles: sprintState.targetPuzzles,
      puzzlesSolved: sprintState.puzzleIndex + 1,
      timestamp: new Date().toISOString()
    })

    // Prepare the puzzle attempt result
    let attempt: PuzzleAttemptRequest | null = null
    if (sprintState.currentPuzzle && sprintState.sessionId) {
      const attemptTime = Date.now() - sprintState.startTime
      attempt = {
        puzzle_id: sprintState.currentPuzzle.puzzle_id,
        sequence_in_sprint: sprintState.currentPuzzle.sequence_in_sprint,
        user_moves: userMoves,
        was_correct: success,
        time_taken_ms: attemptTime,
        attempted_at: new Date().toISOString(),
        attempt_type: 'regular'
      }

      recordLocalAttempt({
        attempt_id: `local-sprint-${sprintState.sessionId}-${sprintState.currentPuzzle.puzzle_id}-${Date.now()}`,
        puzzle_source: 'lichess',
        puzzle_id: sprintState.currentPuzzle.puzzle_id,
        mode: 'regular',
        context: 'sprint',
        context_id: sprintState.sessionId,
        was_correct: success,
        user_moves: userMoves,
        chosen_move: null,
        time_taken_ms: attemptTime,
        attempted_at: attempt.attempted_at,
        fen: sprintState.currentPuzzle.fen,
        solution_moves: sprintState.currentPuzzle.solution_moves,
        rating: sprintState.currentPuzzle.rating,
        themes: sprintState.currentPuzzle.themes,
      })
    }

    // Calculate new counts based on puzzle result
    const newMistakeCount = !success ? sprintState.mistakeCount + 1 : sprintState.mistakeCount
    const newSuccessCount = success ? sprintState.successCount + 1 : sprintState.successCount

    // Move to next puzzle
    const nextIndex = sprintState.puzzleIndex + 1
    const nextPuzzle = sprintState.puzzleQueue[nextIndex]

    debugLog('📋 Sprint progress:', {
      puzzleIndex: sprintState.puzzleIndex,
      nextIndex: nextIndex,
      successCount: newSuccessCount,
      targetPuzzles: sprintState.targetPuzzles,
      mistakeCount: newMistakeCount,
      maxMistakes: sprintState.maxMistakes,
      timeRemaining: timeRemaining,
      nextPuzzle: nextPuzzle ? { id: nextPuzzle.puzzle_id, fen: nextPuzzle.fen } : null
    })

    // Batch all state updates: attempt result, mistake count, success count, and next puzzle
    updateSprintState(draft => {
      if (attempt) {
        draft.pendingResults.push(attempt)
        // Also add to failed attempts if incorrect
        if (!success) {
          draft.failedAttempts.push(attempt)
        }
      }
      draft.mistakeCount = newMistakeCount
      draft.successCount = newSuccessCount
      draft.puzzleIndex = nextIndex
      draft.currentPuzzle = nextPuzzle
    })
  }, [sprintState.mistakeCount, sprintState.puzzleIndex, sprintState.puzzleQueue, sprintState.targetPuzzles, sprintState.sessionId, sprintState.startTime, timeRemaining])

  useEffect(() => {
    if (sprintState.pendingResults.length === 0 || sprintState.status !== 'active') return
    const promise = submitPendingResults(true)
    updateSprintState(draft => {
      draft.pendingPromises.push(promise)
    })
  }, [sprintState.pendingResults, sprintState.status])

  useEffect(() => {
    if (sprintState.status !== 'active') return

    // Preload more puzzles if running low (with safety check)
    if (sprintState.puzzleQueue.length - sprintState.puzzleIndex < 3 &&
        sprintState.sessionId &&
        sprintState.puzzleQueue.length < 100) { // Safety limit
      debugLog('📦 Loading puzzles for session:', {
        sessionId: sprintState.sessionId,
        queueLength: sprintState.puzzleQueue.length,
        puzzleIndex: sprintState.puzzleIndex,
        status: sprintState.status
      })

      // Create AbortController for this effect
      const controller = new AbortController()
      let isEffectActive = true

      const loadPuzzles = async () => {
        try {
          // Ensure sessionId is not null before calling
          if (!sprintState.sessionId) return
          await loadNextPuzzles(sprintState.sessionId, controller.signal, 5)
        } catch (e) {
          // Only log errors if the effect is still active and it's not an abort error
          if (isEffectActive && e instanceof Error && e.name !== 'AbortError') {
            console.error('Error loading puzzles:', e)
          }
        }
      }

      loadPuzzles()

      // Cleanup function
      return () => {
        isEffectActive = false
        controller.abort()
      }
    }
  }, [sprintState.puzzleQueue, sprintState.puzzleIndex, sprintState.sessionId, sprintState.status])

  const submitPendingResults = async (isBackground: boolean = false) => {
    if (!sprintState.sessionId || sprintState.pendingResults.length === 0) return

    // Copy the results to submit before clearing the state
    const resultsToSubmit = [...sprintState.pendingResults]

    // Clear pending results immediately to prevent duplicate submissions
    // Use a ref to track if we're currently submitting to avoid unnecessary state updates
    updateSprintState(draft => {
      draft.pendingResults = []
    })

    try {
      debugLog(`📤 Submitting ${resultsToSubmit.length} puzzle results in background...`)
      await submitResults(sprintState.sessionId, resultsToSubmit, isBackground)
      debugLog(`✅ Successfully submitted ${resultsToSubmit.length} puzzle results`)
    } catch (err) {
      console.error('Failed to submit results:', err)
      // Re-add the results if submission failed
      updateSprintState(draft => {
        draft.pendingResults.push(...resultsToSubmit)
      })
    }
  }

  const handleTimeUp = async () => {
    debugLog('🚨 handleTimeUp called:', {
      isEndingSprintRef: isEndingSprintRef.current,
      sprintStatus: sprintState.status,
      timeRemaining: timeRemaining,
      sessionId: sprintState.sessionId,
      timestamp: new Date().toISOString()
    })

    // Guard against multiple calls
    if (isEndingSprintRef.current || sprintState.status !== 'active') {
      debugLog('Sprint already ending or not active, skipping handleTimeUp:', {
        isEnding: isEndingSprintRef.current,
        status: sprintState.status,
        timeRemaining: timeRemaining
      })
      return
    }

    debugLog('⏰ Time is up! Ending sprint...')
    await handleSprintFailed('time')
  }

  const handleSprintCompleted = async () => {
    if (!sprintState.sessionId || isEndingSprintRef.current) return

    isEndingSprintRef.current = true
    debugLog('🏁 handleSprintCompleted called:', {
      sessionId: sprintState.sessionId,
      currentStatus: sprintState.status,
      timestamp: new Date().toISOString()
    })

    try {
      // Wait for any pending result submissions to complete
      await Promise.all(sprintState.pendingPromises)
      await submitPendingResults(false)

      // Send client's accurate count to override server calculations
      const clientCounts = {
        puzzles_solved: sprintState.successCount,
        mistakes_made: sprintState.mistakeCount
      }
      
      const response = await endSprint(sprintState.sessionId, clientCounts)
      debugLog('📊 Server response from endSprint:', {
        response,
        clientCounts,
        clientFailedAttempts: sprintState.failedAttempts.length
      })

      if (response) {
        // Call onComplete BEFORE updating status, pass failed attempts
        onComplete(response, sprintState.failedAttempts)
        // Then update status
        updateSprintState(draft => { draft.status = 'completed' })
      }
    } catch (err) {
      console.error('Failed to complete sprint:', err)
      updateSprintState(draft => { draft.status = 'error' })
    } finally {
      isEndingSprintRef.current = false
    }
  }

  const handleSprintFailed = async (reason: 'mistakes' | 'time' | 'abandon') => {
    if (!sprintState.sessionId || isEndingSprintRef.current) return

    isEndingSprintRef.current = true
    debugLog(`🚫 Sprint failed due to: ${reason}`)

    try {
      // Wait for any pending result submissions to complete
      await Promise.all(sprintState.pendingPromises)
      await submitPendingResults(false)

      // Send client's accurate count to override server calculations
      const clientCounts = {
        puzzles_solved: sprintState.successCount,
        mistakes_made: sprintState.mistakeCount
      }
      
      const response = await endSprint(sprintState.sessionId, clientCounts)
      debugLog('📊 Server response from endSprint (failed):', {
        response,
        reason,
        originalStatus: response?.status,
        clientCounts,
        clientFailedAttempts: sprintState.failedAttempts.length
      })

      if (response) {
        // For abandoned sprints, we need to override the server status
        // because the server doesn't distinguish between abandon and timeout
        if (reason === 'abandon') {
          debugLog('🏃‍♂️ Overriding server status to "abandoned" for abandon reason')
          response.status = 'abandoned'
        }

        // Call onComplete BEFORE updating status, pass failed attempts
        onComplete(response, sprintState.failedAttempts)
        // Then update status
        if (reason === 'abandon') {
          updateSprintState(draft => { draft.status = 'abandoned' })
        } else {
          updateSprintState(draft => { draft.status = 'failed' })
        }
      }
    } catch (err) {
      console.error('Failed to end sprint:', err)
      updateSprintState(draft => { draft.status = 'error' })
    } finally {
      isEndingSprintRef.current = false
    }
  }

  const handleAbandon = () => {
    setShowAbandonDialog(true)
  }

  const handleConfirmAbandon = async () => {
    setShowAbandonDialog(false)
    debugLog('🏃‍♂️ User confirmed sprint abandonment')
    await handleSprintFailed('abandon')
  }

  const handleExit = async () => {
    onExit()
  }

  // Render loading state
  if (sprintState.status === 'starting' || isLoading) {
    return <PuzzleLoader message="Starting your sprint..." />
  }

  // Render error state
  if (sprintState.status === 'error' || error) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-slate-50 dark:bg-[#0B0D12] p-4">
        <Card className="max-w-lg w-full bg-white dark:bg-[#1C1C1E] border-slate-200 dark:border-[#38383A]">
          <CardContent className="p-8 text-center space-y-4">
            <div className="mx-auto mb-4 p-3 bg-red-100 dark:bg-red-950/60 rounded-full w-fit">
              <AlertTriangle className="h-8 w-8 text-red-600 dark:text-[#FF6961]" />
            </div>
            <h2 className="text-xl font-bold text-red-700 dark:text-[#FF6961]">Sprint Error</h2>
            <p className="text-slate-600 dark:text-[#D1D1D6]">{error || 'An unexpected error occurred'}</p>
            <p className="text-sm text-slate-500 dark:text-[#AEAEB2]">
              If the issue persists, try signing out from the menu and signing back in.
            </p>
            <Button onClick={handleExit} variant="outline">
              {t('sprintResult.backToMenu')}
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Render completed/failed/abandoned state - this should trigger the parent to show results
  if (sprintState.status === 'completed' || sprintState.status === 'failed' || sprintState.status === 'abandoned') {
    return <PuzzleLoader message="Processing results..." />
  }

  // Render main sprint interface
  return (
    <div className="h-[100dvh] bg-slate-50 dark:bg-[#0B0D12] flex flex-col overflow-hidden">
      {/* Header - Mobile-optimized compact design */}
      <div className="flex items-center justify-between px-3 sm:px-4 py-2 flex-shrink-0 bg-white dark:bg-[#1C1C1E] shadow-sm border-b border-slate-200 dark:border-[#38383A]">
        <div className="flex items-center space-x-2 sm:space-x-3">
          <Button
            onClick={sprintState.status === 'active' ? handleAbandon : handleExit}
            variant="outline"
            size="sm"
            className="h-8 px-2 sm:h-9 sm:px-3 border-slate-200 dark:border-[#38383A] bg-white dark:bg-[#262628] text-slate-700 dark:text-[#F2F2F7]"
          >
            <X className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
            <span className="text-xs sm:text-sm">{sprintState.status === 'active' ? t('sprint.abandon') : t('common.exit')}</span>
          </Button>
          <div className="flex items-center space-x-1 sm:space-x-2">
            <Target className="h-3 w-3 sm:h-4 sm:w-4 text-blue-600 dark:text-[#4DA3FF]" />
            <span className="font-semibold text-xs sm:text-sm text-slate-900 dark:text-[#F2F2F7] tabular-nums">
              Success {sprintState.successCount}/{sprintState.targetPuzzles}
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-2 sm:space-x-3">
          {/* Mistake Counter */}
          <div className="flex items-center space-x-1">
            {[0, 1, 2].map(i => (
              <div
                key={i}
                className={`w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full ${
                  i < sprintState.mistakeCount ? 'bg-red-500' : 'bg-slate-300 dark:bg-[#48484A]'
                }`}
              />
            ))}
          </div>

          {/* Timer */}
          <SprintTimer timeRemaining={timeRemaining} />

          {/* Elo Display - Hide on very small screens */}
          {sprintState.userElo && (
            <Badge variant="secondary" className="hidden xs:inline-flex bg-blue-50 dark:bg-[#0B2A4D] text-blue-700 dark:text-[#4DA3FF] border border-blue-200 dark:border-[#16467A] text-xs tabular-nums">
              Elo: {sprintState.userElo.rating}
            </Badge>
          )}
        </div>
      </div>

      {/* Main Content - Mobile-optimized chess board area */}
      <div className="flex-1 min-h-0 flex flex-col items-center p-2 sm:p-4 overflow-hidden">
        {sprintState.currentPuzzle ? (
          <div className="w-full h-full max-w-4xl max-h-full flex flex-col items-center mx-auto">

            {/* Turn Indicator (for regular puzzles) */}
            {sprintState.mode !== 'arrowduel' && (
              <div className="flex-shrink-0 w-full max-w-[700px] mb-2 sm:mb-3">
                <TurnIndicator fen={sprintState.currentPuzzle.fen} className="lg:justify-center" />
              </div>
            )}

            {/* Arrow Duel Indicator (for arrow duel puzzles) */}
            {sprintState.mode === 'arrowduel' && (
              <div className="flex-shrink-0 w-full max-w-[700px] mb-2 sm:mb-3">
                <ArrowDuelIndicator fen={sprintState.currentPuzzle.fen} className="lg:justify-center" />
              </div>
            )}


            {/* Chess Board */}
            <div className="flex-1 min-h-0 w-full flex justify-center">
              <ChessBoard
                ref={chessBoardRef}
                key={sprintState.currentPuzzle.puzzle_id}
                fen={sprintState.currentPuzzle.fen}
                solutionMoves={sprintState.currentPuzzle.solution_moves}
                onPuzzleComplete={handlePuzzleComplete}
                disabled={sprintState.status !== 'active'}
                mode={sprintState.mode === 'arrowduel' ? 'arrowduel' : 'puzzle'}
                fitContainer="both"
                candidateMoves={sprintState.mode === 'arrowduel' && 'candidateMoves' in sprintState.currentPuzzle
                  ? (sprintState.currentPuzzle as ArrowDuelPuzzle).candidateMoves
                  : undefined}
                bestMove={sprintState.mode === 'arrowduel' && 'bestMove' in sprintState.currentPuzzle
                  ? (sprintState.currentPuzzle as ArrowDuelPuzzle).bestMove
                  : undefined}
                blunderMove={sprintState.mode === 'arrowduel' && 'blunderMove' in sprintState.currentPuzzle
                  ? (sprintState.currentPuzzle as ArrowDuelPuzzle).blunderMove
                  : undefined}
                onMoveChosen={sprintState.mode === 'arrowduel' ? handleArrowDuelMoveChosen : undefined}
              />
            </div>
          </div>
        ) : (
          <PuzzleLoader message="Loading next puzzle..." />
        )}
      </div>

      {/* Abandon Confirmation Dialog */}
      <AlertDialog open={showAbandonDialog} onOpenChange={setShowAbandonDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('sprint.abandonTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('sprint.abandonBody')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('sprint.continueSprint')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmAbandon}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {t('sprint.abandonSprint')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
