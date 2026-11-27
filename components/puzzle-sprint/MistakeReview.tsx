"use client"

import React, { useEffect, useMemo, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ChessBoard, type ChessBoardRef } from "./ChessBoard"
import { ArrowDuelIndicator, TurnIndicator } from "./SprintIndicators"
import { PositionAnalyzerPanel } from "@/components/chess/PositionAnalyzerPanel"
import Navigation from "@/components/navigation"
import { MobileContainer, MobileLayout } from "@/components/ui/mobile-layout"
import { preloadStockfishEngine } from "@/hooks/useStockfish"
import {
  useSprintPuzzles,
  type SprintPuzzleAttempt,
  type PuzzleAttemptRequest,
} from "@/hooks/useSprintApi"
import {
  areCandidateMovesLegalOnFen,
  deterministicArrowOrder,
  uciLineToSan,
  uciMoveToSan,
} from "@/lib/chess/san-helpers"
import { cn } from "@/lib/utils"
import { useI18n } from "@/components/i18n/i18n-provider"
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Copy,
  Cpu,
  Eye,
  EyeOff,
  RotateCcw,
  Target,
  X,
  XCircle,
} from "lucide-react"

interface MistakeReviewProps {
  sessionId: string
  eloType?: string
  failedAttempts?: PuzzleAttemptRequest[]
  initialMistakes?: SprintPuzzleAttempt[]
  onClose: () => void
}

type PracticeOutcome =
  | { kind: "correct"; chosenMove?: string }
  | { kind: "incorrect"; chosenMove?: string }

function resolveArrowDuelCandidates(
  mistake: SprintPuzzleAttempt | undefined,
  isArrowDuel: boolean,
): [string, string] | undefined {
  if (!mistake || !isArrowDuel) return undefined
  const raw = mistake.candidate_moves?.map((m) => m.trim()).filter(Boolean)
  if (raw && raw.length >= 2) {
    return deterministicArrowOrder(mistake.puzzle_id, [raw[0], raw[1]])
  }
  const best = mistake.best_move?.trim()
  const blunder = mistake.blunder_move?.trim() || mistake.solution_moves?.[0]?.trim()
  if (best && blunder && best !== blunder) {
    return deterministicArrowOrder(mistake.puzzle_id, [blunder, best])
  }
  return undefined
}

function resolveArrowDuelBestMove(
  mistake: SprintPuzzleAttempt | undefined,
  candidateMoves?: [string, string],
): string | undefined {
  if (!mistake) return undefined
  if (mistake.best_move) return mistake.best_move
  const blunder = mistake.blunder_move || mistake.solution_moves?.[0]
  if (candidateMoves && blunder) {
    return candidateMoves.find((m) => m.toLowerCase() !== blunder.toLowerCase())
  }
  return candidateMoves?.[0]
}

export function MistakeReview({
  sessionId,
  eloType,
  failedAttempts,
  initialMistakes,
  onClose,
}: MistakeReviewProps) {
  const { t } = useI18n()
  const { getSprintPuzzles, isLoading, error } = useSprintPuzzles()
  const [mistakes, setMistakes] = useState<SprintPuzzleAttempt[]>(initialMistakes ?? [])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [viewMode, setViewMode] = useState<"practice" | "analyze">("practice")
  const [resetCount, setResetCount] = useState(0)
  const [outcome, setOutcome] = useState<PracticeOutcome | null>(null)
  const [showSolution, setShowSolution] = useState(false)
  const [copied, setCopied] = useState(false)

  const chessBoardRef = useRef<ChessBoardRef>(null)

  useEffect(() => {
    preloadStockfishEngine()
  }, [])

  useEffect(() => {
    if (initialMistakes && initialMistakes.length > 0) {
      setMistakes(initialMistakes)
      return
    }

    let cancelled = false

    async function loadMistakes() {
      if (failedAttempts && failedAttempts.length > 0) {
        const convertedMistakes: SprintPuzzleAttempt[] = failedAttempts.map((attempt) => ({
          puzzle_id: attempt.puzzle_id,
          sequence_in_sprint: attempt.sequence_in_sprint,
          fen: "",
          solution_moves: [],
          rating: 0,
          themes: [],
          attempt_status: "failed" as const,
          user_moves: attempt.user_moves,
          was_correct: attempt.was_correct,
          time_taken_ms: attempt.time_taken_ms,
          attempted_at: attempt.attempted_at,
          attempt_type: attempt.attempt_type,
          candidate_moves: attempt.candidate_moves,
          chosen_move: attempt.chosen_move,
          best_move: attempt.best_move,
          blunder_move: attempt.blunder_move,
        }))

        if (!cancelled) {
          setMistakes(convertedMistakes)
        }

        const response = await getSprintPuzzles(sessionId, { status: "failed" })
        if (!cancelled && response && response.puzzles.length > 0) {
          const mergedMistakes = convertedMistakes.map((mistake) => {
            const serverPuzzle = response.puzzles.find(
              (p) => p.puzzle_id === mistake.puzzle_id,
            )
            if (serverPuzzle) {
              return {
                ...mistake,
                fen: serverPuzzle.fen,
                solution_moves: serverPuzzle.solution_moves,
                rating: serverPuzzle.rating,
                themes: serverPuzzle.themes,
                best_move: mistake.best_move || serverPuzzle.best_move,
                blunder_move: mistake.blunder_move || serverPuzzle.blunder_move,
                candidate_moves: mistake.candidate_moves || serverPuzzle.candidate_moves,
              }
            }
            return mistake
          })
          setMistakes(mergedMistakes)
        }
        return
      }

      const response = await getSprintPuzzles(sessionId, { status: "failed" })
      if (!cancelled && response && response.puzzles.length > 0) {
        setMistakes(response.puzzles)
      }
    }

    void loadMistakes()
    return () => {
      cancelled = true
    }
  }, [sessionId, getSprintPuzzles, failedAttempts, initialMistakes])

  const currentMistake = mistakes[currentIndex]

  const isArrowDuelMistake = useMemo(() => {
    if (!currentMistake) return false
    if (currentMistake.attempt_type === "arrow_duel") return true
    if (currentMistake.attempt_type === "regular") return false
    return eloType?.includes("arrowduel") ?? false
  }, [currentMistake, eloType])

  const candidateMoves = useMemo(
    () => resolveArrowDuelCandidates(currentMistake, isArrowDuelMistake),
    [currentMistake, isArrowDuelMistake],
  )

  const correctMove = useMemo(
    () => resolveArrowDuelBestMove(currentMistake, candidateMoves),
    [currentMistake, candidateMoves],
  )

  const hasInvalidArrowDuelData = useMemo(() => {
    if (!currentMistake || !isArrowDuelMistake) return false
    if (!currentMistake.fen || !candidateMoves) return true
    return !areCandidateMovesLegalOnFen(currentMistake.fen, candidateMoves)
  }, [currentMistake, isArrowDuelMistake, candidateMoves])

  const solutionSan = useMemo(() => {
    if (!currentMistake?.fen) return []
    if (isArrowDuelMistake && correctMove) {
      return [uciMoveToSan(currentMistake.fen, correctMove)]
    }
    const allSan = uciLineToSan(currentMistake.fen, currentMistake.solution_moves)
    return allSan.length > 1 ? allSan.slice(1) : allSan
  }, [currentMistake, isArrowDuelMistake, correctMove])

  const resetPuzzleState = () => {
    setOutcome(null)
    setShowSolution(false)
    setResetCount((prev) => prev + 1)
  }

  const goToIndex = (nextIndex: number) => {
    if (nextIndex < 0 || nextIndex >= mistakes.length) return
    setCurrentIndex(nextIndex)
    setViewMode("practice")
    setOutcome(null)
    setShowSolution(false)
    setResetCount((prev) => prev + 1)
  }

  const handleRegularComplete = (isCorrect: boolean) => {
    setOutcome({ kind: isCorrect ? "correct" : "incorrect" })
  }

  const handleArrowDuelChosen = (move: string) => {
    const isCorrect = Boolean(correctMove && move.toLowerCase() === correctMove.toLowerCase())
    setOutcome({ kind: isCorrect ? "correct" : "incorrect", chosenMove: move })
  }

  const handleCopyFen = async () => {
    if (!currentMistake?.fen) return
    const fen = currentMistake.fen.trim()
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(fen)
      } else {
        const ta = document.createElement("textarea")
        ta.value = fen
        document.body.appendChild(ta)
        ta.select()
        document.execCommand("copy")
        document.body.removeChild(ta)
      }
      setCopied(true)
      setTimeout(() => setCopied(false), 1200)
    } catch (copyError) {
      console.error("Copy failed", copyError)
    }
  }

  const formatTime = (ms?: number): string => {
    if (!ms || ms <= 0) return ""
    const seconds = Math.max(1, Math.round(ms / 1000))
    return `${seconds}s`
  }

  if (isLoading && mistakes.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#0B0D12] flex items-center justify-center p-4">
        <div className="rounded-2xl border border-slate-200 dark:border-[#38383A] bg-white dark:bg-[#1C1C1E] p-8 text-center max-w-md w-full shadow-sm">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-[#4DA3FF] mx-auto mb-4" />
          <p className="text-sm text-slate-600 dark:text-[#AEAEB2]">Loading your mistakes...</p>
        </div>
      </div>
    )
  }

  if (error && mistakes.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#0B0D12] flex items-center justify-center p-4">
        <div className="rounded-2xl border border-slate-200 dark:border-[#38383A] bg-white dark:bg-[#1C1C1E] p-8 text-center max-w-md w-full shadow-sm">
          <AlertTriangle className="h-8 w-8 text-red-600 dark:text-[#FF6961] mx-auto mb-3" />
          <p className="text-red-600 dark:text-[#FF6961] font-medium mb-1">Failed to load mistakes</p>
          <p className="text-slate-600 dark:text-[#AEAEB2] text-sm mb-4">{error}</p>
          <Button
            onClick={onClose}
            variant="outline"
            className="border-slate-200 dark:border-[#38383A] bg-white dark:bg-[#262628] text-slate-700 dark:text-[#F2F2F7]"
          >
            Close
          </Button>
        </div>
      </div>
    )
  }

  if (mistakes.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#0B0D12] flex items-center justify-center p-4">
        <div className="rounded-2xl border border-slate-200 dark:border-[#38383A] bg-white dark:bg-[#1C1C1E] p-8 text-center max-w-md w-full shadow-sm">
          <Target className="h-8 w-8 text-emerald-600 dark:text-[#4CD964] mx-auto mb-3" />
          <p className="text-slate-900 dark:text-[#F2F2F7] font-medium mb-1">No mistakes to review!</p>
          <p className="text-slate-600 dark:text-[#AEAEB2] text-sm mb-4">
            You did not make any mistakes in this sprint.
          </p>
          <Button
            onClick={onClose}
            variant="outline"
            className="border-slate-200 dark:border-[#38383A] bg-white dark:bg-[#262628] text-slate-700 dark:text-[#F2F2F7]"
          >
            Close
          </Button>
        </div>
      </div>
    )
  }

  // Stage 2: Focused Browser Stockfish Analyzer (unified with History & Review)
  if (viewMode === "analyze" && currentMistake?.fen) {
    return (
      <MobileLayout fullHeight>
        <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-[#0B0D12]">
          <Navigation />
          <MobileContainer padding="lg" className="flex-1 pb-24 lg:pb-8">
            <div className="max-w-[1020px] mx-auto space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 dark:border-[#38383A] bg-white dark:bg-[#1C1C1E] px-3 py-2 shadow-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setViewMode("practice")}
                    className="h-8 px-2.5 border-slate-200 dark:border-[#38383A] bg-white dark:bg-[#262628] text-slate-700 dark:text-[#F2F2F7]"
                  >
                    <ArrowLeft className="h-4 w-4 mr-1.5" />
                    {t("common.backToPractice")}
                  </Button>
                  <Badge
                    variant="outline"
                    className="border-slate-200 dark:border-[#38383A] text-slate-700 dark:text-[#D1D1D6] tabular-nums text-xs"
                  >
                    Puzzle {currentIndex + 1} of {mistakes.length}
                  </Badge>
                </div>

                <div className="flex items-center gap-1.5">
                  {mistakes.length > 1 && (
                    <>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={currentIndex === 0}
                        onClick={() => goToIndex(currentIndex - 1)}
                        className="h-8 px-2 border-slate-200 dark:border-[#38383A] bg-white dark:bg-[#262628] text-slate-700 dark:text-[#F2F2F7]"
                        aria-label="Previous mistake"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={currentIndex === mistakes.length - 1}
                        onClick={() => goToIndex(currentIndex + 1)}
                        className="h-8 px-2 border-slate-200 dark:border-[#38383A] bg-white dark:bg-[#262628] text-slate-700 dark:text-[#F2F2F7]"
                        aria-label="Next mistake"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={onClose}
                    className="h-8 px-2.5 text-slate-600 dark:text-[#AEAEB2] hover:text-slate-900 dark:hover:text-white"
                  >
                    <X className="h-4 w-4 mr-1" />
                    {t("common.close")}
                  </Button>
                </div>
              </div>

              <PositionAnalyzerPanel
                key={`analyze-${currentMistake.puzzle_id}-${currentIndex}`}
                fen={currentMistake.fen}
                mode={isArrowDuelMistake ? "arrow_duel" : "regular"}
                solutionMoves={currentMistake.solution_moves}
                userMoves={currentMistake.user_moves}
                chosenMove={currentMistake.chosen_move}
                correctMove={correctMove}
                themes={currentMistake.themes}
                rating={currentMistake.rating}
              />
            </div>
          </MobileContainer>
        </div>
      </MobileLayout>
    )
  }

  // Stage 1: Responsive 2-column landscape on PC/iPad; single-screen compact portrait on mobile
  return (
    <MobileLayout fullHeight>
      <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-[#0B0D12]">
        <Navigation />
        <MobileContainer padding="lg" className="flex-1 pb-24 lg:pb-8">
          <div className="max-w-[540px] lg:max-w-[1020px] mx-auto flex flex-col gap-2 lg:grid lg:grid-cols-[minmax(440px,620px)_minmax(320px,380px)] lg:grid-rows-[auto_auto_1fr] lg:gap-x-5 lg:gap-y-3 lg:justify-center lg:items-start">
        {/* Slim Top Bar (Top on mobile; Right rail top on PC/iPad landscape) */}
        <div className="lg:col-start-2 lg:row-start-1 flex items-center justify-between gap-2 rounded-xl border border-slate-200 dark:border-[#38383A] bg-white dark:bg-[#1C1C1E] px-2.5 sm:px-3 py-2 shadow-xs">
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClose}
              aria-label={t("common.back")}
              className="text-slate-600 dark:text-[#AEAEB2] hover:text-slate-900 dark:hover:text-white px-1.5 sm:px-2 h-8 shrink-0"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline lg:hidden ml-1">{t("common.back")}</span>
            </Button>
            <div className="flex items-center gap-1.5 lg:flex-col lg:items-start lg:gap-0 min-w-0">
              <h1 className="text-sm font-semibold text-slate-900 dark:text-[#F2F2F7] truncate">
                {t("reviewQueue.reviewMistakes")}
              </h1>
              <span className="text-[11px] font-medium text-slate-500 dark:text-[#AEAEB2] tabular-nums whitespace-nowrap">
                Puzzle {currentIndex + 1} of {mistakes.length}
              </span>
            </div>
          </div>

          <Button
            type="button"
            size="sm"
            disabled={!currentMistake?.fen}
            onClick={() => setViewMode("analyze")}
            className="h-8 px-2.5 sm:px-3 bg-blue-600 hover:bg-blue-700 dark:bg-[#0A6FE0] dark:hover:bg-[#1980F5] text-white shrink-0"
          >
            <Cpu className="h-3.5 w-3.5 mr-1 sm:mr-1.5" />
            {t("common.analyze")}
          </Button>
        </div>

        {/* Turn / Arrow Duel Indicator */}
        {currentMistake?.fen && (
          <div className="lg:col-start-2 lg:row-start-2">
            {isArrowDuelMistake ? (
              <ArrowDuelIndicator fen={currentMistake.fen} />
            ) : (
              <TurnIndicator fen={currentMistake.fen} />
            )}
          </div>
        )}

        {/* Hero Interactive Chessboard (Left column on PC) */}
        <div className="lg:col-start-1 lg:row-start-1 lg:row-span-3">
          {currentMistake?.fen ? (
            <div className="rounded-2xl border border-slate-200 dark:border-[#38383A] bg-white dark:bg-[#1C1C1E] p-1.5 sm:p-2.5 shadow-sm">
              <ChessBoard
                ref={chessBoardRef}
                key={`${currentMistake.puzzle_id}-${currentIndex}-${resetCount}`}
                fen={currentMistake.fen}
                solutionMoves={currentMistake.solution_moves ?? []}
                disabled={outcome !== null || hasInvalidArrowDuelData}
                mode={
                  isArrowDuelMistake && !hasInvalidArrowDuelData
                    ? "arrowduel"
                    : "puzzle"
                }
                candidateMoves={hasInvalidArrowDuelData ? undefined : candidateMoves}
                bestMove={hasInvalidArrowDuelData ? undefined : correctMove}
                blunderMove={
                  hasInvalidArrowDuelData
                    ? undefined
                    : candidateMoves?.find((m) => m.toLowerCase() !== correctMove?.toLowerCase())
                }
                onPuzzleComplete={handleRegularComplete}
                onMoveChosen={handleArrowDuelChosen}
              />
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-200 dark:border-[#38383A] bg-white dark:bg-[#1C1C1E] p-10 text-center text-sm text-slate-500 dark:text-[#AEAEB2]">
              Loading puzzle position...
            </div>
          )}
        </div>

        {/* Lower Controls, Feedback, Metadata & Navigation (Below board on mobile; Right rail on PC) */}
        <div className="lg:col-start-2 lg:row-start-3 space-y-2.5">
          {/* Corrupted Arrow Duel Data Guard */}
          {hasInvalidArrowDuelData && (
            <div className="rounded-xl border border-amber-200 dark:border-amber-800/80 bg-amber-50 dark:bg-amber-950/40 p-3 flex items-center justify-between gap-2.5">
              <div className="flex items-start gap-2 text-sm text-amber-900 dark:text-[#FFB340]">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold">Arrow Duel candidates unavailable</div>
                  <div className="text-xs opacity-90">
                    Open Analyze to inspect this position with Stockfish.
                  </div>
                </div>
              </div>
              <Button
                type="button"
                size="sm"
                onClick={() => setViewMode("analyze")}
                className="shrink-0 bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Cpu className="h-3.5 w-3.5 mr-1.5" />
                {t("common.analyze")}
              </Button>
            </div>
          )}

          {/* Outcome Banner (Correct / Incorrect) with Retry + Analyze */}
          {outcome && (
            <div
              className={cn(
                "rounded-xl border px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2",
                outcome.kind === "correct"
                  ? "border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-[#4CD964]"
                  : "border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/40 text-red-900 dark:text-[#FF6961]",
              )}
            >
              <div className="flex items-center gap-2 text-sm font-medium min-w-0">
                {outcome.kind === "correct" ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                ) : (
                  <XCircle className="h-4 w-4 shrink-0" />
                )}
                <span className="truncate">
                  {outcome.kind === "correct"
                    ? `${t("common.solved")}!`
                    : outcome.chosenMove && currentMistake?.fen
                      ? `Tried ${uciMoveToSan(currentMistake.fen, outcome.chosenMove)}, try again`
                      : "Not quite, try again"}
                </span>
              </div>
              <div className="flex items-center gap-1.5 ml-auto shrink-0">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={resetPuzzleState}
                  className="h-8 px-2.5 text-xs bg-white dark:bg-[#1C1C1E] border-slate-200 dark:border-[#38383A] text-slate-700 dark:text-[#F2F2F7]"
                >
                  <RotateCcw className="h-3.5 w-3.5 mr-1" />
                  {t("common.tryAgain")}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => setViewMode("analyze")}
                  className="h-8 px-2.5 text-xs bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Cpu className="h-3.5 w-3.5 mr-1" />
                  {t("common.analyze")}
                </Button>
              </div>
            </div>
          )}

          {/* Optional Revealed Solution Line */}
          {showSolution && solutionSan.length > 0 && (
            <div className="rounded-xl border border-slate-200 dark:border-[#38383A] bg-white dark:bg-[#1C1C1E] px-3.5 py-2.5 text-xs sm:text-sm text-slate-700 dark:text-[#D1D1D6]">
              <span className="font-semibold text-slate-900 dark:text-[#F2F2F7] mr-2">
                {t("common.solution")}:
              </span>
              <span className="font-mono">{solutionSan.join(" ")}</span>
            </div>
          )}

          {/* Slim Metadata + Practice Controls Strip */}
          <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs text-slate-500 dark:text-[#AEAEB2]">
            <div className="flex items-center gap-2 min-w-0 tabular-nums">
              <Badge
                variant="secondary"
                className="bg-slate-100 dark:bg-[#2C2C2E] text-slate-700 dark:text-[#D1D1D6] text-[11px] font-medium"
              >
                {isArrowDuelMistake ? t("common.arrowDuel") : t("common.regularPuzzle")}
              </Badge>
              {currentMistake?.rating ? <span>Elo {currentMistake.rating}</span> : null}
              {formatTime(currentMistake?.time_taken_ms) ? (
                <span className="inline-flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatTime(currentMistake.time_taken_ms)}
                </span>
              ) : null}
            </div>

            <div className="flex items-center gap-1 ml-auto shrink-0">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={resetPuzzleState}
                className="h-7 px-2 text-xs text-slate-600 dark:text-[#AEAEB2] hover:text-slate-900 dark:hover:text-white"
              >
                <RotateCcw className="h-3.5 w-3.5 mr-1" />
                {t("common.reset")}
              </Button>
              {solutionSan.length > 0 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowSolution((prev) => !prev)}
                  className="h-7 px-2 text-xs text-slate-600 dark:text-[#AEAEB2] hover:text-slate-900 dark:hover:text-white"
                >
                  {showSolution ? (
                    <>
                      <EyeOff className="h-3.5 w-3.5 mr-1" />
                      {t("common.hide")}
                    </>
                  ) : (
                    <>
                      <Eye className="h-3.5 w-3.5 mr-1" />
                      {t("common.solution")}
                    </>
                  )}
                </Button>
              )}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleCopyFen}
                disabled={!currentMistake?.fen}
                aria-label="Copy FEN"
                title="Copy FEN"
                className="h-7 w-7 p-0 text-slate-600 dark:text-[#AEAEB2] hover:text-slate-900 dark:hover:text-white"
              >
                {copied ? (
                  <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-[#4CD964]" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </Button>
            </div>
          </div>

          {/* Previous / Next Navigation */}
          {mistakes.length > 1 && (
            <div className="flex items-center gap-2 pt-0.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={currentIndex === 0}
                onClick={() => goToIndex(currentIndex - 1)}
                className="flex-1 h-9 border-slate-200 dark:border-[#38383A] bg-white dark:bg-[#1C1C1E] text-slate-700 dark:text-[#F2F2F7]"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                {t("common.previous")}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={currentIndex === mistakes.length - 1}
                onClick={() => goToIndex(currentIndex + 1)}
                className="flex-1 h-9 border-slate-200 dark:border-[#38383A] bg-white dark:bg-[#1C1C1E] text-slate-700 dark:text-[#F2F2F7]"
              >
                {t("common.next")}
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          )}
        </div>
      </div>
        </MobileContainer>
      </div>
    </MobileLayout>
  )
}
