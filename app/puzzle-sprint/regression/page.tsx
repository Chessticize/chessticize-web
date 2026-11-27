"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import {
  ArrowLeft,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Cpu,
  Eye,
  EyeOff,
  FlaskConical,
  ListChecks,
  RotateCcw,
  Swords,
  XCircle,
} from "lucide-react"
import Navigation from "@/components/navigation"
import Footer from "@/components/footer"
import { MobileContainer, MobileLayout } from "@/components/ui/mobile-layout"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ChessBoard, type ChessBoardRef } from "@/components/puzzle-sprint/ChessBoard"
import { ArrowDuelIndicator, TurnIndicator } from "@/components/puzzle-sprint/SprintIndicators"
import { PositionAnalyzerPanel } from "@/components/chess/PositionAnalyzerPanel"
import { MistakeReview } from "@/components/puzzle-sprint/MistakeReview"
import { preloadStockfishEngine } from "@/hooks/useStockfish"
import {
  STAGING_REGRESSION_PUZZLES,
  toRegressionMistakeAttempts,
} from "@/lib/regression-puzzles"
import { useIsStagingEnvironment } from "@/lib/staging"
import { deterministicArrowOrder, uciLineToSan, uciMoveToSan } from "@/lib/chess/san-helpers"
import { cn } from "@/lib/utils"

type PracticeOutcome =
  | { kind: "correct"; chosenMove?: string }
  | { kind: "incorrect"; chosenMove?: string }

export default function StagingRegressionSuitePage() {
  const isStaging = useIsStagingEnvironment()
  const chessBoardRef = useRef<ChessBoardRef>(null)

  useEffect(() => {
    if (isStaging) {
      preloadStockfishEngine()
    }
  }, [isStaging])

  const [selectedIndex, setSelectedIndex] = useState(0)
  const [viewMode, setViewMode] = useState<"practice" | "analyze" | "mistake-review">("practice")
  const [resetCount, setResetCount] = useState(0)
  const [outcome, setOutcome] = useState<PracticeOutcome | null>(null)
  const [showSolution, setShowSolution] = useState(false)
  const [solvedIds, setSolvedIds] = useState<Record<string, boolean>>({})

  const sample = STAGING_REGRESSION_PUZZLES[selectedIndex] ?? STAGING_REGRESSION_PUZZLES[0]

  const candidateMoves = useMemo(() => {
    if (sample.mode !== "arrow_duel" || !sample.candidateMoves) return undefined
    return deterministicArrowOrder(sample.id, sample.candidateMoves)
  }, [sample])

  const solutionSan = useMemo(() => {
    if (sample.mode === "arrow_duel" && sample.bestMove) {
      return [uciMoveToSan(sample.fen, sample.bestMove)]
    }
    const allSan = uciLineToSan(sample.fen, sample.solutionMoves)
    return allSan.length > 1 ? allSan.slice(1) : allSan
  }, [sample])

  const regressionMistakes = useMemo(() => toRegressionMistakeAttempts(), [])

  if (!isStaging) {
    return (
      <MobileLayout fullHeight>
        <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-[#0B0D12]">
          <Navigation />
          <MobileContainer padding="lg" className="flex-1 flex items-center justify-center">
            <div className="max-w-md w-full rounded-2xl border border-slate-200 dark:border-[#38383A] bg-white dark:bg-[#1C1C1E] p-6 text-center space-y-3 shadow-sm">
              <FlaskConical className="h-8 w-8 mx-auto text-slate-400 dark:text-[#8E8E93]" />
              <h1 className="text-lg font-semibold text-slate-900 dark:text-[#F2F2F7]">
                Not Available
              </h1>
              <p className="text-sm text-slate-500 dark:text-[#AEAEB2]">
                The interactive regression suite is only enabled on staging and local environments.
              </p>
              <Link href="/puzzle-sprint" className="inline-block pt-1">
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
                  Back to Puzzle Sprint
                </Button>
              </Link>
            </div>
          </MobileContainer>
          <Footer hideOnMobile={true} />
        </div>
      </MobileLayout>
    )
  }

  if (viewMode === "mistake-review") {
    return (
      <MistakeReview
        sessionId="staging-regression-local"
        initialMistakes={regressionMistakes}
        onClose={() => setViewMode("practice")}
      />
    )
  }

  const selectPuzzle = (nextIndex: number) => {
    if (nextIndex < 0 || nextIndex >= STAGING_REGRESSION_PUZZLES.length) return
    setSelectedIndex(nextIndex)
    setViewMode("practice")
    setOutcome(null)
    setShowSolution(false)
    setResetCount((prev) => prev + 1)
  }

  const handleReset = () => {
    setOutcome(null)
    setShowSolution(false)
    setResetCount((prev) => prev + 1)
  }

  const handleRegularComplete = (isCorrect: boolean) => {
    setOutcome({ kind: isCorrect ? "correct" : "incorrect" })
    if (isCorrect) {
      setSolvedIds((prev) => ({ ...prev, [sample.id]: true }))
    }
  }

  const handleArrowDuelChosen = (move: string) => {
    const isCorrect = Boolean(
      sample.bestMove && move.toLowerCase() === sample.bestMove.toLowerCase(),
    )
    setOutcome({ kind: isCorrect ? "correct" : "incorrect", chosenMove: move })
    if (isCorrect) {
      setSolvedIds((prev) => ({ ...prev, [sample.id]: true }))
    }
  }

  return (
    <MobileLayout fullHeight>
      <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-[#0B0D12]">
        <Navigation />

        <MobileContainer padding="lg" className="flex-1 pb-24 sm:pb-8">
          {/* Staging Header */}
          <div className="max-w-5xl mx-auto mb-4 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <Link href="/puzzle-sprint">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 text-slate-600 dark:text-[#AEAEB2] hover:text-slate-900 dark:hover:text-white"
                >
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  Back
                </Button>
              </Link>
              <div className="flex items-center gap-2 min-w-0">
                <FlaskConical className="h-4 w-4 text-amber-600 dark:text-[#FFB340] shrink-0" />
                <h1 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-[#F2F2F7] truncate">
                  Staging Regression Suite
                </h1>
                <Badge className="bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-[#FFB340] border border-amber-200 dark:border-amber-800 text-[11px] shrink-0">
                  Staging Only
                </Badge>
              </div>
            </div>

            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setViewMode("mistake-review")}
              className="h-8 px-3 border-slate-200 dark:border-[#38383A] bg-white dark:bg-[#1C1C1E] text-slate-700 dark:text-[#F2F2F7] text-xs"
            >
              <ListChecks className="h-3.5 w-3.5 mr-1.5" />
              Test Mistake Review
            </Button>
          </div>

          {/* Horizontal Puzzle Selector Strip */}
          <div className="max-w-5xl mx-auto mb-5 flex flex-wrap gap-1.5">
            {STAGING_REGRESSION_PUZZLES.map((item, idx) => {
              const active = idx === selectedIndex
              const solved = Boolean(solvedIds[item.id])
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => selectPuzzle(idx)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors",
                    active
                      ? "border-blue-500 dark:border-[#4DA3FF] bg-blue-600 dark:bg-[#0A6FE0] text-white"
                      : "border-slate-200 dark:border-[#38383A] bg-white dark:bg-[#1C1C1E] text-slate-700 dark:text-[#D1D1D6] hover:border-blue-300 dark:hover:border-[#2463A8]",
                  )}
                >
                  {solved ? (
                    <CheckCircle2
                      className={cn(
                        "h-3.5 w-3.5 shrink-0",
                        active ? "text-white" : "text-emerald-600 dark:text-[#4CD964]",
                      )}
                    />
                  ) : item.mode === "arrow_duel" ? (
                    <Swords className="h-3.5 w-3.5 shrink-0 opacity-80" />
                  ) : null}
                  <span>
                    {idx + 1}. {item.title}
                  </span>
                </button>
              )
            })}
          </div>

          {viewMode === "analyze" ? (
            <div className="max-w-[1020px] mx-auto space-y-4">
              <div className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 dark:border-[#38383A] bg-white dark:bg-[#1C1C1E] px-3 py-2 shadow-xs">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setViewMode("practice")}
                  className="h-8 px-2.5 border-slate-200 dark:border-[#38383A] bg-white dark:bg-[#262628] text-slate-700 dark:text-[#F2F2F7]"
                >
                  <ArrowLeft className="h-4 w-4 mr-1.5" />
                  Back to Practice
                </Button>
                <span className="text-xs sm:text-sm font-medium text-slate-700 dark:text-[#D1D1D6] truncate">
                  {sample.title}
                </span>
              </div>

              <PositionAnalyzerPanel
                key={`reg-analyze-${sample.id}`}
                fen={sample.fen}
                mode={sample.mode}
                solutionMoves={sample.solutionMoves}
                correctMove={sample.bestMove}
                themes={sample.themes}
                rating={sample.rating}
              />
            </div>
          ) : (
            <div className="max-w-[540px] lg:max-w-[1020px] mx-auto flex flex-col gap-2 lg:grid lg:grid-cols-[minmax(440px,620px)_minmax(320px,380px)] lg:grid-rows-[auto_auto_1fr] lg:gap-x-5 lg:gap-y-3 lg:justify-center lg:items-start">
              {/* Slim Top Bar */}
              <div className="lg:col-start-2 lg:row-start-1 flex items-center justify-between gap-2 rounded-xl border border-slate-200 dark:border-[#38383A] bg-white dark:bg-[#1C1C1E] px-3 py-2 shadow-xs">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-900 dark:text-[#F2F2F7] truncate">
                      {sample.title}
                    </span>
                    <Badge
                      variant="outline"
                      className="border-slate-200 dark:border-[#38383A] text-slate-600 dark:text-[#AEAEB2] text-[11px] tabular-nums shrink-0"
                    >
                      {selectedIndex + 1}/{STAGING_REGRESSION_PUZZLES.length}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-[#AEAEB2] mt-0.5">
                    {sample.description}
                  </p>
                </div>

                <Button
                  type="button"
                  size="sm"
                  onClick={() => setViewMode("analyze")}
                  className="h-8 px-3 bg-blue-600 hover:bg-blue-700 dark:bg-[#0A6FE0] dark:hover:bg-[#1980F5] text-white shrink-0"
                >
                  <Cpu className="h-3.5 w-3.5 mr-1.5" />
                  Analyze
                </Button>
              </div>

              {/* Turn / Arrow Duel Indicator */}
              <div className="lg:col-start-2 lg:row-start-2">
                {sample.mode === "arrow_duel" ? (
                  <ArrowDuelIndicator fen={sample.fen} />
                ) : (
                  <TurnIndicator fen={sample.fen} />
                )}
              </div>

              {/* Hero ChessBoard */}
              <div className="lg:col-start-1 lg:row-start-1 lg:row-span-3 rounded-2xl border border-slate-200 dark:border-[#38383A] bg-white dark:bg-[#1C1C1E] p-1.5 sm:p-2.5 shadow-sm">
                <ChessBoard
                  ref={chessBoardRef}
                  key={`reg-${sample.id}-${resetCount}`}
                  fen={sample.fen}
                  solutionMoves={sample.solutionMoves}
                  disabled={outcome !== null}
                  mode={sample.mode === "arrow_duel" ? "arrowduel" : "puzzle"}
                  candidateMoves={candidateMoves}
                  bestMove={sample.bestMove}
                  blunderMove={sample.blunderMove}
                  onPuzzleComplete={handleRegularComplete}
                  onMoveChosen={handleArrowDuelChosen}
                />
              </div>

              {/* Lower Controls Stack */}
              <div className="lg:col-start-2 lg:row-start-3 space-y-2.5">
                {/* Outcome Banner */}
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
                          ? "Solved!"
                          : outcome.chosenMove
                            ? `Tried ${uciMoveToSan(sample.fen, outcome.chosenMove)}, try again`
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
                        Try Again
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => setViewMode("analyze")}
                        className="h-8 px-2.5 text-xs bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        <Cpu className="h-3.5 w-3.5 mr-1" />
                        Analyze
                      </Button>
                    </div>
                  </div>
                )}

                {/* Revealed Solution */}
                {showSolution && solutionSan.length > 0 && (
                  <div className="rounded-xl border border-slate-200 dark:border-[#38383A] bg-white dark:bg-[#1C1C1E] px-3.5 py-2.5 text-xs sm:text-sm text-slate-700 dark:text-[#D1D1D6]">
                    <span className="font-semibold text-slate-900 dark:text-[#F2F2F7] mr-2">
                      Solution:
                    </span>
                    <span className="font-mono">{solutionSan.join(" ")}</span>
                  </div>
                )}

                {/* Bottom Controls */}
                <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs text-slate-500 dark:text-[#AEAEB2]">
                  <div className="flex items-center gap-2 tabular-nums">
                    <Badge
                      variant="secondary"
                      className="bg-slate-100 dark:bg-[#2C2C2E] text-slate-700 dark:text-[#D1D1D6] text-[11px]"
                    >
                      {sample.mode === "arrow_duel" ? "Arrow Duel" : "Regular Puzzle"}
                    </Badge>
                    <span>Elo {sample.rating}</span>
                    <span className="font-mono opacity-75">#{sample.id}</span>
                  </div>

                  <div className="flex items-center gap-1 ml-auto">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleReset}
                      className="h-7 px-2 text-xs text-slate-600 dark:text-[#AEAEB2] hover:text-slate-900 dark:hover:text-white"
                    >
                      <RotateCcw className="h-3.5 w-3.5 mr-1" />
                      Reset
                    </Button>
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
                          Hide
                        </>
                      ) : (
                        <>
                          <Eye className="h-3.5 w-3.5 mr-1" />
                          Solution
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                {/* Prev / Next */}
                <div className="flex items-center gap-2 pt-0.5">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={selectedIndex === 0}
                    onClick={() => selectPuzzle(selectedIndex - 1)}
                    className="flex-1 h-9 border-slate-200 dark:border-[#38383A] bg-white dark:bg-[#1C1C1E] text-slate-700 dark:text-[#F2F2F7]"
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Previous
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={selectedIndex === STAGING_REGRESSION_PUZZLES.length - 1}
                    onClick={() => selectPuzzle(selectedIndex + 1)}
                    className="flex-1 h-9 border-slate-200 dark:border-[#38383A] bg-white dark:bg-[#1C1C1E] text-slate-700 dark:text-[#F2F2F7]"
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </MobileContainer>

        <Footer hideOnMobile={true} />
      </div>
    </MobileLayout>
  )
}
