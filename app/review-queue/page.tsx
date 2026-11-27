"use client"

import { Suspense, useCallback, useEffect, useMemo, useState, type FormEvent } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import {
  Brain,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Filter,
  Loader2,
  Play,
  Search,
  Swords,
} from "lucide-react"
import Navigation from "@/components/navigation"
import Footer from "@/components/footer"
import { ReviewSession } from "@/components/review-queue/ReviewSession"
import { MobileContainer, MobileLayout } from "@/components/ui/mobile-layout"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import {
  drawReviewQueuePuzzles,
  getAttemptStats,
  getReviewQueueStats,
  listReviewQueueItems,
  type V2ReviewQueueListResponse,
  type V2ReviewQueuePuzzle,
  type V2ReviewQueueStatsResponse,
} from "@/lib/api/library"
import { useUserContext } from "@/hooks/useUserContext"
import { useI18n } from "@/components/i18n/i18n-provider"
import { cn } from "@/lib/utils"

const PAGE_SIZE = 20
const DRAW_LIMIT = 5

type ReviewMode = "" | "regular" | "arrow_duel"
type PuzzleSourceFilter = "" | "user_game" | "lichess"
type DueFilter = "now" | "all"
type ReviewFilters = {
  mode: ReviewMode
  puzzleSource: PuzzleSourceFilter
  due: DueFilter
  themeGroups: string[]
}

const THEME_SCOPE_OPTIONS = [
  { value: "", label: "All" },
  { value: "missed_opportunity", label: "Missed Opportunity" },
  { value: "caught_opportunity", label: "Caught Opportunity" },
  { value: "missed_attack", label: "Missed Attack" },
  { value: "caught_attack", label: "Caught Attack" },
  { value: "own_mistake_punished", label: "Own Mistake Punished" },
  { value: "own_mistake_escaped", label: "Own Mistake Escaped" },
  { value: "missed_opportunity,missed_attack", label: "Missed Opportunities & Attacks" },
  { value: "missed_attack,own_mistake_punished", label: "My Mistakes" },
]
const VALID_THEME_GROUPS = new Set(
  THEME_SCOPE_OPTIONS.flatMap((option) => option.value.split(",").filter(Boolean)),
)

export default function ReviewQueuePage() {
  return (
    <Suspense fallback={<ReviewQueueShellFallback />}>
      <ReviewQueueContent />
    </Suspense>
  )
}

function ReviewQueueContent() {
  const { t, locale, getThemeName } = useI18n()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const initialMode = toReviewMode(searchParams.get("mode"))
  const initialPuzzleSource = toPuzzleSourceFilter(searchParams.get("puzzle_source"))
  const initialDue = toDueFilter(searchParams.get("due"))
  const initialThemeGroups =
    initialPuzzleSource === "lichess"
      ? []
      : parseThemeGroups(searchParams.get("theme_groups"))
  const initialOffset = normalizeOffset(searchParams.get("offset"))
  const hasInitialAdvancedFilters = Boolean(
    initialMode || initialPuzzleSource || initialThemeGroups.length > 0 || initialDue !== "now",
  )

  const { user, isLoading: isLoadingUser, error: userError } = useUserContext()
  const [mode, setMode] = useState<ReviewMode>(initialMode)
  const [puzzleSource, setPuzzleSource] = useState<PuzzleSourceFilter>(initialPuzzleSource)
  const [due, setDue] = useState<DueFilter>(initialDue)
  const [themeScope, setThemeScope] = useState(initialThemeGroups.join(","))
  const [filters, setFilters] = useState<ReviewFilters>({
    mode: initialMode,
    puzzleSource: initialPuzzleSource,
    due: initialDue,
    themeGroups: initialThemeGroups,
  })
  const [filtersOpen, setFiltersOpen] = useState(hasInitialAdvancedFilters)
  const [offset, setOffset] = useState(initialOffset)
  const [stats, setStats] = useState<V2ReviewQueueStatsResponse | null>(null)
  const [todaySummary, setTodaySummary] = useState<{
    reviewed: number
    correct: number
  }>({ reviewed: 0, correct: 0 })
  const [data, setData] = useState<V2ReviewQueueListResponse | null>(null)
  const [drawnPuzzles, setDrawnPuzzles] = useState<V2ReviewQueuePuzzle[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isDrawing, setIsDrawing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [drawError, setDrawError] = useState<string | null>(null)
  const [queueVersion, setQueueVersion] = useState(0)

  const refreshQueue = useCallback(() => {
    setQueueVersion((version) => version + 1)
  }, [])

  useEffect(() => {
    if (!user?.id) return

    let cancelled = false
    const loadReviewQueue = async () => {
      try {
        setIsLoading(true)
        setError(null)
        const scopedThemeGroups = themeGroupsParam(filters.puzzleSource, filters.themeGroups)
        const startOfLocalToday = new Date()
        startOfLocalToday.setHours(0, 0, 0, 0)

        const [nextStats, nextItems, nextTodayAttempts] = await Promise.all([
          getReviewQueueStats({
            mode: filters.mode || undefined,
            puzzle_source: filters.puzzleSource || undefined,
            theme_groups: scopedThemeGroups,
          }),
          listReviewQueueItems({
            mode: filters.mode || undefined,
            puzzle_source: filters.puzzleSource || undefined,
            due: filters.due,
            theme_groups: scopedThemeGroups,
            offset,
            limit: PAGE_SIZE,
          }),
          getAttemptStats({
            context: "review",
            from: startOfLocalToday.toISOString(),
            mode: filters.mode || undefined,
            puzzle_source: filters.puzzleSource || undefined,
          }).catch(() => null),
        ])

        if (!cancelled) {
          setStats(nextStats)
          setData(nextItems)
          setTodaySummary({
            reviewed: nextTodayAttempts?.summary?.attempt_count ?? 0,
            correct: nextTodayAttempts?.summary?.correct_count ?? 0,
          })
        }
      } catch (loadError) {
        if (!cancelled) {
          setStats(null)
          setData(null)
          setError(
            loadError instanceof Error ? loadError.message : "Failed to load review queue",
          )
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    void loadReviewQueue()

    return () => {
      cancelled = true
    }
  }, [user?.id, filters, offset, queueVersion])

  const totalCount = data?.total_count ?? 0
  const items = data?.items ?? []
  const dueNow = stats?.due_now ?? 0
  const totalQueued = stats?.total_queued ?? 0
  const scheduledLater = Math.max(0, totalQueued - dueNow)
  const hasNextPage = offset + PAGE_SIZE < totalCount
  const pageStart = totalCount === 0 ? 0 : offset + 1
  const pageEnd = Math.min(offset + PAGE_SIZE, totalCount)

  const hasLoadedStats = stats !== null
  const todayTotal = todaySummary.reviewed + dueNow
  const todayProgressPercent = !hasLoadedStats
    ? 0
    : todayTotal > 0
      ? Math.round((todaySummary.reviewed / todayTotal) * 100)
      : 100
  const todayAccuracy =
    todaySummary.reviewed > 0
      ? Math.round((todaySummary.correct / todaySummary.reviewed) * 100)
      : null

  const activeFilterCount = useMemo(
    () =>
      [
        filters.mode,
        filters.puzzleSource,
        filters.due !== "now" ? filters.due : "",
        filters.themeGroups.length > 0 ? "theme_groups" : "",
      ].filter(Boolean).length,
    [filters],
  )

  const applyFilters = (event: FormEvent) => {
    event.preventDefault()
    const nextThemeGroups =
      puzzleSource === "lichess" ? [] : parseThemeGroups(themeScope)
    const nextFilters = {
      mode,
      puzzleSource,
      due,
      themeGroups: nextThemeGroups,
    }
    setFilters(nextFilters)
    if (puzzleSource === "lichess") {
      setThemeScope("")
    }
    setOffset(0)
    setDrawnPuzzles([])
    router.replace(buildReviewQueueURL(pathname, nextFilters, 0), { scroll: false })
  }

  const switchScheduleTab = (nextDue: DueFilter) => {
    setDue(nextDue)
    const nextFilters = { ...filters, due: nextDue }
    setFilters(nextFilters)
    setOffset(0)
    setDrawnPuzzles([])
    router.replace(buildReviewQueueURL(pathname, nextFilters, 0), { scroll: false })
  }

  const clearFilters = () => {
    const nextFilters: ReviewFilters = {
      mode: "",
      puzzleSource: "",
      due: "now",
      themeGroups: [],
    }
    setMode("")
    setPuzzleSource("")
    setDue("now")
    setThemeScope("")
    setFilters(nextFilters)
    setOffset(0)
    setDrawnPuzzles([])
    router.replace(pathname, { scroll: false })
  }

  const updatePuzzleSource = (value: PuzzleSourceFilter) => {
    setPuzzleSource(value)
    if (value === "lichess") {
      setThemeScope("")
    }
  }

  const startReview = async () => {
    try {
      setIsDrawing(true)
      setDrawError(null)
      const response = await drawReviewQueuePuzzles({
        mode: filters.mode || undefined,
        puzzle_source: filters.puzzleSource || undefined,
        limit: DRAW_LIMIT,
        theme_groups: themeGroupsParam(
          filters.puzzleSource,
          filters.themeGroups,
        )?.split(","),
      })
      setDrawnPuzzles(response.puzzles)
    } catch (loadError) {
      setDrawnPuzzles([])
      setDrawError(
        loadError instanceof Error ? loadError.message : "Failed to start review",
      )
    } finally {
      setIsDrawing(false)
    }
  }

  const goToOffset = (nextOffset: number) => {
    const normalizedOffset = Math.max(0, nextOffset)
    setOffset(normalizedOffset)
    setDrawnPuzzles([])
    router.replace(buildReviewQueueURL(pathname, filters, normalizedOffset), {
      scroll: false,
    })
  }

  const inActiveSession = drawnPuzzles.length > 0

  return (
    <MobileLayout fullHeight>
      <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-[#0B0D12]">
        <Navigation />
        <MobileContainer padding="lg" className="flex-1">
          {inActiveSession ? (
            <ReviewSession
              puzzles={drawnPuzzles}
              onQueueChanged={refreshQueue}
              onExit={() => setDrawnPuzzles([])}
              onStartNextBatch={startReview}
              hasMoreDue={dueNow > 0}
            />
          ) : (
            <>
              {/* Clean Top-Level Review Header (Independent from Game Analysis) */}
              <div className="mb-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900 dark:text-[#F2F2F7]">
                      {t("reviewQueue.title")}
                    </h1>
                    <p className="text-sm sm:text-base text-slate-500 dark:text-[#AEAEB2] mt-1">
                      {t("reviewQueue.subtitle")}
                    </p>
                  </div>
                  <div
                    className={cn(
                      "inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border self-start sm:self-auto text-sm font-medium tabular-nums",
                      dueNow > 0
                        ? "bg-blue-50 dark:bg-[#0B2A4D] border-blue-200 dark:border-[#16467A] text-blue-700 dark:text-[#4DA3FF]"
                        : "bg-white dark:bg-[#1C1C1E] border-slate-200 dark:border-[#38383A] text-slate-600 dark:text-[#AEAEB2] shadow-xs",
                    )}
                  >
                    <Brain
                      className={cn(
                        "h-4 w-4",
                        dueNow > 0
                          ? "text-blue-600 dark:text-[#4DA3FF]"
                          : "text-slate-400 dark:text-[#8E8E93]",
                      )}
                    />
                    <span>{t("reviewQueue.dueNowCount", { count: dueNow.toLocaleString() })}</span>
                  </div>
                </div>
              </div>

              {userError && (
                <div className="mb-6 rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/50 p-4 text-sm text-red-800 dark:text-[#FF6961]">
                  {userError}
                </div>
              )}

              {isLoadingUser ? (
                <LoadingState label={t("common.loading")} />
              ) : !user?.id ? (
                <EmptyState
                  title="Sign in to view review schedule"
                  message="Your spaced-repetition review positions appear here after sign-in."
                />
              ) : (
                <>
                  {/* Today's Progress + Primary Start Review Hero Card */}
                  <Card
                    className={cn(
                      "mb-6 shadow-sm",
                      dueNow > 0
                        ? "bg-blue-50/60 dark:bg-[#0B2A4D]/60 border-blue-200 dark:border-[#16467A]"
                        : "bg-white dark:bg-[#1C1C1E] border-slate-200 dark:border-[#38383A]",
                    )}
                  >
                    <CardContent className="p-5 sm:p-6">
                      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                        <div className="space-y-3 flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2.5">
                            <span className="text-sm font-semibold text-slate-900 dark:text-[#F2F2F7]">
                              {t("reviewQueue.todayProgress")}
                            </span>
                            {dueNow === 0 && totalQueued > 0 && (
                              <Badge className="bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-[#4CD964] border border-emerald-200 dark:border-emerald-800">
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                {t("reviewQueue.caughtUp")}
                              </Badge>
                            )}
                          </div>

                          <div className="flex flex-wrap items-baseline gap-x-5 gap-y-1 tabular-nums">
                            <div>
                              <span className="text-2xl sm:text-3xl font-semibold text-slate-900 dark:text-[#F2F2F7]">
                                {todaySummary.reviewed.toLocaleString()}
                              </span>
                              <span className="ml-1.5 text-sm text-slate-600 dark:text-[#AEAEB2]">
                                {t("reviewQueue.doneToday")}
                              </span>
                            </div>
                            <div className="text-slate-300 dark:text-[#48484A]">·</div>
                            <div>
                              <span
                                className={cn(
                                  "text-2xl sm:text-3xl font-semibold",
                                  dueNow > 0
                                    ? "text-blue-700 dark:text-[#4DA3FF]"
                                    : "text-emerald-600 dark:text-[#4CD964]",
                                )}
                              >
                                {dueNow.toLocaleString()}
                              </span>
                              <span className="ml-1.5 text-sm text-slate-600 dark:text-[#AEAEB2]">
                                {t("reviewQueue.remaining")}
                              </span>
                            </div>
                            {todayAccuracy !== null && (
                              <>
                                <div className="text-slate-300 dark:text-[#48484A]">·</div>
                                <div className="text-sm text-slate-600 dark:text-[#AEAEB2]">
                                  {t("reviewQueue.accuracyPercent", { percent: todayAccuracy })}
                                </div>
                              </>
                            )}
                          </div>

                          {/* Progress bar */}
                          <div className="max-w-md space-y-1">
                            <div className="h-2 w-full rounded-full bg-white/80 dark:bg-[#262628] border border-slate-200/70 dark:border-[#38383A] overflow-hidden">
                              <div
                                className={cn(
                                  "h-full rounded-full transition-all duration-300",
                                  hasLoadedStats && dueNow === 0
                                    ? "bg-emerald-500 dark:bg-[#4CD964]"
                                    : "bg-blue-600 dark:bg-[#0A6FE0]",
                                )}
                                style={{ width: `${todayProgressPercent}%` }}
                              />
                            </div>
                            <p className="text-xs text-slate-500 dark:text-[#AEAEB2]">
                              {t("reviewQueue.filterHint")}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-col items-stretch sm:items-end gap-2 shrink-0">
                          <Button
                            onClick={startReview}
                            disabled={isDrawing || isLoading || dueNow === 0}
                            size="lg"
                            className="bg-blue-600 hover:bg-blue-700 dark:bg-[#0A6FE0] dark:hover:bg-[#1980F5] text-white px-6 shadow-xs"
                          >
                            {isDrawing ? (
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                              <Play className="h-4 w-4 mr-2" />
                            )}
                            {t("reviewQueue.startReview")}
                          </Button>
                          {drawError && (
                            <p className="text-xs text-red-700 dark:text-[#FF6961]">{drawError}</p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Queue Breakdown KPI Strip */}
                  <StatsGrid stats={stats} scheduledLater={scheduledLater} />

                  {/* Schedule Tabs + Collapsible Filters Bar */}
                  <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div
                      role="tablist"
                      aria-label="Review schedule view"
                      className="inline-flex rounded-xl bg-white dark:bg-[#1C1C1E] border border-slate-200 dark:border-[#38383A] p-1 self-start shadow-2xs"
                    >
                      <button
                        type="button"
                        role="tab"
                        aria-selected={filters.due === "now"}
                        onClick={() => switchScheduleTab("now")}
                        className={cn(
                          "px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors tabular-nums",
                          filters.due === "now"
                            ? "bg-blue-600 text-white shadow-2xs"
                            : "text-slate-600 dark:text-[#AEAEB2] hover:text-slate-900 dark:hover:text-white",
                        )}
                      >
                        {t("reviewQueue.dueNowTab", { count: dueNow.toLocaleString() })}
                      </button>
                      <button
                        type="button"
                        role="tab"
                        aria-selected={filters.due === "all"}
                        onClick={() => switchScheduleTab("all")}
                        className={cn(
                          "px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors tabular-nums",
                          filters.due === "all"
                            ? "bg-blue-600 text-white shadow-2xs"
                            : "text-slate-600 dark:text-[#AEAEB2] hover:text-slate-900 dark:hover:text-white",
                        )}
                      >
                        {t("reviewQueue.allScheduledTab", { count: totalQueued.toLocaleString() })}
                      </button>
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setFiltersOpen((open) => !open)}
                      aria-expanded={filtersOpen}
                      className="self-start sm:self-auto border-slate-200 dark:border-[#38383A] bg-white dark:bg-[#1C1C1E] text-slate-700 dark:text-[#F2F2F7] hover:bg-slate-50 dark:hover:bg-[#2C2C2E]"
                    >
                      <Filter className="h-3.5 w-3.5 mr-1.5 text-slate-500 dark:text-[#AEAEB2]" />
                      <span>{t("reviewQueue.filters")}</span>
                      {activeFilterCount > 0 && (
                        <Badge
                          variant="secondary"
                          className="ml-1.5 bg-blue-50 dark:bg-[#0B2A4D] text-blue-700 dark:text-[#4DA3FF] px-1.5 py-0 text-[11px]"
                        >
                          {activeFilterCount}
                        </Badge>
                      )}
                      {filtersOpen ? (
                        <ChevronUp className="h-3.5 w-3.5 ml-1.5" />
                      ) : (
                        <ChevronDown className="h-3.5 w-3.5 ml-1.5" />
                      )}
                    </Button>
                  </div>

                  {/* Collapsible Filters Card with Balanced 12-Col Grid (No Right-Edge Overflow) */}
                  {filtersOpen && (
                    <Card className="mb-6 bg-white dark:bg-[#1C1C1E] border-slate-200 dark:border-[#38383A] shadow-sm">
                      <CardContent className="p-5 sm:p-6">
                        <form
                          onSubmit={applyFilters}
                          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-12 items-end"
                        >
                          <div className="space-y-1.5 lg:col-span-2">
                            <Label htmlFor="mode" className="text-slate-700 dark:text-[#D1D1D6]">
                              {t("reviewQueue.mode")}
                            </Label>
                            <select
                              id="mode"
                              value={mode}
                              onChange={(event) => setMode(toReviewMode(event.target.value))}
                              className="h-10 w-full rounded-md border border-slate-200 dark:border-[#38383A] bg-white dark:bg-[#262628] px-3 text-sm text-slate-900 dark:text-[#F2F2F7]"
                            >
                              <option value="">{t("common.all")}</option>
                              <option value="regular">{t("reviewQueue.regular")}</option>
                              <option value="arrow_duel">{t("common.arrowDuel")}</option>
                            </select>
                          </div>

                          <div className="space-y-1.5 lg:col-span-2">
                            <Label htmlFor="puzzle-source" className="text-slate-700 dark:text-[#D1D1D6]">
                              {t("reviewQueue.source")}
                            </Label>
                            <select
                              id="puzzle-source"
                              value={puzzleSource}
                              onChange={(event) =>
                                updatePuzzleSource(toPuzzleSourceFilter(event.target.value))
                              }
                              className="h-10 w-full rounded-md border border-slate-200 dark:border-[#38383A] bg-white dark:bg-[#262628] px-3 text-sm text-slate-900 dark:text-[#F2F2F7]"
                            >
                              <option value="">{t("common.all")}</option>
                              <option value="user_game">{t("reviewQueue.yourGames")}</option>
                              <option value="lichess">{t("nav.puzzleSprint")}</option>
                            </select>
                          </div>

                          <div className="space-y-1.5 lg:col-span-2">
                            <Label htmlFor="due" className="text-slate-700 dark:text-[#D1D1D6]">
                              {t("reviewQueue.due")}
                            </Label>
                            <select
                              id="due"
                              value={due}
                              onChange={(event) =>
                                setDue(event.target.value === "all" ? "all" : "now")
                              }
                              className="h-10 w-full rounded-md border border-slate-200 dark:border-[#38383A] bg-white dark:bg-[#262628] px-3 text-sm text-slate-900 dark:text-[#F2F2F7]"
                            >
                              <option value="now">{t("reviewQueue.dueNow")}</option>
                              <option value="all">{t("reviewQueue.allActive")}</option>
                            </select>
                          </div>

                          <div className="space-y-1.5 sm:col-span-2 lg:col-span-3">
                            <Label htmlFor="theme-scope" className="text-slate-700 dark:text-[#D1D1D6]">
                              {t("reviewQueue.themeScope")}
                            </Label>
                            <select
                              id="theme-scope"
                              value={themeScope}
                              onChange={(event) => setThemeScope(event.target.value)}
                              disabled={puzzleSource === "lichess"}
                              className="h-10 w-full rounded-md border border-slate-200 dark:border-[#38383A] bg-white dark:bg-[#262628] px-3 text-sm text-slate-900 dark:text-[#F2F2F7] disabled:cursor-not-allowed disabled:bg-slate-100 dark:disabled:bg-[#1C1C1E] disabled:text-slate-500"
                            >
                              {THEME_SCOPE_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {translateThemeGroup(option.value, t)}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="flex items-center gap-2 sm:col-span-2 lg:col-span-3">
                            <Button
                              type="submit"
                              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                            >
                              <Search className="h-4 w-4 mr-1.5" />
                              {t("common.apply")}
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              className="shrink-0 border-slate-200 dark:border-[#38383A] bg-white dark:bg-[#262628] text-slate-700 dark:text-[#F2F2F7] hover:bg-slate-50 dark:hover:bg-[#2C2C2E]"
                              onClick={clearFilters}
                            >
                              {t("common.clear")}
                            </Button>
                          </div>
                        </form>

                        {filters.themeGroups.length > 0 && (
                          <div className="mt-4 flex flex-wrap gap-2">
                            {filters.themeGroups.map((themeGroup) => (
                              <Badge
                                key={themeGroup}
                                variant="secondary"
                                className="bg-slate-100 dark:bg-[#2C2C2E] text-slate-700 dark:text-[#D1D1D6] shadow-none"
                              >
                                {translateThemeGroup(themeGroup, t)}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  {/* Spaced-Repetition Schedule List */}
                  <Card className="bg-white dark:bg-[#1C1C1E] border-slate-200 dark:border-[#38383A] shadow-sm overflow-hidden">
                    <CardContent className="p-0">
                      {isLoading ? (
                        <LoadingState label={t("reviewQueue.loadingSchedule")} />
                      ) : error ? (
                        <EmptyState title="Could not load review queue" message={error} />
                      ) : items.length === 0 ? (
                        <EmptyState
                          title={
                            filters.due === "now"
                              ? t("reviewQueue.noDueTitle")
                              : t("reviewQueue.noItemsTitle")
                          }
                          message={
                            filters.due === "now" && scheduledLater > 0
                              ? `${scheduledLater.toLocaleString()} position(s) are scheduled for upcoming days. Switch to All Scheduled to inspect your review calendar.`
                              : t("reviewQueue.emptyHint")
                          }
                        />
                      ) : (
                        <ReviewScheduleList items={items} getThemeName={getThemeName} locale={locale} />
                      )}
                    </CardContent>
                  </Card>

                  {!error && totalCount > 0 && (
                    <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-sm text-slate-600 dark:text-[#AEAEB2] tabular-nums">
                        {t("reviewQueue.showingRange", {
                          start: pageStart.toLocaleString(),
                          end: pageEnd.toLocaleString(),
                          total: totalCount.toLocaleString(),
                        })}
                      </p>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          disabled={offset === 0 || isLoading}
                          onClick={() => goToOffset(offset - PAGE_SIZE)}
                          className="border-slate-200 dark:border-[#38383A] bg-white dark:bg-[#1C1C1E] text-slate-700 dark:text-[#F2F2F7]"
                        >
                          <ChevronLeft className="h-4 w-4 mr-1.5" />
                          {t("common.previous")}
                        </Button>
                        <Button
                          variant="outline"
                          disabled={!hasNextPage || isLoading}
                          onClick={() => goToOffset(offset + PAGE_SIZE)}
                          className="border-slate-200 dark:border-[#38383A] bg-white dark:bg-[#1C1C1E] text-slate-700 dark:text-[#F2F2F7]"
                        >
                          {t("common.next")}
                          <ChevronRight className="h-4 w-4 ml-1.5" />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </MobileContainer>
        <Footer />
      </div>
    </MobileLayout>
  )
}

function ReviewQueueShellFallback() {
  const { t } = useI18n()
  return (
    <MobileLayout fullHeight>
      <div className="min-h-screen bg-slate-50 dark:bg-[#0B0D12]">
        <Navigation />
        <MobileContainer padding="lg">
          <LoadingState label={t("reviewQueue.loadingSchedule")} />
        </MobileContainer>
        <Footer />
      </div>
    </MobileLayout>
  )
}

function StatsGrid({
  stats,
  scheduledLater,
}: {
  stats: V2ReviewQueueStatsResponse | null
  scheduledLater: number
}) {
  const { t } = useI18n()
  const cards = [
    { label: t("reviewQueue.dueRegular"), value: stats?.due_regular ?? 0, dot: "bg-blue-500" },
    { label: t("reviewQueue.dueArrowDuel"), value: stats?.due_arrow_duel ?? 0, dot: "bg-emerald-500" },
    { label: t("reviewQueue.scheduledLater"), value: scheduledLater, dot: "bg-amber-500" },
    { label: t("reviewQueue.totalQueuedLabel"), value: stats?.total_queued ?? 0, dot: "bg-slate-400" },
  ]

  return (
    <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
      {cards.map((card) => (
        <Card
          key={card.label}
          className="bg-white dark:bg-[#1C1C1E] border-slate-200 dark:border-[#38383A] shadow-sm"
        >
          <CardContent className="p-4">
            <div className="text-2xl font-semibold tracking-tight tabular-nums text-slate-900 dark:text-[#F2F2F7]">
              {card.value.toLocaleString()}
            </div>
            <div className="flex items-center gap-1.5 text-xs sm:text-sm text-slate-500 dark:text-[#AEAEB2] mt-1">
              <span className={`h-1.5 w-1.5 rounded-full ${card.dot}`} />
              <span>{card.label}</span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function ReviewScheduleList({
  items,
  getThemeName,
  locale,
}: {
  items: V2ReviewQueuePuzzle[]
  getThemeName: (theme: string) => string
  locale: string
}) {
  const { t } = useI18n()
  return (
    <div className="divide-y divide-slate-100 dark:divide-[#2C2C2E]">
      {items.map((item) => {
        const themeGroup = themeGroupFromMetadata(item)
        const primaryTitle = themeGroup
          ? translateThemeGroup(themeGroup, t)
          : item.themes && item.themes.length > 0
            ? getThemeName(item.themes[0])
            : item.mode === "arrow_duel"
              ? t("common.arrowDuel")
              : t("common.regularPuzzle")

        const scheduleInfo = describeReviewSchedule(item.due_at, t("reviewQueue.dueNow"), locale)
        const stage = Math.min(
          5,
          Math.max(
            0,
            typeof item.consecutive_correct === "number" &&
              Number.isFinite(item.consecutive_correct)
              ? item.consecutive_correct
              : 0,
          ),
        )
        const intervalDays =
          item.interval_days && item.interval_days > 0
            ? item.interval_days
            : inferredIntervalDays(stage)

        return (
          <div
            key={item.review_item_id}
            className="grid gap-3 p-4 md:grid-cols-[1fr_auto] md:items-center hover:bg-slate-50/70 dark:hover:bg-[#262628]/70 transition-colors"
          >
            <div className="min-w-0 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-sm sm:text-base text-slate-900 dark:text-[#F2F2F7]">
                  {primaryTitle}
                </span>
                <Badge
                  variant={item.mode === "arrow_duel" ? "default" : "secondary"}
                  className={
                    item.mode === "arrow_duel"
                      ? "bg-blue-600 text-white text-[11px]"
                      : "bg-slate-100 dark:bg-[#2C2C2E] text-slate-700 dark:text-[#D1D1D6] text-[11px]"
                  }
                >
                  {item.mode === "arrow_duel" ? (
                    <span className="inline-flex items-center gap-1">
                      <Swords className="h-3 w-3" />
                      {t("common.arrowDuel")}
                    </span>
                  ) : (
                    t("reviewQueue.regular")
                  )}
                </Badge>
                <Badge
                  variant="outline"
                  className="border-slate-200 dark:border-[#38383A] text-slate-600 dark:text-[#AEAEB2] text-[11px]"
                >
                  {item.puzzle_source === "user_game" ? t("common.yourGame") : t("nav.puzzleSprint")}
                </Badge>
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-500 dark:text-[#AEAEB2] tabular-nums">
                {/* 5-step spaced-repetition mastery indicator */}
                <div className="inline-flex items-center gap-1.5" title="Spaced repetition mastery stage">
                  <div className="flex items-center gap-1">
                    {[0, 1, 2, 3, 4].map((dot) => (
                      <span
                        key={dot}
                        className={cn(
                          "h-1.5 w-3 rounded-full",
                          dot < stage
                            ? "bg-emerald-500 dark:bg-[#4CD964]"
                            : "bg-slate-200 dark:bg-[#38383A]",
                        )}
                      />
                    ))}
                  </div>
                  <span>{t("reviewQueue.stage", { current: stage })}</span>
                </div>
                {intervalDays > 0 && <span>{intervalDays}d</span>}
                {item.rating ? <span>Elo {item.rating}</span> : null}
                <span>{t("history.attemptsCount", { count: item.attempts_since_added })}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 md:justify-end">
              <div
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium whitespace-nowrap",
                  scheduleInfo.isDue
                    ? "bg-blue-50 dark:bg-[#0B2A4D] border-blue-200 dark:border-[#16467A] text-blue-700 dark:text-[#4DA3FF]"
                    : "bg-slate-50 dark:bg-[#262628] border-slate-200 dark:border-[#38383A] text-slate-600 dark:text-[#AEAEB2]",
                )}
              >
                <CalendarClock className="h-3.5 w-3.5" />
                <span>{scheduleInfo.label}</span>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function LoadingState({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center gap-2 p-10 text-slate-500 dark:text-[#AEAEB2]">
      <Loader2 className="h-5 w-5 animate-spin" />
      <span>{label}</span>
    </div>
  )
}

function EmptyState({ title, message }: { title: string; message: string }) {
  return (
    <div className="p-10 text-center">
      <h2 className="text-lg font-semibold text-slate-900 dark:text-[#F2F2F7]">{title}</h2>
      <p className="mt-2 text-sm text-slate-500 dark:text-[#AEAEB2] max-w-md mx-auto">
        {message}
      </p>
    </div>
  )
}

function inferredIntervalDays(stage: number): number {
  switch (stage) {
    case 1:
      return 2
    case 2:
      return 4
    case 3:
      return 7
    case 4:
      return 15
    default:
      return 0
  }
}

function describeReviewSchedule(
  dueAtIso: string,
  dueNowLabel: string,
  locale: string,
): { isDue: boolean; label: string } {
  const dueTime = new Date(dueAtIso).getTime()
  if (!Number.isFinite(dueTime)) {
    return { isDue: true, label: dueNowLabel }
  }
  const now = Date.now()
  const diffMs = dueTime - now
  const dayMs = 24 * 60 * 60 * 1000

  if (diffMs <= 0) {
    const overdueDays = Math.floor(Math.abs(diffMs) / dayMs)
    if (overdueDays >= 1) {
      return { isDue: true, label: `${dueNowLabel} (${overdueDays}d)` }
    }
    return { isDue: true, label: dueNowLabel }
  }

  const daysUntil = Math.ceil(diffMs / dayMs)
  if (daysUntil <= 7) {
    return {
      isDue: false,
      label: new Intl.RelativeTimeFormat(locale, { numeric: "auto" }).format(daysUntil, "day"),
    }
  }
  return {
    isDue: false,
    label: new Intl.DateTimeFormat(locale, { month: "short", day: "numeric" }).format(
      new Date(dueTime),
    ),
  }
}

function toReviewMode(value: string | null): ReviewMode {
  return value === "regular" || value === "arrow_duel" ? value : ""
}

function toPuzzleSourceFilter(value: string | null): PuzzleSourceFilter {
  return value === "user_game" || value === "lichess" ? value : ""
}

function toDueFilter(value: string | null): DueFilter {
  return value === "all" ? "all" : "now"
}

function normalizeOffset(value: string | null): number {
  const offset = Number.parseInt(value || "0", 10)
  if (!Number.isFinite(offset) || offset < 0) return 0
  return offset
}

function parseThemeGroups(value: string | null): string[] {
  return (value || "")
    .split(",")
    .map((item) => item.trim())
    .filter((item) => VALID_THEME_GROUPS.has(item))
}

function themeGroupsParam(
  puzzleSource: PuzzleSourceFilter,
  themeGroups: string[],
): string | undefined {
  if (puzzleSource === "lichess") return undefined
  return themeGroups.length > 0 ? themeGroups.join(",") : undefined
}

function buildReviewQueueURL(
  pathname: string,
  filters: ReviewFilters,
  offset: number,
): string {
  const params = new URLSearchParams()

  if (filters.mode) params.set("mode", filters.mode)
  if (filters.puzzleSource) params.set("puzzle_source", filters.puzzleSource)
  if (filters.due !== "now") params.set("due", filters.due)
  const scopedThemeGroups = themeGroupsParam(filters.puzzleSource, filters.themeGroups)
  if (scopedThemeGroups) params.set("theme_groups", scopedThemeGroups)
  if (offset > 0) params.set("offset", String(offset))

  const query = params.toString()
  return query ? `${pathname}?${query}` : pathname
}

function themeGroupFromMetadata(item: V2ReviewQueuePuzzle): string | null {
  const value = item.metadata?.theme_group
  return typeof value === "string" && value ? value : null
}

function translateThemeGroup(
  value: string,
  t: ReturnType<typeof useI18n>["t"],
): string {
  switch (value) {
    case "":
      return t("common.all")
    case "missed_opportunity":
      return t("themeGroup.missed_opportunity")
    case "caught_opportunity":
      return t("themeGroup.caught_opportunity")
    case "missed_attack":
      return t("themeGroup.missed_attack")
    case "caught_attack":
      return t("themeGroup.caught_attack")
    case "own_mistake_punished":
      return t("themeGroup.own_mistake_punished")
    case "own_mistake_escaped":
      return t("themeGroup.own_mistake_escaped")
    case "missed_opportunity,missed_attack":
      return `${t("themeGroup.missed_opportunity")} & ${t("themeGroup.missed_attack")}`
    case "missed_attack,own_mistake_punished":
      return t("themeGroup.my_mistakes")
    default:
      return formatThemeGroup(value)
  }
}

function formatThemeGroup(value: string): string {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}
