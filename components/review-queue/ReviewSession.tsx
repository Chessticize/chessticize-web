"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Cpu,
  History,
  Loader2,
  Play,
  SkipForward,
  Sparkles,
  XCircle,
} from "lucide-react"
import { ChessBoard, type ChessBoardRef } from "@/components/puzzle-sprint/ChessBoard"
import { ArrowDuelIndicator, TurnIndicator } from "@/components/puzzle-sprint/SprintIndicators"
import { PositionAnalyzerPanel } from "@/components/chess/PositionAnalyzerPanel"
import { preloadStockfishEngine } from "@/hooks/useStockfish"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  excludeReviewQueueItem,
  submitReviewAttempts,
  type V2ReviewQueuePuzzle,
  type V2ReviewQueueUpdateResult,
} from "@/lib/api/library"
import {
  areCandidateMovesLegalOnFen,
  deterministicArrowOrder,
  uciLineToSan,
  uciMoveToSan,
} from "@/lib/chess/san-helpers"
import { recordLocalAttempt } from "@/lib/storage/local-attempt-history"
import { useI18n } from "@/components/i18n/i18n-provider"
import { cn } from "@/lib/utils"

interface ReviewSessionProps {
  puzzles: V2ReviewQueuePuzzle[]
  onQueueChanged?: () => void
  onExit?: () => void
  onStartNextBatch?: () => void
  hasMoreDue?: boolean
}

type AttemptFeedback =
  | {
      kind: "correct" | "incorrect"
      update?: V2ReviewQueueUpdateResult
      userMoves?: string[]
      chosenMove?: string
    }
  | { kind: "excluded" }

interface MissedReviewEntry {
  puzzle: V2ReviewQueuePuzzle
  userMoves?: string[]
  chosenMove?: string
  correctMove?: string
}

interface BatchStats {
  solved: number
  missed: number
  excluded: number
}

const AUTO_ADVANCE_CORRECT_MS = 650

export function ReviewSession({
  puzzles,
  onQueueChanged,
  onExit,
  onStartNextBatch,
  hasMoreDue = false,
}: ReviewSessionProps) {
  const { t, getThemeName } = useI18n()
  const chessBoardRef = useRef<ChessBoardRef>(null)
  const autoAdvanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    preloadStockfishEngine()
  }, [])

  const [currentIndex, setCurrentIndex] = useState(0)
  const [startedAt, setStartedAt] = useState(Date.now())
  const [feedback, setFeedback] = useState<AttemptFeedback | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isExcluding, setIsExcluding] = useState(false)
  const [analyzingEntry, setAnalyzingEntry] = useState<MissedReviewEntry | null>(null)
  const [missedEntries, setMissedEntries] = useState<MissedReviewEntry[]>([])
  const [batchStats, setBatchStats] = useState<BatchStats>({
    solved: 0,
    missed: 0,
    excluded: 0,
  })
  const [hasMutatedQueue, setHasMutatedQueue] = useState(false)

  const currentPuzzle = puzzles[currentIndex] ?? null
  const isComplete = currentIndex >= puzzles.length
  const hasNext = currentIndex + 1 < puzzles.length

  const candidateMoves = useMemo(
    () => shuffledCandidateMovePair(currentPuzzle),
    [currentPuzzle],
  )
  const correctMove = currentPuzzle
    ? correctMoveForPuzzle(currentPuzzle, candidateMoves)
    : undefined

  // Detect corrupted Arrow Duel data (e.g., opposite-color ply pair from legacy repair script)
  const hasInvalidArrowDuelData = useMemo(() => {
    if (!currentPuzzle || currentPuzzle.mode !== "arrow_duel") return false
    if (!currentPuzzle.fen || !candidateMoves) return true
    return !areCandidateMovesLegalOnFen(currentPuzzle.fen, candidateMoves)
  }, [currentPuzzle, candidateMoves])

  const solutionSan = useMemo(() => {
    if (!currentPuzzle) return []
    if (currentPuzzle.mode === "arrow_duel" && correctMove) {
      return [uciMoveToSan(currentPuzzle.fen, correctMove)]
    }
    const allSan = uciLineToSan(currentPuzzle.fen, currentPuzzle.solution_moves)
    return allSan.length > 1 ? allSan.slice(1) : allSan
  }, [currentPuzzle, correctMove])

  const clearAutoAdvance = useCallback(() => {
    if (autoAdvanceTimerRef.current) {
      clearTimeout(autoAdvanceTimerRef.current)
      autoAdvanceTimerRef.current = null
    }
  }, [])

  useEffect(() => {
    clearAutoAdvance()
    setCurrentIndex(0)
    setStartedAt(Date.now())
    setFeedback(null)
    setError(null)
    setAnalyzingEntry(null)
    setMissedEntries([])
    setBatchStats({ solved: 0, missed: 0, excluded: 0 })
    setHasMutatedQueue(false)
    return clearAutoAdvance
  }, [puzzles, clearAutoAdvance])

  useEffect(() => {
    clearAutoAdvance()
    setStartedAt(Date.now())
    setFeedback(null)
    setError(null)
    return clearAutoAdvance
  }, [currentPuzzle?.review_item_id, clearAutoAdvance])

  const advanceToNext = useCallback(() => {
    clearAutoAdvance()
    setCurrentIndex((index) => {
      const nextIndex = index + 1
      if (nextIndex >= puzzles.length) {
        onQueueChanged?.()
      }
      return nextIndex
    })
  }, [clearAutoAdvance, puzzles.length, onQueueChanged])

  const submitRegularAttempt = async (wasCorrect: boolean, userMoves: string[]) => {
    if (!currentPuzzle || currentPuzzle.mode !== "regular" || feedback) return

    await submitAttempt({
      wasCorrect,
      userMoves,
    })
  }

  const submitArrowDuelAttempt = async (chosenMove: string) => {
    if (!currentPuzzle || currentPuzzle.mode !== "arrow_duel" || !candidateMoves || feedback) return

    const wasCorrect = chosenMove === correctMove
    chessBoardRef.current?.highlightMove(chosenMove, wasCorrect)

    await submitAttempt({
      wasCorrect,
      chosenMove,
      candidateMoves,
    })
  }

  const submitAttempt = async (params: {
    wasCorrect: boolean
    userMoves?: string[]
    chosenMove?: string
    candidateMoves?: [string, string]
  }) => {
    if (!currentPuzzle) return

    const timeTakenMs = Math.max(0, Date.now() - startedAt)
    const attemptedAt = new Date().toISOString()

    try {
      setIsSubmitting(true)
      setError(null)
      const response = await submitReviewAttempts({
        attempts: [
          {
            review_item_id: currentPuzzle.review_item_id,
            puzzle_source: currentPuzzle.puzzle_source,
            puzzle_id: currentPuzzle.puzzle_id,
            mode: currentPuzzle.mode,
            user_moves: currentPuzzle.mode === "regular" ? params.userMoves : undefined,
            candidate_moves: currentPuzzle.mode === "arrow_duel" ? params.candidateMoves : undefined,
            chosen_move: currentPuzzle.mode === "arrow_duel" ? params.chosenMove : undefined,
            was_correct: params.wasCorrect,
            time_taken_ms: timeTakenMs,
            attempted_at: attemptedAt,
          },
        ],
      })

      recordLocalAttempt({
        attempt_id: `local-review-${currentPuzzle.review_item_id}-${Date.now()}`,
        puzzle_source: currentPuzzle.puzzle_source,
        puzzle_id: currentPuzzle.puzzle_id,
        mode: currentPuzzle.mode,
        context: "review",
        context_id: currentPuzzle.review_item_id,
        was_correct: params.wasCorrect,
        user_moves: params.userMoves,
        chosen_move: params.chosenMove ?? null,
        time_taken_ms: timeTakenMs,
        attempted_at: attemptedAt,
        fen: currentPuzzle.fen,
        solution_moves: currentPuzzle.solution_moves,
        rating: currentPuzzle.rating,
        themes: currentPuzzle.themes,
        candidate_moves: currentPuzzle.candidate_moves,
        correct_move: correctMove,
      })

      setBatchStats((prev) => ({
        ...prev,
        solved: prev.solved + (params.wasCorrect ? 1 : 0),
        missed: prev.missed + (params.wasCorrect ? 0 : 1),
      }))
      if (!params.wasCorrect) {
        setMissedEntries((prev) => [
          ...prev,
          {
            puzzle: currentPuzzle,
            userMoves: params.userMoves,
            chosenMove: params.chosenMove,
            correctMove,
          },
        ])
      }
      setHasMutatedQueue(true)
      setFeedback({
        kind: params.wasCorrect ? "correct" : "incorrect",
        update: response.updated_items[0],
        userMoves: params.userMoves,
        chosenMove: params.chosenMove,
      })

      // Auto-advance immediately on correct answers just like Mobile & Puzzle Sprint
      if (params.wasCorrect) {
        autoAdvanceTimerRef.current = setTimeout(() => {
          advanceToNext()
        }, AUTO_ADVANCE_CORRECT_MS)
      }
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : "Failed to submit review attempt",
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const excludeCurrent = async (autoSkip = false) => {
    if (!currentPuzzle || feedback) return

    try {
      setIsExcluding(true)
      setError(null)
      await excludeReviewQueueItem(currentPuzzle.review_item_id, "not_relevant")
      setBatchStats((prev) => ({ ...prev, excluded: prev.excluded + 1 }))
      setHasMutatedQueue(true)
      setFeedback({ kind: "excluded" })
      if (autoSkip) {
        autoAdvanceTimerRef.current = setTimeout(() => {
          advanceToNext()
        }, 350)
      }
    } catch (excludeError) {
      setError(
        excludeError instanceof Error ? excludeError.message : "Failed to exclude review item",
      )
    } finally {
      setIsExcluding(false)
    }
  }

  const handleExit = () => {
    clearAutoAdvance()
    if (hasMutatedQueue) {
      onQueueChanged?.()
    }
    onExit?.()
  }

  // Focused Stockfish Analyzer View (for a missed puzzle during or after the batch)
  if (analyzingEntry && analyzingEntry.puzzle.fen) {
    return (
      <div className="max-w-[1020px] mx-auto space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setAnalyzingEntry(null)}
            className="border-slate-200 dark:border-[#38383A] bg-white dark:bg-[#1C1C1E] text-slate-700 dark:text-[#F2F2F7]"
          >
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            {t("common.backToReview")}
          </Button>
          {!isComplete && feedback && (
            <Button
              type="button"
              size="sm"
              onClick={() => {
                setAnalyzingEntry(null)
                advanceToNext()
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {hasNext ? t("common.next") : t("reviewQueue.finish")}
              <ArrowRight className="h-4 w-4 ml-1.5" />
            </Button>
          )}
        </div>

        <PositionAnalyzerPanel
          fen={analyzingEntry.puzzle.fen}
          mode={analyzingEntry.puzzle.mode}
          solutionMoves={analyzingEntry.puzzle.solution_moves}
          userMoves={analyzingEntry.userMoves}
          chosenMove={analyzingEntry.chosenMove}
          correctMove={analyzingEntry.correctMove}
          themes={analyzingEntry.puzzle.themes}
          rating={analyzingEntry.puzzle.rating}
        />
      </div>
    )
  }

  // Batch Complete Summary (with quick Stockfish analysis for missed positions + History link)
  if (puzzles.length === 0 || isComplete) {
    const attempted = batchStats.solved + batchStats.missed
    const accuracy = attempted > 0 ? Math.round((batchStats.solved / attempted) * 100) : 100

    return (
      <div className="max-w-xl mx-auto">
        <Card className="mb-6 bg-white dark:bg-[#1C1C1E] border-slate-200 dark:border-[#38383A] shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2.5 text-xl font-semibold text-slate-900 dark:text-[#F2F2F7]">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-[#4CD964]">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <span>{t("reviewQueue.completeTitle")}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <p className="text-sm text-slate-600 dark:text-[#AEAEB2]">
              {t("reviewQueue.completeBody")}
            </p>

            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl border border-slate-200 dark:border-[#38383A] bg-slate-50 dark:bg-[#262628] p-3.5 text-center">
                <div className="text-2xl font-semibold tabular-nums text-emerald-600 dark:text-[#4CD964]">
                  {batchStats.solved}
                </div>
                <div className="text-xs text-slate-500 dark:text-[#AEAEB2] mt-0.5">{t("common.solved")}</div>
              </div>
              <div className="rounded-xl border border-slate-200 dark:border-[#38383A] bg-slate-50 dark:bg-[#262628] p-3.5 text-center">
                <div className="text-2xl font-semibold tabular-nums text-red-600 dark:text-[#FF6961]">
                  {batchStats.missed}
                </div>
                <div className="text-xs text-slate-500 dark:text-[#AEAEB2] mt-0.5">{t("common.missed")}</div>
              </div>
              <div className="rounded-xl border border-slate-200 dark:border-[#38383A] bg-slate-50 dark:bg-[#262628] p-3.5 text-center">
                <div className="text-2xl font-semibold tabular-nums text-slate-900 dark:text-[#F2F2F7]">
                  {accuracy}%
                </div>
                <div className="text-xs text-slate-500 dark:text-[#AEAEB2] mt-0.5">{t("reviewQueue.accuracy")}</div>
              </div>
            </div>

            {missedEntries.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-[#AEAEB2]">
                  {t("reviewQueue.missedInBatch")}
                </div>
                <div className="divide-y divide-slate-100 dark:divide-[#2C2C2E] rounded-xl border border-slate-200 dark:border-[#38383A] overflow-hidden">
                  {missedEntries.map((entry) => {
                    const label =
                      entry.puzzle.themes && entry.puzzle.themes.length > 0
                        ? getThemeName(entry.puzzle.themes[0])
                        : entry.puzzle.mode === "arrow_duel"
                          ? t("common.arrowDuel")
                          : t("common.regularPuzzle")
                    return (
                      <div
                        key={entry.puzzle.review_item_id}
                        className="flex items-center justify-between gap-3 px-3.5 py-2.5 bg-slate-50/60 dark:bg-[#262628]"
                      >
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-slate-900 dark:text-[#F2F2F7] truncate">
                            {label}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-[#AEAEB2]">
                            {entry.puzzle.mode === "arrow_duel" ? t("common.arrowDuel") : t("reviewQueue.regular")} · {t("reviewQueue.requeuedTomorrow")}
                          </div>
                        </div>
                        {entry.puzzle.fen && (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => setAnalyzingEntry(entry)}
                            className="shrink-0 border-slate-200 dark:border-[#38383A] bg-white dark:bg-[#1C1C1E] text-blue-600 dark:text-[#4DA3FF]"
                          >
                            <Cpu className="h-3.5 w-3.5 mr-1.5" />
                            {t("common.analyze")}
                          </Button>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2.5">
              {hasMoreDue && onStartNextBatch && (
                <Button
                  type="button"
                  onClick={onStartNextBatch}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Play className="h-4 w-4 mr-1.5" />
                  {t("reviewQueue.nextBatch")}
                </Button>
              )}
              <Button
                type="button"
                variant={hasMoreDue && onStartNextBatch ? "outline" : "default"}
                onClick={onExit ?? onQueueChanged}
                className={
                  hasMoreDue && onStartNextBatch
                    ? "border-slate-200 dark:border-[#38383A] bg-white dark:bg-[#262628] text-slate-700 dark:text-[#F2F2F7]"
                    : "bg-blue-600 hover:bg-blue-700 text-white"
                }
              >
                {onExit ? t("common.backToReview") : t("reviewQueue.refreshQueue")}
              </Button>
              <Link href="/history" className="ml-auto">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-slate-600 dark:text-[#AEAEB2]"
                >
                  <History className="h-4 w-4 mr-1.5" />
                  {t("nav.history")}
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const disabled = isSubmitting || isExcluding || feedback !== null || hasInvalidArrowDuelData
  const progressPercent = Math.round(((currentIndex + (feedback ? 1 : 0)) / puzzles.length) * 100)
  const masteryStage = Math.min(
    5,
    Math.max(
      0,
      typeof currentPuzzle.consecutive_correct === "number" &&
        Number.isFinite(currentPuzzle.consecutive_correct)
        ? currentPuzzle.consecutive_correct
        : 0,
    ),
  )

  return (
    <div className="max-w-[540px] lg:max-w-[1020px] mx-auto flex flex-col gap-2 lg:grid lg:grid-cols-[minmax(440px,620px)_minmax(320px,380px)] lg:grid-rows-[auto_auto_1fr] lg:gap-x-5 lg:gap-y-3 lg:justify-center lg:items-start mb-4 lg:mb-6">
      {/* Slim Session Bar (Top on mobile; Right rail top on PC/iPad landscape) */}
      <div className="lg:col-start-2 lg:row-start-1 flex items-center justify-between gap-2 rounded-xl border border-slate-200 dark:border-[#38383A] bg-white dark:bg-[#1C1C1E] px-2.5 sm:px-3 py-2 shadow-xs">
        <div className="flex items-center gap-1.5 min-w-0">
          {onExit && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleExit}
              aria-label={t("common.exit")}
              className="text-slate-600 dark:text-[#AEAEB2] hover:text-slate-900 dark:hover:text-white px-1.5 sm:px-2 h-8 shrink-0"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline ml-1">{t("common.exit")}</span>
            </Button>
          )}
          <span className="text-sm font-semibold text-slate-900 dark:text-[#F2F2F7] truncate">
            {t("reviewQueue.sessionTitle")}
          </span>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <div className="hidden sm:flex lg:hidden items-center w-20">
            <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-[#2C2C2E] overflow-hidden">
              <div
                className="h-full rounded-full bg-blue-600 dark:bg-[#0A6FE0] transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
          <Badge
            variant="outline"
            className="border-slate-200 dark:border-[#38383A] text-slate-700 dark:text-[#D1D1D6] tabular-nums text-xs"
          >
            {currentIndex + 1} of {puzzles.length}
          </Badge>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={isSubmitting || isExcluding || feedback !== null}
            onClick={() => void excludeCurrent(false)}
            className="text-slate-500 dark:text-[#AEAEB2] hover:text-slate-900 dark:hover:text-white h-8 px-2 text-xs"
          >
            {isExcluding ? (
              <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
            ) : (
              <SkipForward className="h-3.5 w-3.5 mr-1" />
            )}
            {t("common.exclude")}
          </Button>
        </div>
      </div>

      {/* Turn / Arrow Duel Prompt (Directly above board on mobile; right rail on PC) */}
      {currentPuzzle.fen && (
        <div className="lg:col-start-2 lg:row-start-2">
          {currentPuzzle.mode === "arrow_duel" ? (
            <ArrowDuelIndicator fen={currentPuzzle.fen} />
          ) : (
            <TurnIndicator fen={currentPuzzle.fen} />
          )}
        </div>
      )}

      {/* Hero Chessboard (Full width on mobile; Left column spanning full height on PC) */}
      <div className="lg:col-start-1 lg:row-start-1 lg:row-span-3 rounded-2xl border border-slate-200 dark:border-[#38383A] bg-white dark:bg-[#1C1C1E] p-1.5 sm:p-2.5 shadow-sm">
        <ChessBoard
          ref={chessBoardRef}
          key={currentPuzzle.review_item_id}
          fen={currentPuzzle.fen || ""}
          solutionMoves={currentPuzzle.solution_moves ?? []}
          disabled={disabled}
          mode={
            currentPuzzle.mode === "arrow_duel" && !hasInvalidArrowDuelData
              ? "arrowduel"
              : "puzzle"
          }
          candidateMoves={hasInvalidArrowDuelData ? undefined : candidateMoves}
          bestMove={hasInvalidArrowDuelData ? undefined : correctMove}
          blunderMove={
            hasInvalidArrowDuelData
              ? undefined
              : candidateMoves?.find((move) => move !== correctMove)
          }
          onPuzzleComplete={submitRegularAttempt}
          onMoveChosen={submitArrowDuelAttempt}
        />
      </div>

      {/* Lower Controls & Feedback Stack (Below board on mobile; Right rail below prompt on PC) */}
      <div className="lg:col-start-2 lg:row-start-3 space-y-2.5">
        {/* Corrupted Arrow Duel Data Guard (prevents opposite-color broken arrows) */}
        {hasInvalidArrowDuelData && (
          <div className="rounded-xl border border-amber-200 dark:border-amber-800/80 bg-amber-50 dark:bg-amber-950/40 p-3 flex flex-col gap-2.5">
            <div className="flex items-start gap-2 text-sm text-amber-900 dark:text-[#FFB340]">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold">Invalid Arrow Duel move data</div>
                <div className="text-xs opacity-90">
                  One of the stored candidate moves does not match the active side to move.
                </div>
              </div>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={isExcluding}
              onClick={() => void excludeCurrent(true)}
              className="self-start border-amber-300 dark:border-amber-700 bg-white dark:bg-[#1C1C1E] text-amber-900 dark:text-[#FFB340]"
            >
              {isExcluding ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : null}
              Exclude &amp; Skip
            </Button>
          </div>
        )}

        {/* Slim Metadata Strip */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs text-slate-500 dark:text-[#AEAEB2]">
          <div className="flex items-center gap-1.5">
            <Badge
              variant="secondary"
              className="bg-slate-100 dark:bg-[#2C2C2E] text-slate-700 dark:text-[#D1D1D6] text-[11px] font-medium"
            >
              {currentPuzzle.puzzle_source === "user_game" ? t("common.yourGame") : t("nav.puzzleSprint")}
            </Badge>
            {currentPuzzle.rating ? (
              <span className="tabular-nums">Elo {currentPuzzle.rating}</span>
            ) : null}
          </div>

          <div className="inline-flex items-center gap-1.5 tabular-nums">
            <div className="flex items-center gap-1">
              {[0, 1, 2, 3, 4].map((step) => (
                <span
                  key={step}
                  className={cn(
                    "h-1.5 w-3 rounded-full",
                    step < masteryStage
                      ? "bg-emerald-500 dark:bg-[#4CD964]"
                      : "bg-slate-200 dark:bg-[#38383A]",
                  )}
                />
              ))}
            </div>
            <span>{t("reviewQueue.stage", { current: masteryStage })}</span>
          </div>
        </div>

        {/* Desktop Session Progress Bar */}
        <div className="hidden lg:block px-1">
          <div className="h-1.5 w-full rounded-full bg-slate-200/80 dark:bg-[#2C2C2E] overflow-hidden">
            <div
              className="h-full rounded-full bg-blue-600 dark:bg-[#0A6FE0] transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Lightweight Inline Status / Feedback Strip */}
        {isSubmitting && (
          <div className="flex items-center justify-center gap-2 py-2 text-xs text-slate-500 dark:text-[#AEAEB2]">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-600 dark:text-[#4DA3FF]" />
            <span>{t("common.saving")}</span>
          </div>
        )}

        {feedback?.kind === "correct" && (
          <div className="rounded-xl border border-emerald-200 dark:border-emerald-800/80 bg-emerald-50 dark:bg-emerald-950/40 px-3.5 py-2.5 flex items-center justify-between text-sm text-emerald-900 dark:text-[#4CD964]">
            <div className="flex items-center gap-2 font-medium">
              {feedback.update?.status === "mastered" ? (
                <Sparkles className="h-4 w-4 shrink-0" />
              ) : (
                <CheckCircle2 className="h-4 w-4 shrink-0" />
              )}
              <span>
                {feedback.update?.status === "mastered"
                  ? t("reviewQueue.mastered")
                  : t("reviewQueue.correct")}
              </span>
              {feedback.update?.status && (
                <span className="text-xs opacity-85">
                  · {formatStatus(feedback.update.status)}
                </span>
              )}
            </div>
            <span className="text-xs opacity-80">{t("common.next")}...</span>
          </div>
        )}

        {feedback?.kind === "incorrect" && (
          <div className="rounded-xl border border-red-200 dark:border-red-800/80 bg-red-50 dark:bg-red-950/40 px-3.5 py-2.5 space-y-2.5 text-sm text-red-900 dark:text-[#FF6961]">
            <div className="space-y-0.5">
              <div className="flex flex-wrap items-center gap-1.5 font-semibold">
                <XCircle className="h-4 w-4 shrink-0" />
                <span>{t("reviewQueue.incorrect")}</span>
                {solutionSan.length > 0 && (
                  <span className="font-mono font-semibold text-slate-900 dark:text-[#F2F2F7] ml-1">
                    · {t("reviewQueue.bestMove")}: {solutionSan.join(" → ")}
                  </span>
                )}
              </div>
              <div className="text-xs opacity-85">
                {t("reviewQueue.requeuedHint")}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {currentPuzzle.fen && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setAnalyzingEntry({
                      puzzle: currentPuzzle,
                      userMoves: feedback.userMoves,
                      chosenMove: feedback.chosenMove,
                      correctMove,
                    })
                  }
                  className="flex-1 h-9 border-slate-200 dark:border-[#38383A] bg-white dark:bg-[#1C1C1E] text-slate-800 dark:text-[#F2F2F7]"
                >
                  <Cpu className="h-3.5 w-3.5 mr-1.5 text-blue-600 dark:text-[#4DA3FF]" />
                  {t("common.analyze")}
                </Button>
              )}
              <Button
                type="button"
                size="sm"
                onClick={advanceToNext}
                className="flex-1 h-9 bg-blue-600 hover:bg-blue-700 text-white"
              >
                {hasNext ? t("common.next") : t("reviewQueue.finish")}
                <ArrowRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {feedback?.kind === "excluded" && (
          <div className="rounded-xl border border-slate-200 dark:border-[#38383A] bg-white dark:bg-[#1C1C1E] px-3.5 py-2.5 flex items-center justify-between gap-3 text-sm text-slate-700 dark:text-[#D1D1D6]">
            <span>Position excluded from review.</span>
            <Button
              type="button"
              size="sm"
              onClick={advanceToNext}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {hasNext ? t("common.next") : t("reviewQueue.finish")}
              <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/50 p-3 text-sm text-red-800 dark:text-[#FF6961]">
            <XCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>
    </div>
  )
}

function shuffledCandidateMovePair(
  puzzle: V2ReviewQueuePuzzle | null,
): [string, string] | undefined {
  if (!puzzle?.candidate_moves || puzzle.candidate_moves.length < 2) return undefined

  const blunder = puzzle.candidate_moves.find((candidate) => candidate.kind === "blunder")?.move
  const best =
    puzzle.candidate_moves.find((candidate) => candidate.kind === "best")?.move ??
    puzzle.correct_move
  if (blunder && best && blunder !== best) {
    return deterministicArrowOrder(puzzle.review_item_id || puzzle.puzzle_id, [blunder, best])
  }

  const moves = puzzle.candidate_moves.map((candidate) => candidate.move).filter(Boolean)
  if (moves.length < 2) return undefined
  return deterministicArrowOrder(puzzle.review_item_id || puzzle.puzzle_id, [moves[0], moves[1]])
}

function correctMoveForPuzzle(
  puzzle: V2ReviewQueuePuzzle,
  candidateMoves?: [string, string],
): string | undefined {
  return (
    puzzle.correct_move ??
    puzzle.candidate_moves?.find((candidate) => candidate.kind === "best")?.move ??
    candidateMoves?.[1]
  )
}

function formatStatus(status: string): string {
  return status
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}
