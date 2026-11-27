"use client"

import { useCallback, useMemo, useRef, useState } from "react"
import { ChessBoard, type ChessBoardRef } from "@/components/puzzle-sprint/ChessBoard"
import { InteractiveAnalysis } from "@/components/puzzle-sprint/InteractiveAnalysis"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { RotateCcw, Undo2, Eye, EyeOff } from "lucide-react"
import { getAnalysisStartFen, uciLineToSan, uciMoveToSan } from "@/lib/chess/san-helpers"
import { getArrowDuelActiveColor, getPuzzlePlayerColor } from "@/lib/chess/board-helpers"
import { useI18n } from "@/components/i18n/i18n-provider"

interface PositionAnalyzerPanelProps {
  fen: string
  mode: "regular" | "arrow_duel"
  solutionMoves?: string[]
  userMoves?: string[]
  chosenMove?: string | null
  correctMove?: string
  themes?: string[]
  rating?: number
  onClose?: () => void
}

export function PositionAnalyzerPanel({
  fen,
  mode,
  solutionMoves,
  userMoves,
  chosenMove,
  correctMove,
  themes,
  rating,
  onClose,
}: PositionAnalyzerPanelProps) {
  const { t, getThemeName } = useI18n()
  const boardRef = useRef<ChessBoardRef>(null)
  const initialFen = useMemo(
    () => getAnalysisStartFen(fen, mode, solutionMoves),
    [fen, mode, solutionMoves],
  )
  const orientation = useMemo(
    () =>
      mode === "arrow_duel"
        ? getArrowDuelActiveColor(fen)
        : getPuzzlePlayerColor(fen),
    [fen, mode],
  )

  const [historyFens, setHistoryFens] = useState<string[]>([initialFen])
  const [analysisLines, setAnalysisLines] = useState<
    Array<{
      moves: string[]
      uciMoves?: string[]
      evaluation: number
      depth: number
      pv: string
      multipv?: number
      isMate?: boolean
      mateIn?: number
    }>
  >([])
  const [showArrows, setShowArrows] = useState(true)

  const currentFen = historyFens[historyFens.length - 1] ?? initialFen
  const canMoveBack = historyFens.length > 1

  const solutionSan = useMemo(() => {
    if (mode === "arrow_duel" && correctMove) {
      return [uciMoveToSan(fen, correctMove)]
    }
    const allSan = uciLineToSan(fen, solutionMoves)
    // For standard puzzles, solutionMoves[0] is opponent's setup move
    return allSan.length > 1 ? allSan.slice(1) : allSan
  }, [fen, mode, solutionMoves, correctMove])

  const playerSan = useMemo(() => {
    if (mode === "arrow_duel" && chosenMove) {
      return [uciMoveToSan(fen, chosenMove)]
    }
    if (!userMoves || userMoves.length === 0) return []
    return userMoves.map((m) => uciMoveToSan(initialFen, m))
  }, [fen, initialFen, mode, chosenMove, userMoves])

  const handlePositionChange = useCallback((newFen: string) => {
    setHistoryFens((prev) =>
      prev[prev.length - 1] === newFen ? prev : [...prev, newFen],
    )
  }, [])

  const handleMakeMove = useCallback((uciMove: string) => {
    boardRef.current?.makeMove(uciMove)
  }, [])

  const handleMoveBack = useCallback(() => {
    setHistoryFens((prev) => {
      if (prev.length <= 1) return prev
      const next = prev.slice(0, -1)
      const targetFen = next[next.length - 1]
      if (targetFen) {
        boardRef.current?.setPosition(targetFen)
      }
      return next
    })
  }, [])

  const handleReset = useCallback(() => {
    setHistoryFens([initialFen])
    boardRef.current?.setPosition(initialFen)
  }, [initialFen])

  return (
    <div className="space-y-4">
      <div className="grid gap-5 lg:grid-cols-[minmax(440px,620px)_minmax(300px,380px)] lg:justify-center items-start">
        <div className="space-y-3">
          <div className="rounded-2xl border border-slate-200 dark:border-[#38383A] bg-white dark:bg-[#1C1C1E] p-2 sm:p-2.5 shadow-sm">
            <ChessBoard
              ref={boardRef}
              key={initialFen}
              fen={initialFen}
              mode="analysis"
              orientation={orientation}
              analysisLines={analysisLines}
              showAnalysisArrows={showArrows}
              onPositionChange={handlePositionChange}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!canMoveBack}
              onClick={handleMoveBack}
              className="border-slate-200 dark:border-[#38383A] bg-white dark:bg-[#262628] text-slate-700 dark:text-[#F2F2F7]"
            >
              <Undo2 className="h-3.5 w-3.5 mr-1.5" />
              {t("common.back")}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!canMoveBack}
              onClick={handleReset}
              className="border-slate-200 dark:border-[#38383A] bg-white dark:bg-[#262628] text-slate-700 dark:text-[#F2F2F7]"
            >
              <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
              {t("common.reset")}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowArrows((v) => !v)}
              className="border-slate-200 dark:border-[#38383A] bg-white dark:bg-[#262628] text-slate-700 dark:text-[#F2F2F7]"
            >
              {showArrows ? (
                <Eye className="h-3.5 w-3.5 mr-1.5" />
              ) : (
                <EyeOff className="h-3.5 w-3.5 mr-1.5" />
              )}
              {showArrows ? t("analyzer.arrowsOn") : t("analyzer.arrowsOff")}
            </Button>
            {onClose && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="ml-auto text-slate-600 dark:text-[#AEAEB2]"
              >
                {t("common.close")}
              </Button>
            )}
          </div>
        </div>

        <div className="space-y-4">
          {/* Solution & Move Comparison */}
          <div className="rounded-xl border border-slate-200 dark:border-[#38383A] bg-white dark:bg-[#1C1C1E] p-4 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant="secondary"
                className="bg-slate-100 dark:bg-[#2C2C2E] text-slate-700 dark:text-[#D1D1D6]"
              >
                {mode === "arrow_duel" ? t("common.arrowDuel") : t("reviewQueue.regular")}
              </Badge>
              {rating ? (
                <Badge
                  variant="outline"
                  className="border-slate-200 dark:border-[#38383A] text-slate-700 dark:text-[#D1D1D6] tabular-nums"
                >
                  Elo {rating}
                </Badge>
              ) : null}
              {themes?.slice(0, 4).map((theme) => (
                <Badge
                  key={theme}
                  variant="outline"
                  className="border-blue-200 dark:border-[#16467A] bg-blue-50/70 dark:bg-[#0B2A4D]/60 text-blue-700 dark:text-[#4DA3FF]"
                >
                  {getThemeName(theme)}
                </Badge>
              ))}
            </div>

            {solutionSan.length > 0 && (
              <div className="text-sm">
                <span className="text-slate-500 dark:text-[#AEAEB2] font-medium mr-2">
                  {t("analyzer.bestLine")}
                </span>
                <span className="font-mono font-semibold text-emerald-700 dark:text-[#4CD964]">
                  {solutionSan.join(" → ")}
                </span>
              </div>
            )}

            {playerSan.length > 0 && (
              <div className="text-sm">
                <span className="text-slate-500 dark:text-[#AEAEB2] font-medium mr-2">
                  {t("analyzer.yourMove")}
                </span>
                <span className="font-mono text-slate-800 dark:text-[#F2F2F7]">
                  {playerSan.join(" → ")}
                </span>
              </div>
            )}
          </div>

          <InteractiveAnalysis
            fen={currentFen}
            onMakeMove={handleMakeMove}
            onAnalysisUpdate={setAnalysisLines}
          />
        </div>
      </div>
    </div>
  )
}
