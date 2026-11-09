"use client"

import { Suspense, useCallback, useEffect, useMemo, useState, type FormEvent } from "react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { ArrowLeft, Brain, ChevronLeft, ChevronRight, Loader2, Play, Search, Target } from "lucide-react"
import Navigation from "@/components/navigation"
import Footer from "@/components/footer"
import { ReviewSession } from "@/components/review-queue/ReviewSession"
import { MobileContainer, MobileLayout } from "@/components/ui/mobile-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import {
  drawReviewQueuePuzzles,
  getReviewQueueStats,
  listReviewQueueItems,
  type V2ReviewQueueListResponse,
  type V2ReviewQueuePuzzle,
  type V2ReviewQueueStatsResponse,
} from "@/lib/api/library"
import { useUserContext } from "@/hooks/useUserContext"

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
  { value: "missed_attack,own_mistake_punished", label: "My Mistakes" },
]
const VALID_THEME_GROUPS = new Set(THEME_SCOPE_OPTIONS.flatMap(option => option.value.split(",").filter(Boolean)))

export default function ReviewQueuePage() {
  return (
    <Suspense fallback={<ReviewQueueShellFallback />}>
      <ReviewQueueContent />
    </Suspense>
  )
}

function ReviewQueueContent() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const initialMode = toReviewMode(searchParams.get("mode"))
  const initialPuzzleSource = toPuzzleSourceFilter(searchParams.get("puzzle_source"))
  const initialDue = toDueFilter(searchParams.get("due"))
  const initialThemeGroups = initialPuzzleSource === "lichess" ? [] : parseThemeGroups(searchParams.get("theme_groups"))
  const initialOffset = normalizeOffset(searchParams.get("offset"))
  const { user, isLoading: isLoadingUser, error: userError } = useUserContext()
  const [mode, setMode] = useState<ReviewMode>(initialMode)
  const [puzzleSource, setPuzzleSource] = useState<PuzzleSourceFilter>(initialPuzzleSource)
  const [due, setDue] = useState<DueFilter>(initialDue)
  const [themeScope, setThemeScope] = useState(initialThemeGroups.join(","))
  const [filters, setFilters] = useState<ReviewFilters>({ mode: initialMode, puzzleSource: initialPuzzleSource, due: initialDue, themeGroups: initialThemeGroups })
  const [offset, setOffset] = useState(initialOffset)
  const [stats, setStats] = useState<V2ReviewQueueStatsResponse | null>(null)
  const [data, setData] = useState<V2ReviewQueueListResponse | null>(null)
  const [drawnPuzzles, setDrawnPuzzles] = useState<V2ReviewQueuePuzzle[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isDrawing, setIsDrawing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [drawError, setDrawError] = useState<string | null>(null)
  const [queueVersion, setQueueVersion] = useState(0)

  const refreshQueue = useCallback(() => {
    setQueueVersion(version => version + 1)
  }, [])

  useEffect(() => {
    if (!user?.id) return

    let cancelled = false
    const loadReviewQueue = async () => {
      try {
        setIsLoading(true)
        setError(null)
        const scopedThemeGroups = themeGroupsParam(filters.puzzleSource, filters.themeGroups)
        const [nextStats, nextItems] = await Promise.all([
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
        ])
        if (!cancelled) {
          setStats(nextStats)
          setData(nextItems)
        }
      } catch (loadError) {
        if (!cancelled) {
          setStats(null)
          setData(null)
          setError(loadError instanceof Error ? loadError.message : "Failed to load review queue")
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
  const hasNextPage = offset + PAGE_SIZE < totalCount
  const pageStart = totalCount === 0 ? 0 : offset + 1
  const pageEnd = Math.min(offset + PAGE_SIZE, totalCount)
  const activeFilterCount = useMemo(() => [
    filters.mode,
    filters.puzzleSource,
    filters.due !== "now" ? filters.due : "",
    filters.themeGroups.length > 0 ? "theme_groups" : "",
  ].filter(Boolean).length, [filters])

  const applyFilters = (event: FormEvent) => {
    event.preventDefault()
    const nextThemeGroups = puzzleSource === "lichess" ? [] : parseThemeGroups(themeScope)
    const nextFilters = { mode, puzzleSource, due, themeGroups: nextThemeGroups }
    setFilters(nextFilters)
    if (puzzleSource === "lichess") {
      setThemeScope("")
    }
    setOffset(0)
    setDrawnPuzzles([])
    router.replace(buildReviewQueueURL(pathname, nextFilters, 0), { scroll: false })
  }

  const clearFilters = () => {
    const nextFilters: ReviewFilters = { mode: "", puzzleSource: "", due: "now", themeGroups: [] }
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
        theme_groups: themeGroupsParam(filters.puzzleSource, filters.themeGroups)?.split(","),
      })
      setDrawnPuzzles(response.puzzles)
    } catch (loadError) {
      setDrawnPuzzles([])
      setDrawError(loadError instanceof Error ? loadError.message : "Failed to start review")
    } finally {
      setIsDrawing(false)
    }
  }

  const goToOffset = (nextOffset: number) => {
    const normalizedOffset = Math.max(0, nextOffset)
    setOffset(normalizedOffset)
    setDrawnPuzzles([])
    router.replace(buildReviewQueueURL(pathname, filters, normalizedOffset), { scroll: false })
  }

  return (
    <MobileLayout fullHeight>
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <MobileContainer padding="lg">
          <div className="mb-6">
            <Link href="/game-review">
              <Button variant="outline" className="mb-4">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Game Review
              </Button>
            </Link>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-orange-100 p-3 rounded-lg">
                  <Brain className="h-7 w-7 text-orange-700" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">Review Queue</h1>
                  <p className="text-gray-600 mt-1">Practice due tactical positions from your games and failed sprints.</p>
                </div>
              </div>
              <Badge variant="outline" className="self-start sm:self-auto">
                {(stats?.due_now ?? 0).toLocaleString()} due now
              </Badge>
            </div>
          </div>

          {userError && (
            <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
              {userError}
            </div>
          )}

          {isLoadingUser ? (
            <LoadingState label="Loading user data..." />
          ) : !user?.id ? (
            <EmptyState title="Sign in to view review queue" message="Your due review positions appear here after sign-in." />
          ) : (
            <>
              <StatsGrid stats={stats} />

              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Search className="h-5 w-5" />
                    Filters
                    {activeFilterCount > 0 && <Badge variant="secondary">{activeFilterCount}</Badge>}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={applyFilters} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
                    <div className="space-y-2">
                      <Label htmlFor="mode">Mode</Label>
                      <select id="mode" value={mode} onChange={(event) => setMode(toReviewMode(event.target.value))} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                        <option value="">All</option>
                        <option value="regular">Regular</option>
                        <option value="arrow_duel">Arrow Duel</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="puzzle-source">Source</Label>
                      <select id="puzzle-source" value={puzzleSource} onChange={(event) => updatePuzzleSource(toPuzzleSourceFilter(event.target.value))} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                        <option value="">All</option>
                        <option value="user_game">Game Positions</option>
                        <option value="lichess">Lichess Puzzles</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="due">Due</Label>
                      <select id="due" value={due} onChange={(event) => setDue(event.target.value === "all" ? "all" : "now")} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                        <option value="now">Due Now</option>
                        <option value="all">All Active</option>
                      </select>
                    </div>
                    <div className="space-y-2 sm:col-span-2 lg:col-span-2">
                      <Label htmlFor="theme-scope">Theme Scope</Label>
                      <select id="theme-scope" value={themeScope} onChange={(event) => setThemeScope(event.target.value)} disabled={puzzleSource === "lichess"} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500">
                        {THEME_SCOPE_OPTIONS.map(option => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-1">
                      <Button type="submit" className="flex-1">
                        <Search className="h-4 w-4 mr-2" />
                        Apply
                      </Button>
                      <Button type="button" variant="outline" onClick={clearFilters}>Clear</Button>
                    </div>
                  </form>
                  {filters.themeGroups.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {filters.themeGroups.map(themeGroup => (
                        <Badge key={themeGroup} variant="secondary">{formatThemeGroup(themeGroup)}</Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <Button onClick={startReview} disabled={isDrawing || isLoading || (stats?.due_now ?? 0) === 0} className="bg-orange-600 hover:bg-orange-700">
                    {isDrawing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Play className="h-4 w-4 mr-2" />}
                    Start Review
                  </Button>
                  <p className="mt-2 text-sm text-gray-600">Starts with due positions matching the current mode, source, and theme filters.</p>
                </div>
                {drawError && <p className="text-sm text-red-700">{drawError}</p>}
              </div>

              {drawnPuzzles.length > 0 && (
                <ReviewSession puzzles={drawnPuzzles} onQueueChanged={refreshQueue} />
              )}

              <Card>
                <CardContent className="p-0">
                  {isLoading ? (
                    <LoadingState label="Loading review queue..." />
                  ) : error ? (
                    <EmptyState title="Could not load review queue" message={error} />
                  ) : items.length === 0 ? (
                    <EmptyState title="No review items found" message="Try another mode or due filter." />
                  ) : (
                    <ReviewPuzzleGrid items={items} />
                  )}
                </CardContent>
              </Card>

              {!error && totalCount > 0 && (
                <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-gray-600">
                    Showing {pageStart.toLocaleString()}-{pageEnd.toLocaleString()} of {totalCount.toLocaleString()}
                  </p>
                  <div className="flex gap-2">
                    <Button variant="outline" disabled={offset === 0 || isLoading} onClick={() => goToOffset(offset - PAGE_SIZE)}>
                      <ChevronLeft className="h-4 w-4 mr-2" />
                      Previous
                    </Button>
                    <Button variant="outline" disabled={!hasNextPage || isLoading} onClick={() => goToOffset(offset + PAGE_SIZE)}>
                      Next
                      <ChevronRight className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                </div>
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
  return (
    <MobileLayout fullHeight>
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <MobileContainer padding="lg">
          <LoadingState label="Loading review queue..." />
        </MobileContainer>
        <Footer />
      </div>
    </MobileLayout>
  )
}

function StatsGrid({ stats }: { stats: V2ReviewQueueStatsResponse | null }) {
  const cards = [
    { label: "Due Now", value: stats?.due_now ?? 0, tone: "bg-orange-50 text-orange-900 border-orange-200" },
    { label: "Regular", value: stats?.due_regular ?? 0, tone: "bg-blue-50 text-blue-900 border-blue-200" },
    { label: "Arrow Duel", value: stats?.due_arrow_duel ?? 0, tone: "bg-green-50 text-green-900 border-green-200" },
    { label: "Total Queued", value: stats?.total_queued ?? 0, tone: "bg-gray-50 text-gray-900 border-gray-200" },
  ]

  return (
    <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map(card => (
        <Card key={card.label} className={card.tone}>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{card.value.toLocaleString()}</div>
            <div className="text-sm font-medium">{card.label}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function ReviewPuzzleGrid({ items }: { items: V2ReviewQueuePuzzle[] }) {
  return (
    <div className="divide-y">
      {items.map(item => (
        <div key={item.review_item_id} className="grid gap-3 p-4 md:grid-cols-[1fr_auto] md:items-center">
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <Badge variant={item.mode === "arrow_duel" ? "default" : "secondary"}>
                {item.mode === "arrow_duel" ? "Arrow Duel" : "Regular"}
              </Badge>
              <Badge variant="outline">{item.puzzle_source === "user_game" ? "Game" : "Lichess"}</Badge>
              {themeGroupFromMetadata(item) && <Badge variant="secondary">{formatThemeGroup(themeGroupFromMetadata(item)!)}</Badge>}
            </div>
            <p className="truncate font-mono text-sm text-gray-800">{item.fen || item.puzzle_id}</p>
            <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-600">
              {item.rating ? <span>{item.rating} rating</span> : null}
              <span>{item.attempts_since_added} attempts</span>
              <span>{item.consecutive_correct} correct streak</span>
              {item.themes?.slice(0, 3).map(theme => <span key={theme}>{theme}</span>)}
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Target className="h-4 w-4" />
            <span>{formatDate(item.due_at)}</span>
          </div>
        </div>
      ))}
    </div>
  )
}

function LoadingState({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center gap-2 p-10 text-gray-600">
      <Loader2 className="h-5 w-5 animate-spin" />
      <span>{label}</span>
    </div>
  )
}

function EmptyState({ title, message }: { title: string; message: string }) {
  return (
    <div className="p-10 text-center">
      <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
      <p className="mt-2 text-sm text-gray-600">{message}</p>
    </div>
  )
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
    .map(item => item.trim())
    .filter(item => VALID_THEME_GROUPS.has(item))
}

function themeGroupsParam(puzzleSource: PuzzleSourceFilter, themeGroups: string[]): string | undefined {
  if (puzzleSource === "lichess") return undefined
  return themeGroups.length > 0 ? themeGroups.join(",") : undefined
}

function buildReviewQueueURL(pathname: string, filters: ReviewFilters, offset: number): string {
  const params = new URLSearchParams()

  if (filters.mode) params.set("mode", filters.mode)
  if (filters.puzzleSource) params.set("puzzle_source", filters.puzzleSource)
  if (filters.due !== "now") params.set("due", filters.due)
  const themeGroups = themeGroupsParam(filters.puzzleSource, filters.themeGroups)
  if (themeGroups) params.set("theme_groups", themeGroups)
  if (offset > 0) params.set("offset", String(offset))

  const query = params.toString()
  return query ? `${pathname}?${query}` : pathname
}

function themeGroupFromMetadata(item: V2ReviewQueuePuzzle): string | undefined {
  const value = item.metadata?.theme_group
  return typeof value === "string" ? value : undefined
}

function formatThemeGroup(value: string): string {
  return value
    .split("_")
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(value))
}
