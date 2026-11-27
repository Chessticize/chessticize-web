"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Cpu,
  Eye,
  EyeOff,
  RotateCcw,
  XCircle,
} from "lucide-react"
import { ChessBoard, type ChessBoardRef } from "@/components/puzzle-sprint/ChessBoard"
import { ArrowDuelIndicator, TurnIndicator } from "@/components/puzzle-sprint/SprintIndicators"
import { preloadStockfishEngine } from "@/hooks/useStockfish"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { V2AttemptHistoryItem } from "@/lib/api/library"
import {
  areCandidateMovesLegalOnFen,
  deterministicArrowOrder,
  uciLineToSan,
  uciMoveToSan,
} from "@/lib/chess/san-helpers"
import { cn } from "@/lib/utils"
import { useI18n } from "@/components/i18n/i18n-provider"

interface HistoryPuzzlePracticeProps {
  attempt: V2AttemptHistoryItem
  relativeTimestamp?: string
  onBack: () => void
  onAnalyze: () => void
}

type PracticeOutcome =
  | { kind: "correct"; chosenMove?: string }
  | { kind: "incorrect"; chosenMove?: string }

function resolveCandidateMoves(attempt: V2AttemptHistoryItem): [string, string] | undefined {
  if (attempt.mode !== "arrow_duel") return undefined
  const raw = attempt.candidate_moves
    ?.map((entry) => entry.move.trim())
    .filter(Boolean)
  if (raw && raw.length >= 2) {
    return deterministicArrowOrder(attempt.puzzle_id || attempt.attempt_id, [raw[0], raw[1]])
  }
  if (attempt.chosen_move && attempt.correct_move && attempt.chosen_move !== attempt.correct_move) {
    return deterministicArrowOrder(attempt.puzzle_id || attempt.attempt_id, [
      attempt.chosen_move,
      attempt.correct_move,
    ])
  }
  return undefined
}

function resolveCorrectMove(
  attempt: V2AttemptHistoryItem,
  candidateMoves?: [string, string],
): string | undefined {
  if (attempt.correct_move) return attempt.correct_move
  const bestCandidate = attempt.candidate_moves?.find((c) => c.kind === "best")?.move
  if (bestCandidate) return bestCandidate
  return candidateMoves?.[0]
}

export function HistoryPuzzlePractice({
  attempt,
  relativeTimestamp,
  onBack,
  onAnalyze,
}: HistoryPuzzlePracticeProps) {
  const { t } = useI18n()
  const chessBoardRef = useRef<ChessBoardRef>(null)

  const [resetCount, setResetCount] = useState(0)
  const [outcome, setOutcome] = useState<PracticeOutcome | null>(null)
  const [showSolution, setShowSolution] = useState(false)

  useEffect(() => {
    preloadStockfishEngine()
  }, [])

  const candidateMoves = useMemo(() => resolveCandidateMoves(attempt), [attempt])
  const correctMove = useMemo(
    () => resolveCorrectMove(attempt, candidateMoves),
    [attempt, candidateMoves],
  )

  const hasInvalidArrowDuelData = useMemo(() => {
    if (attempt.mode !== "arrow_duel") return false
    if (!attempt.fen || !candidateMoves) return true
    return !areCandidateMovesLegalOnFen(attempt.fen, candidateMoves)
  }, [attempt.mode, attempt.fen, candidateMoves])

  const solutionSan = useMemo(() => {
    if (!attempt.fen) return []
    if (attempt.mode === "arrow_duel" && correctMove) {
      return [uciMoveToSan(attempt.fen, correctMove)]
    }
    const allSan = uciLineToSan(attempt.fen, attempt.solution_moves)
    return allSan.length > 1 ? allSan.slice(1) : allSan
  }, [attempt.fen, attempt.mode, attempt.solution_moves, correctMove])

  const handleReset = () => {
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

  return (
    <div className="max-w-[540px] lg:max-w-[1020px] mx-auto flex flex-col gap-2 lg:grid lg:grid-cols-[minmax(440px,620px)_minmax(320px,380px)] lg:grid-rows-[auto_auto_1fr] lg:gap-x-5 lg:gap-y-3 lg:justify-center lg:items-start mb-4 lg:mb-6">
      {/* Slim Top Bar (Top on mobile; Right rail top on PC/iPad landscape) */}
      <div className="lg:col-start-2 lg:row-start-1 flex items-center justify-between gap-2 rounded-xl border border-slate-200 dark:border-[#38383A] bg-white dark:bg-[#1C1C1E] px-2.5 sm:px-3 py-2 shadow-xs">
        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="text-slate-600 dark:text-[#AEAEB2] hover:text-slate-900 dark:hover:text-white px-1.5 sm:px-2 h-8 shrink-0"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            {t("nav.history")}
          </Button>
          <Badge
            className={cn(
              "text-[11px] shrink-0",
              attempt.was_correct
                ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-[#4CD964] border border-emerald-200 dark:border-emerald-800"
                : "bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-[#FF6961] border border-red-200 dark:border-red-800",
            )}
          >
            {attempt.was_correct ? t("common.solved") : t("common.missed")}
          </Badge>
          {relativeTimestamp ? (
            <span className="hidden sm:inline text-xs text-slate-500 dark:text-[#AEAEB2] truncate">
              {relativeTimestamp}
            </span>
          ) : null}
        </div>

        <Button
          type="button"
          size="sm"
          onClick={onAnalyze}
          className="h-8 px-2.5 sm:px-3 bg-blue-600 hover:bg-blue-700 dark:bg-[#0A6FE0] dark:hover:bg-[#1980F5] text-white shrink-0"
        >
          <Cpu className="h-3.5 w-3.5 mr-1 sm:mr-1.5" />
          {t("common.analyze")}
        </Button>
      </div>

      {/* Turn / Arrow Duel Indicator */}
      {attempt.fen && (
        <div className="lg:col-start-2 lg:row-start-2">
          {attempt.mode === "arrow_duel" ? (
            <ArrowDuelIndicator fen={attempt.fen} />
          ) : (
            <TurnIndicator fen={attempt.fen} />
          )}
        </div>
      )}

      {/* Hero Interactive Free-Solve Chessboard (Left column on PC) */}
      <div className="lg:col-start-1 lg:row-start-1 lg:row-span-3 rounded-2xl border border-slate-200 dark:border-[#38383A] bg-white dark:bg-[#1C1C1E] p-1.5 sm:p-2.5 shadow-sm">
        <ChessBoard
          ref={chessBoardRef}
          key={`${attempt.attempt_id}-${resetCount}`}
          fen={attempt.fen || ""}
          solutionMoves={attempt.solution_moves ?? []}
          disabled={outcome !== null || hasInvalidArrowDuelData}
          mode={
            attempt.mode === "arrow_duel" && !hasInvalidArrowDuelData
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
          onPuzzleComplete={handleRegularComplete}
          onMoveChosen={handleArrowDuelChosen}
        />
      </div>

      {/* Lower Controls, Feedback & Metadata (Below board on mobile; Right rail on PC) */}
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
              onClick={onAnalyze}
              className="shrink-0 bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Cpu className="h-3.5 w-3.5 mr-1.5" />
              {t("common.analyze")}
            </Button>
          </div>
        )}

        {/* Outcome Banner (Correct / Incorrect) with Retry + Analysis */}
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
                  : outcome.chosenMove && attempt.fen
                    ? `Tried ${uciMoveToSan(attempt.fen, outcome.chosenMove)}, try again`
                    : "Not quite, try again"}
              </span>
            </div>
            <div className="flex items-center gap-1.5 ml-auto shrink-0">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleReset}
                className="h-8 px-2.5 text-xs bg-white dark:bg-[#1C1C1E] border-slate-200 dark:border-[#38383A] text-slate-700 dark:text-[#F2F2F7]"
              >
                <RotateCcw className="h-3.5 w-3.5 mr-1" />
                {t("common.tryAgain")}
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={onAnalyze}
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

        {/* Slim Metadata + Practice Controls */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs text-slate-500 dark:text-[#AEAEB2]">
          <div className="flex items-center gap-1.5 min-w-0">
            <Badge
              variant="secondary"
              className="bg-slate-100 dark:bg-[#2C2C2E] text-slate-700 dark:text-[#D1D1D6] text-[11px] font-medium"
            >
              {attempt.puzzle_source === "user_game" ? t("common.yourGame") : t("nav.puzzleSprint")}
            </Badge>
            {attempt.rating ? <span className="tabular-nums">Elo {attempt.rating}</span> : null}
          </div>

          <div className="flex items-center gap-1.5 ml-auto shrink-0">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleReset}
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
          </div>
        </div>
      </div>
    </div>
  )
}
