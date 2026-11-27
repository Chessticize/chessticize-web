"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  Clock,
  History,
  Loader2,
  Swords,
  Target,
  XCircle,
} from "lucide-react"
import Navigation from "@/components/navigation"
import Footer from "@/components/footer"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { MobileContainer, MobileLayout } from "@/components/ui/mobile-layout"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { PositionAnalyzerPanel } from "@/components/chess/PositionAnalyzerPanel"
import { HistoryPuzzlePractice } from "@/components/history/HistoryPuzzlePractice"
import {
  listMyAttempts,
  type V2AttemptHistoryItem,
} from "@/lib/api/library"
import {
  mergeAttemptHistory,
  readLocalAttemptHistory,
} from "@/lib/storage/local-attempt-history"
import { useUserContext } from "@/hooks/useUserContext"
import { useI18n } from "@/components/i18n/i18n-provider"
import { cn } from "@/lib/utils"

type ResultFilter = "all" | "correct" | "incorrect"
type ContextFilter = "all" | "sprint" | "review"
type ModeFilter = "all" | "regular" | "arrow_duel"

export default function PuzzleHistoryPage() {
  const { t, locale } = useI18n()
  const { user, isLoading: isLoadingUser } = useUserContext()

  const [resultFilter, setResultFilter] = useState<ResultFilter>("all")
  const [contextFilter, setContextFilter] = useState<ContextFilter>("all")
  const [modeFilter, setModeFilter] = useState<ModeFilter>("all")
  const [remoteAttempts, setRemoteAttempts] = useState<V2AttemptHistoryItem[]>([])
  const [localAttempts, setLocalAttempts] = useState<V2AttemptHistoryItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedAttempt, setSelectedAttempt] = useState<V2AttemptHistoryItem | null>(null)
  const [detailView, setDetailView] = useState<"practice" | "analyze">("practice")

  const openAttempt = (attempt: V2AttemptHistoryItem) => {
    setSelectedAttempt(attempt)
    setDetailView("practice")
  }

  const closeAttempt = () => {
    setSelectedAttempt(null)
    setDetailView("practice")
  }

  useEffect(() => {
    setLocalAttempts(readLocalAttemptHistory())
  }, [])

  useEffect(() => {
    if (!user?.id) return
    let cancelled = false

    const loadHistory = async () => {
      try {
        setIsLoading(true)
        const response = await listMyAttempts({
          context: contextFilter === "all" ? undefined : contextFilter,
          mode: modeFilter === "all" ? undefined : modeFilter,
          result: resultFilter === "all" ? undefined : resultFilter,
          limit: 50,
          offset: 0,
        })
        if (!cancelled) {
          setRemoteAttempts(response.attempts ?? [])
        }
      } catch {
        // Gracefully fall back to local recent attempts if backend endpoint is not deployed yet
        if (!cancelled) {
          setRemoteAttempts([])
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    void loadHistory()
    return () => {
      cancelled = true
    }
  }, [user?.id, contextFilter, modeFilter, resultFilter])

  const filteredAttempts = useMemo(() => {
    const merged = mergeAttemptHistory(remoteAttempts, localAttempts)
    return merged.filter((item) => {
      if (resultFilter === "correct" && !item.was_correct) return false
      if (resultFilter === "incorrect" && item.was_correct) return false
      if (contextFilter !== "all" && item.context !== contextFilter) return false
      if (modeFilter !== "all" && item.mode !== modeFilter) return false
      return true
    })
  }, [remoteAttempts, localAttempts, resultFilter, contextFilter, modeFilter])

  const summary = useMemo(() => {
    const total = filteredAttempts.length
    const solved = filteredAttempts.filter((item) => item.was_correct).length
    const accuracy = total > 0 ? Math.round((solved / total) * 100) : 0
    return { total, solved, missed: total - solved, accuracy }
  }, [filteredAttempts])

  return (
    <ProtectedRoute>
      <MobileLayout fullHeight>
        <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-[#0B0D12]">
          <Navigation />

          <MobileContainer padding="lg" className="flex-1 pb-24 sm:pb-8">
            {selectedAttempt ? (
              selectedAttempt.fen ? (
                detailView === "practice" ? (
                  <HistoryPuzzlePractice
                    attempt={selectedAttempt}
                    relativeTimestamp={formatRelativeTimestamp(selectedAttempt.attempted_at, t, locale)}
                    onBack={closeAttempt}
                    onAnalyze={() => setDetailView("analyze")}
                  />
                ) : (
                  <div className="max-w-[1020px] mx-auto space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setDetailView("practice")}
                          className="border-slate-200 dark:border-[#38383A] bg-white dark:bg-[#1C1C1E] text-slate-700 dark:text-[#F2F2F7]"
                        >
                          <ArrowLeft className="h-4 w-4 mr-1.5" />
                          {t("common.backToPractice")}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={closeAttempt}
                          className="text-slate-500 dark:text-[#AEAEB2] hover:text-slate-900 dark:hover:text-white"
                        >
                          {t("nav.history")}
                        </Button>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          className={
                            selectedAttempt.was_correct
                              ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-[#4CD964] border border-emerald-200 dark:border-emerald-800"
                              : "bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-[#FF6961] border border-red-200 dark:border-red-800"
                          }
                        >
                          {selectedAttempt.was_correct ? t("common.solved") : t("common.missed")}
                        </Badge>
                        <span className="text-xs text-slate-500 dark:text-[#AEAEB2]">
                          {formatRelativeTimestamp(selectedAttempt.attempted_at, t, locale)}
                        </span>
                      </div>
                    </div>

                    <PositionAnalyzerPanel
                      fen={selectedAttempt.fen}
                      mode={selectedAttempt.mode}
                      solutionMoves={selectedAttempt.solution_moves}
                      userMoves={selectedAttempt.user_moves}
                      chosenMove={selectedAttempt.chosen_move}
                      correctMove={selectedAttempt.correct_move}
                      themes={selectedAttempt.themes}
                      rating={selectedAttempt.rating}
                    />
                  </div>
                )
              ) : (
                <div className="space-y-4">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={closeAttempt}
                    className="border-slate-200 dark:border-[#38383A] bg-white dark:bg-[#1C1C1E] text-slate-700 dark:text-[#F2F2F7]"
                  >
                    <ArrowLeft className="h-4 w-4 mr-1.5" />
                    {t("history.backToHistory")}
                  </Button>
                  <Card className="bg-white dark:bg-[#1C1C1E] border-slate-200 dark:border-[#38383A]">
                    <CardContent className="p-8 text-center text-sm text-slate-500 dark:text-[#AEAEB2]">
                      Position FEN is not available for this attempt.
                    </CardContent>
                  </Card>
                </div>
              )
            ) : (
              <>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900 dark:text-[#F2F2F7]">
                      {t("history.title")}
                    </h1>
                    <p className="text-sm sm:text-base text-slate-500 dark:text-[#AEAEB2] mt-1">
                      {t("history.subtitle")}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
                    <div className="inline-flex items-center gap-1.5 rounded-full bg-white dark:bg-[#1C1C1E] border border-slate-200 dark:border-[#38383A] px-3 py-1.5 text-xs sm:text-sm font-medium text-slate-700 dark:text-[#D1D1D6] tabular-nums">
                      <History className="h-3.5 w-3.5 text-blue-600 dark:text-[#4DA3FF]" />
                      <span>{t("history.attemptsCount", { count: summary.total })}</span>
                    </div>
                    {summary.total > 0 && (
                      <div className="inline-flex items-center gap-1.5 rounded-full bg-white dark:bg-[#1C1C1E] border border-slate-200 dark:border-[#38383A] px-3 py-1.5 text-xs sm:text-sm font-medium text-slate-700 dark:text-[#D1D1D6] tabular-nums">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-[#4CD964]" />
                        <span>{t("reviewQueue.accuracyPercent", { percent: summary.accuracy })}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Clean Pill Filter Bar */}
                <div className="mb-5 flex flex-wrap items-center gap-3">
                  <SegmentedPills
                    label={t("history.resultFilter")}
                    value={resultFilter}
                    onChange={setResultFilter}
                    options={[
                      { value: "all", label: t("common.all") },
                      { value: "incorrect", label: t("common.missed") },
                      { value: "correct", label: t("common.solved") },
                    ]}
                  />
                  <SegmentedPills
                    label={t("history.sourceFilter")}
                    value={contextFilter}
                    onChange={setContextFilter}
                    options={[
                      { value: "all", label: t("common.all") },
                      { value: "sprint", label: t("history.sprintSource") },
                      { value: "review", label: t("history.reviewSource") },
                    ]}
                  />
                  <SegmentedPills
                    label={t("history.modeFilter")}
                    value={modeFilter}
                    onChange={setModeFilter}
                    options={[
                      { value: "all", label: t("common.all") },
                      { value: "regular", label: t("reviewQueue.regular") },
                      { value: "arrow_duel", label: t("common.arrowDuel") },
                    ]}
                  />
                </div>

                <Card className="bg-white dark:bg-[#1C1C1E] border-slate-200 dark:border-[#38383A] shadow-sm overflow-hidden">
                  <CardContent className="p-0">
                    {isLoadingUser || (isLoading && filteredAttempts.length === 0) ? (
                      <div className="flex items-center justify-center gap-2 p-10 text-slate-500 dark:text-[#AEAEB2]">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span>{t("history.loading")}</span>
                      </div>
                    ) : filteredAttempts.length === 0 ? (
                      <div className="p-10 text-center space-y-3">
                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 dark:bg-[#262628] text-slate-500 dark:text-[#AEAEB2]">
                          <History className="h-6 w-6" />
                        </div>
                        <h2 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-[#F2F2F7]">
                          {t("history.emptyTitle")}
                        </h2>
                        <p className="text-sm text-slate-500 dark:text-[#AEAEB2] max-w-md mx-auto">
                          {t("history.emptyDesc")}
                        </p>
                        <div className="flex items-center justify-center gap-2 pt-2">
                          <Link href="/puzzle-sprint">
                            <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
                              <Target className="h-4 w-4 mr-1.5" />
                              {t("history.startSprint")}
                            </Button>
                          </Link>
                          <Link href="/review-queue">
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-slate-200 dark:border-[#38383A] bg-white dark:bg-[#262628] text-slate-700 dark:text-[#F2F2F7]"
                            >
                              {t("history.openReview")}
                            </Button>
                          </Link>
                        </div>
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-100 dark:divide-[#2C2C2E]">
                        {filteredAttempts.map((item) => {
                          const modeTitle =
                            item.mode === "arrow_duel"
                              ? t("common.arrowDuel")
                              : t("common.regularPuzzle")
                          const resultLabel = item.was_correct ? t("common.solved") : t("common.missed")

                          return (
                            <button
                              key={item.attempt_id}
                              type="button"
                              onClick={() => openAttempt(item)}
                              className="w-full text-left flex items-center gap-3.5 p-4 hover:bg-slate-50 dark:hover:bg-[#262628] transition-colors group"
                            >
                              <div
                                className={cn(
                                  "flex h-10 w-10 items-center justify-center rounded-xl shrink-0 border",
                                  item.was_correct
                                    ? "bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800/80 text-emerald-600 dark:text-[#4CD964]"
                                    : "bg-red-50 dark:bg-red-950/50 border-red-200 dark:border-red-800/80 text-red-600 dark:text-[#FF6961]",
                                )}
                              >
                                {item.was_correct ? (
                                  <CheckCircle2 className="h-5 w-5" />
                                ) : (
                                  <XCircle className="h-5 w-5" />
                                )}
                              </div>

                              <div className="flex-1 min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="font-semibold text-sm sm:text-base text-slate-900 dark:text-[#F2F2F7] inline-flex items-center gap-1.5">
                                    {item.mode === "arrow_duel" && (
                                      <Swords className="h-3.5 w-3.5 text-blue-600 dark:text-[#4DA3FF] shrink-0" />
                                    )}
                                    {modeTitle}
                                  </span>
                                  <span
                                    className={cn(
                                      "text-xs font-medium",
                                      item.was_correct
                                        ? "text-emerald-700 dark:text-[#4CD964]"
                                        : "text-red-600 dark:text-[#FF6961]",
                                    )}
                                  >
                                    {resultLabel}
                                  </span>
                                  <Badge
                                    variant="outline"
                                    className="border-slate-200 dark:border-[#38383A] text-slate-600 dark:text-[#AEAEB2] text-[11px]"
                                  >
                                    {item.context === "review" ? t("history.reviewSource") : t("history.sprintSource")}
                                  </Badge>
                                  {item.puzzle_source === "user_game" && (
                                    <Badge
                                      variant="outline"
                                      className="border-blue-200 dark:border-[#16467A] bg-blue-50/60 dark:bg-[#0B2A4D]/60 text-blue-700 dark:text-[#4DA3FF] text-[11px]"
                                    >
                                      {t("common.yourGame")}
                                    </Badge>
                                  )}
                                </div>

                                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-[#AEAEB2] tabular-nums">
                                  {item.rating ? <span>Elo {item.rating}</span> : null}
                                  {typeof item.time_taken_ms === "number" && item.time_taken_ms > 0 ? (
                                    <span className="inline-flex items-center gap-1">
                                      <Clock className="h-3 w-3" />
                                      {(item.time_taken_ms / 1000).toFixed(1)}s
                                    </span>
                                  ) : null}
                                  <span>{formatRelativeTimestamp(item.attempted_at, t, locale)}</span>
                                </div>
                              </div>

                              <ChevronRight className="h-4 w-4 text-slate-400 dark:text-[#8E8E93] group-hover:text-blue-600 dark:group-hover:text-[#4DA3FF] shrink-0" />
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </MobileContainer>

          <Footer hideOnMobile={true} />
        </div>
      </MobileLayout>
    </ProtectedRoute>
  )
}

function SegmentedPills<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: T
  onChange: (next: T) => void
  options: ReadonlyArray<{ value: T; label: string }>
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className="inline-flex items-center rounded-lg bg-white dark:bg-[#1C1C1E] border border-slate-200 dark:border-[#38383A] p-0.5 shadow-2xs"
    >
      {options.map((opt) => {
        const active = opt.value === value
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={cn(
              "px-2.5 py-1 rounded-md text-xs font-medium transition-colors",
              active
                ? "bg-blue-600 text-white"
                : "text-slate-600 dark:text-[#AEAEB2] hover:text-slate-900 dark:hover:text-white",
            )}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}

function formatRelativeTimestamp(
  iso: string,
  t: ReturnType<typeof useI18n>["t"],
  locale: string,
): string {
  const timestamp = new Date(iso).getTime()
  if (!Number.isFinite(timestamp)) return ""
  const diffMs = Date.now() - timestamp
  const diffMinutes = Math.floor(diffMs / 60000)
  if (diffMinutes < 1) return t("history.justNow")
  if (diffMinutes < 60) return t("history.minutesAgo", { count: diffMinutes })
  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) return t("history.hoursAgo", { count: diffHours })
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 7) return t("history.daysAgo", { count: diffDays })
  return new Intl.DateTimeFormat(locale, { month: "short", day: "numeric" }).format(
    new Date(timestamp),
  )
}
