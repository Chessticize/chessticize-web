"use client"

import { useCallback, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import Navigation from "@/components/navigation"
import Footer from "@/components/footer"
import { DevelopmentNotice } from "@/components/development-notice"
import { MobileLayout, MobileContainer } from "@/components/ui/mobile-layout"
import { useUserContext } from "@/hooks/useUserContext"
import { useSprintStats } from "@/hooks/useSprintStats"
import { useDailyPuzzleStreak } from "@/hooks/useDailyPuzzleStreak"
import { usePracticeRuns } from "@/hooks/usePracticeRuns"
import { toast } from "@/hooks/use-toast"
import { apiPut } from "@/lib/auth/api-client"
import { API_CONFIG } from "@/lib/config"
import {
  HowSprintWorksModal,
  PracticeRunEditorModal,
  type BuiltinRunTarget,
  type PracticeRunEditorSavePayload,
} from "@/components/puzzle-sprint/PracticeRunModals"
import {
  Target,
  Zap,
  Swords,
  Flame,
  CheckCircle,
  Timer,
  Plus,
  Pencil,
  HelpCircle,
  Trash2,
  ArrowUp,
  ArrowDown,
  Check,
  Play,
  GripVertical,
  FlaskConical,
  ChevronRight,
} from "lucide-react"
import { useIsStagingEnvironment } from "@/lib/staging"
import {
  getStandardEloType,
  getArrowDuelEloType,
  calculateTargetPuzzles,
  VALID_THEMES,
  VALID_SPRINT_DURATIONS,
  VALID_PER_PUZZLE_TIMES,
} from "@/lib/sprint-config"
import { eloTypeForSavedRun, getSavedRunHref } from "@/lib/practice-runs"
import { getThemeDisplayName } from "@/lib/theme-config"
import { useI18n } from "@/components/i18n/i18n-provider"
import { cn } from "@/lib/utils"
import type { SavedPracticeRun } from "@/lib/api/preferences"

const BUILTIN_STANDARD_ID = "__builtin_standard__"
const BUILTIN_ARROW_DUEL_ID = "__builtin_arrow_duel__"

export default function PuzzleSprintPage() {
  const { user, isLoading, refreshUser } = useUserContext()
  const { t, locale } = useI18n()
  const isStaging = useIsStagingEnvironment()
  const { streak: dailyStreak } = useDailyPuzzleStreak()
  const {
    runs: storedCustomRuns,
    hasCustomConfig,
    addRun,
    updateRun,
    removeRun,
    moveRun,
    reorderRuns,
  } = usePracticeRuns()

  // If the user has not explicitly customized their Home runs yet, seed Blitz + up to 3 recent custom ELOs
  const customRuns: SavedPracticeRun[] = useMemo(() => {
    if (hasCustomConfig || !user?.elos) return storedCustomRuns
    const seeded: SavedPracticeRun[] = [...storedCustomRuns]
    const seenKeys = new Set(seeded.map((run) => eloTypeForSavedRun(run)))
    const recentElos = user.elos
      .filter((elo) => {
        if (elo.elo_type === "mixed 5/20" || elo.elo_type === "mixed 5/10") return false
        const match = elo.elo_type.match(/^(.+)\s+(\d+)\/(\d+)$/)
        if (!match) return false
        const [, theme, duration, perPuzzle] = match
        return (
          (VALID_THEMES as readonly string[]).includes(theme) &&
          (VALID_SPRINT_DURATIONS as readonly number[]).includes(parseInt(duration, 10)) &&
          (VALID_PER_PUZZLE_TIMES as readonly number[]).includes(parseInt(perPuzzle, 10))
        )
      })
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
      .slice(0, 3)

    for (const elo of recentElos) {
      if (seenKeys.has(elo.elo_type)) continue
      seenKeys.add(elo.elo_type)
      const [, theme, duration, perPuzzle] = elo.elo_type.match(/^(.+)\s+(\d+)\/(\d+)$/)!
      seeded.push({
        id: `elo-${theme}-${duration}-${perPuzzle}`,
        name: `${getThemeDisplayName(theme, locale)} ${duration}m/${perPuzzle}s`,
        theme,
        duration_minutes: parseInt(duration, 10),
        per_puzzle_seconds: parseInt(perPuzzle, 10),
      })
    }
    return seeded
  }, [hasCustomConfig, user?.elos, storedCustomRuns, locale])

  const [selectedRunId, setSelectedRunId] = useState<string>(BUILTIN_STANDARD_ID)
  const [isEditing, setIsEditing] = useState(false)
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingRun, setEditingRun] = useState<SavedPracticeRun | null>(null)
  const [editingBuiltinRun, setEditingBuiltinRun] = useState<BuiltinRunTarget | null>(null)
  const [isSavingRun, setIsSavingRun] = useState(false)
  const [howItWorksOpen, setHowItWorksOpen] = useState(false)

  // Drag-and-drop reorder state (pointer events work on desktop mouse + mobile touch)
  const [draggingRunId, setDraggingRunId] = useState<string | null>(null)
  const [dragOrder, setDragOrder] = useState<SavedPracticeRun[] | null>(null)
  const [dragOffsetY, setDragOffsetY] = useState(0)
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const dragStateRef = useRef<{
    runId: string
    lastY: number
    order: SavedPracticeRun[]
  } | null>(null)

  const displayedCustomRuns = dragOrder ?? customRuns

  const selectedRun = useMemo(() => {
    if (selectedRunId === BUILTIN_ARROW_DUEL_ID) {
      return {
        id: BUILTIN_ARROW_DUEL_ID,
        name: t("sprint.arrowDuelName"),
        href: "/puzzle-sprint/arrow-duel",
      }
    }
    const matchedCustom = customRuns.find((run) => run.id === selectedRunId)
    if (matchedCustom) {
      return {
        id: matchedCustom.id,
        name: matchedCustom.name,
        href: getSavedRunHref(matchedCustom),
      }
    }
    return {
      id: BUILTIN_STANDARD_ID,
      name: t("sprint.standardName"),
      href: "/puzzle-sprint/sprint",
    }
  }, [selectedRunId, customRuns, t])

  const handleDragPointerDown = (
    event: React.PointerEvent<HTMLButtonElement>,
    runId: string,
  ) => {
    event.preventDefault()
    if (typeof event.currentTarget.setPointerCapture === "function") {
      try {
        event.currentTarget.setPointerCapture(event.pointerId)
      } catch {
        // Ignore capture errors in synthetic test environments
      }
    }
    const initialOrder = [...customRuns]
    dragStateRef.current = {
      runId,
      lastY: event.clientY,
      order: initialOrder,
    }
    setDraggingRunId(runId)
    setDragOrder(initialOrder)
    setDragOffsetY(0)
  }

  const handleDragPointerMove = (event: React.PointerEvent<HTMLButtonElement>) => {
    const state = dragStateRef.current
    if (!state) return

    const currentIndex = state.order.findIndex((run) => run.id === state.runId)
    if (currentIndex === -1) return

    if (currentIndex > 0) {
      const prevRun = state.order[currentIndex - 1]
      const prevEl = cardRefs.current[prevRun.id]
      if (prevEl) {
        const rect = prevEl.getBoundingClientRect()
        if (event.clientY < rect.top + rect.height / 2) {
          const nextOrder = [...state.order]
          const [moved] = nextOrder.splice(currentIndex, 1)
          nextOrder.splice(currentIndex - 1, 0, moved)
          state.order = nextOrder
          state.lastY = event.clientY
          setDragOrder(nextOrder)
          setDragOffsetY(0)
          return
        }
      }
    }

    if (currentIndex < state.order.length - 1) {
      const nextRun = state.order[currentIndex + 1]
      const nextEl = cardRefs.current[nextRun.id]
      if (nextEl) {
        const rect = nextEl.getBoundingClientRect()
        if (event.clientY > rect.top + rect.height / 2) {
          const nextOrder = [...state.order]
          const [moved] = nextOrder.splice(currentIndex, 1)
          nextOrder.splice(currentIndex + 1, 0, moved)
          state.order = nextOrder
          state.lastY = event.clientY
          setDragOrder(nextOrder)
          setDragOffsetY(0)
          return
        }
      }
    }

    const delta = event.clientY - state.lastY
    setDragOffsetY(Math.max(-48, Math.min(48, delta)))
  }

  const handleDragPointerEnd = (event: React.PointerEvent<HTMLButtonElement>) => {
    const state = dragStateRef.current
    if (!state) return
    const finalOrder = state.order
    dragStateRef.current = null

    if (
      typeof event.currentTarget.hasPointerCapture === "function" &&
      event.currentTarget.hasPointerCapture(event.pointerId)
    ) {
      try {
        event.currentTarget.releasePointerCapture(event.pointerId)
      } catch {
        // Ignore release errors
      }
    }

    setDraggingRunId(null)
    setDragOrder(null)
    setDragOffsetY(0)

    const changed = finalOrder.some((run, idx) => run.id !== customRuns[idx]?.id)
    if (changed) {
      reorderRuns(finalOrder)
    }
  }

  const { stats: sprintStats, isLoading: isSprintStatsLoading } = useSprintStats(
    {
      days: 365,
      group_by: "day",
      group_length: 1,
    },
    Boolean(user) && !isLoading,
  )
  const sprintStatsSummary = sprintStats?.summary
  const todaySprintSummary = sprintStats?.series.at(-1)?.summary

  const getEloForType = useCallback(
    (eloType: string) => {
      if (!user?.elos) return 600
      const found = user.elos.find((elo) => elo.elo_type === eloType)
      return found?.rating || 600
    },
    [user?.elos],
  )

  const getTotalSprints = () => sprintStatsSummary?.completed_count || 0
  const getTodayStartedSprints = () => todaySprintSummary?.started_count || 0
  const getTodayPuzzlesSolved = () => todaySprintSummary?.puzzles_solved || 0
  const getTodaySprintMinutes = () =>
    Math.round((todaySprintSummary?.sprint_total_duration_seconds || 0) / 60)

  const openAddRun = () => {
    setEditingRun(null)
    setEditingBuiltinRun(null)
    setEditorOpen(true)
  }

  const openEditRun = (run: SavedPracticeRun) => {
    setEditingBuiltinRun(null)
    setEditingRun(run)
    setEditorOpen(true)
  }

  const openEditBuiltinRun = (target: BuiltinRunTarget) => {
    setEditingRun(null)
    setEditingBuiltinRun(target)
    setEditorOpen(true)
  }

  const handleSaveRun = async (payload: PracticeRunEditorSavePayload): Promise<boolean> => {
    try {
      setIsSavingRun(true)

      if (payload.ratingChanged) {
        const res = await apiPut(`${API_CONFIG.BASE_URL}/me/elos`, {
          updates: [
            {
              elo_type: payload.eloType,
              rating: payload.rating,
              rating_deviation: 50.0,
            },
          ],
        })
        if (!res.ok) {
          const msg = await res.text().catch(() => "Unknown error")
          throw new Error(`${res.status} ${res.statusText}. ${msg}`)
        }
      }

      if (payload.customRun) {
        if (editingRun) {
          updateRun(editingRun.id, payload.customRun, customRuns)
        } else {
          addRun(payload.customRun, customRuns)
        }
      }

      if (payload.ratingChanged) {
        await refreshUser()
        toast({
          title: "ELO updated",
          description: `Training rating saved (${payload.rating}).`,
        })
      }

      return true
    } catch (err) {
      toast({
        title: "Failed to update ELO",
        description: err instanceof Error ? err.message : "Please try again",
        variant: "destructive" as any,
      })
      return false
    } finally {
      setIsSavingRun(false)
    }
  }

  return (
    <MobileLayout fullHeight>
      <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-[#0B0D12]">
        <Navigation />

        <MobileContainer padding="lg" className="flex-1 pb-24 sm:pb-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-5 gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900 dark:text-[#F2F2F7]">
                {t("sprint.title")}
              </h1>
              <p className="text-sm sm:text-base text-slate-500 dark:text-[#AEAEB2] mt-1">
                {t("sprint.subtitle")}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
              <div className="inline-flex items-center gap-1.5 bg-white dark:bg-[#1C1C1E] border border-slate-200 dark:border-[#38383A] px-3 py-1.5 rounded-full shadow-xs">
                <Flame className="h-4 w-4 text-amber-500 dark:text-[#FFB340]" />
                <span className="text-sm font-medium tabular-nums text-slate-700 dark:text-[#D1D1D6]">
                  {t("dashboard.dailyStreak", { count: dailyStreak })}
                </span>
              </div>
              <div className="inline-flex items-center gap-2 bg-blue-50/80 dark:bg-[#0B2A4D] border border-blue-200 dark:border-[#16467A] px-3.5 py-1.5 rounded-full">
                <Target className="h-4 w-4 text-blue-600 dark:text-[#4DA3FF]" />
                <span className="text-sm font-medium tabular-nums text-blue-700 dark:text-[#4DA3FF]">
                  {isLoading || isSprintStatsLoading
                    ? t("common.loading")
                    : t("sprint.totalSprints", { count: getTotalSprints() })}
                </span>
              </div>
            </div>
          </div>

          {/* Web Redesign Welcome & Feedback Banner (dismissible) */}
          <DevelopmentNotice className="mb-5" />

          {/* Progress Strip (aligned with Mobile Practice Home Progress) */}
          <Card className="mb-6 bg-white dark:bg-[#1C1C1E] border-slate-200 dark:border-[#38383A] shadow-sm">
            <CardContent className="p-4">
              <div className="grid grid-cols-3 gap-3 text-center sm:text-left">
                <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3">
                  <div className="mx-auto sm:mx-0 flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-[#FFB340] shrink-0">
                    <Flame className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-lg font-semibold tabular-nums text-slate-900 dark:text-[#F2F2F7]">
                      {getTodayStartedSprints()}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-[#AEAEB2]">
                      {t("sprint.todaySprints", { count: "" }).split(/[:：]/)[0].trim()}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3">
                  <div className="mx-auto sm:mx-0 flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-[#4CD964] shrink-0">
                    <CheckCircle className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-lg font-semibold tabular-nums text-slate-900 dark:text-[#F2F2F7]">
                      {getTodayPuzzlesSolved()}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-[#AEAEB2]">
                      {t("sprint.correctToday", { count: "" }).split(/[:：]/)[0].trim()}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3">
                  <div className="mx-auto sm:mx-0 flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 dark:bg-[#0B2A4D] text-blue-600 dark:text-[#4DA3FF] shrink-0">
                    <Timer className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-lg font-semibold tabular-nums text-slate-900 dark:text-[#F2F2F7]">
                      {getTodaySprintMinutes()}m
                    </div>
                    <div className="text-xs text-slate-500 dark:text-[#AEAEB2]">
                      {t("sprint.timeToday", { minutes: "" }).split(/[:：]/)[0].trim()}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Practice Runs Header (Two-Stage Start aligned with Mobile App) */}
          <div className="flex items-center justify-between gap-3 mb-2.5">
            <h2 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-[#F2F2F7]">
              {isEditing ? t("sprint.editRunsHeading") : t("sprint.startRunHeading")}
            </h2>
            {isEditing ? (
              <Button
                type="button"
                size="sm"
                onClick={() => setIsEditing(false)}
                className="bg-blue-600 hover:bg-blue-700 dark:bg-[#0A6FE0] dark:hover:bg-[#1980F5] text-white px-4"
              >
                <Check className="h-3.5 w-3.5 mr-1.5" />
                {t("sprint.doneButton")}
              </Button>
            ) : (
              <Link href={selectedRun.href}>
                <Button
                  type="button"
                  size="sm"
                  aria-label={`${t("sprint.startButton")} ${selectedRun.name}`}
                  className="bg-blue-600 hover:bg-blue-700 dark:bg-[#0A6FE0] dark:hover:bg-[#1980F5] text-white px-4 shadow-xs"
                >
                  <Play className="h-3.5 w-3.5 mr-1.5 fill-current" />
                  {t("sprint.startButton")}
                </Button>
              </Link>
            )}
          </div>

          {/* Utility Row: How Sprint Works on left, Edit + Add Run flush right on both mobile & desktop */}
          <div className="flex items-center justify-between gap-2 mb-3.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setHowItWorksOpen(true)}
              className="h-8 px-2.5 sm:px-3 text-xs sm:text-sm border-slate-200 dark:border-[#38383A] bg-white dark:bg-[#1C1C1E] text-slate-600 dark:text-[#AEAEB2] hover:text-slate-900 dark:hover:text-white shrink-0"
            >
              <HelpCircle className="h-3.5 w-3.5 mr-1.5 shrink-0" />
              {t("sprint.howItWorks")}
            </Button>
            <div className="flex items-center gap-2 ml-auto shrink-0">
              {!isEditing && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                  className="h-8 px-2.5 sm:px-3 text-xs sm:text-sm border-slate-200 dark:border-[#38383A] bg-white dark:bg-[#1C1C1E] text-slate-700 dark:text-[#D1D1D6]"
                >
                  <Pencil className="h-3.5 w-3.5 mr-1.5 shrink-0" />
                  {t("sprint.editButton")}
                </Button>
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={openAddRun}
                className="h-8 px-2.5 sm:px-3 text-xs sm:text-sm border-slate-200 dark:border-[#38383A] bg-white dark:bg-[#1C1C1E] text-blue-600 dark:text-[#4DA3FF] hover:bg-blue-50/70 dark:hover:bg-[#0B2A4D]/50 hover:border-blue-200 dark:hover:border-[#16467A]"
              >
                <Plus className="h-3.5 w-3.5 mr-1 shrink-0" />
                {t("sprint.addRunButton")}
              </Button>
            </div>
          </div>

          {/* Runs List: Built-in (Standard + Arrow Duel) + User Saved Runs */}
          <div className="grid grid-cols-1 gap-3.5">
            {/* Built-in Primary: Standard Sprint */}
            {(() => {
              const standardName = t("sprint.standardName")
              const standardDesc = t("sprint.standardDesc")
              const standardEloType = getStandardEloType()
              const isSelected = !isEditing && selectedRun.id === BUILTIN_STANDARD_ID

              if (isEditing) {
                return (
                  <Card className="bg-white dark:bg-[#1C1C1E] border-blue-200 dark:border-[#16467A] shadow-sm">
                    <CardContent className="p-3.5 sm:p-4">
                      <div className="flex items-center gap-3">
                        <div className="bg-blue-50/80 dark:bg-[#0B2A4D] border border-blue-100 dark:border-[#16467A] text-blue-600 dark:text-[#4DA3FF] p-2.5 rounded-xl shrink-0">
                          <Zap className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-sm sm:text-base font-semibold text-slate-900 dark:text-[#F2F2F7] truncate">
                              {standardName}
                            </h3>
                            <Badge
                              variant="outline"
                              className="bg-slate-50 dark:bg-[#262628] border-slate-200 dark:border-[#38383A] text-slate-700 dark:text-[#D1D1D6] text-xs font-medium tabular-nums"
                            >
                              Elo: {getEloForType(standardEloType)}
                            </Badge>
                          </div>
                          <p className="text-xs sm:text-sm text-slate-500 dark:text-[#AEAEB2] truncate">
                            {standardDesc}
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label={`Edit ${standardName}`}
                          onClick={() =>
                            openEditBuiltinRun({
                              id: BUILTIN_STANDARD_ID,
                              name: standardName,
                              eloType: standardEloType,
                              description: standardDesc,
                            })
                          }
                          className="h-8 w-8 text-blue-600 dark:text-[#4DA3FF] shrink-0"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )
              }

              return (
                <button
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => setSelectedRunId(BUILTIN_STANDARD_ID)}
                  className="w-full text-left block group focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-xl"
                >
                  <Card
                    className={cn(
                      "transition-all duration-150 shadow-sm",
                      isSelected
                        ? "bg-blue-50/70 dark:bg-[#0B2A4D]/75 border-blue-400 dark:border-[#2463A8] ring-1 ring-blue-400/40 dark:ring-[#4DA3FF]/30"
                        : "bg-white dark:bg-[#1C1C1E] border-slate-200 dark:border-[#38383A] hover:border-blue-200 dark:hover:border-[#2463A8]",
                    )}
                  >
                    <CardContent className="p-4 sm:p-5">
                      <div className="flex items-center gap-3.5 sm:gap-4">
                        <div
                          className={cn(
                            "p-3 rounded-xl shrink-0 transition-colors",
                            isSelected
                              ? "bg-blue-600 dark:bg-[#0A6FE0] text-white shadow-xs"
                              : "bg-blue-50/80 dark:bg-[#0B2A4D] border border-blue-100 dark:border-[#16467A] text-blue-600 dark:text-[#4DA3FF]",
                          )}
                        >
                          <Zap className="h-5 w-5 sm:h-6 sm:w-6" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center justify-between gap-2 mb-0.5">
                            <h3 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-[#F2F2F7]">
                              {standardName}
                            </h3>
                            <Badge
                              variant="outline"
                              className={cn(
                                "font-medium tabular-nums",
                                isSelected
                                  ? "bg-white/90 dark:bg-[#1C1C1E] border-blue-200 dark:border-[#16467A] text-blue-700 dark:text-[#4DA3FF]"
                                  : "bg-slate-50 dark:bg-[#262628] border-slate-200 dark:border-[#38383A] text-slate-700 dark:text-[#D1D1D6]",
                              )}
                            >
                              Elo: {getEloForType(standardEloType)}
                            </Badge>
                          </div>
                          <p className="text-sm text-slate-600 dark:text-[#D1D1D6] line-clamp-2">
                            {standardDesc}
                          </p>
                        </div>
                        <div
                          className={cn(
                            "h-5 w-5 rounded-full flex items-center justify-center shrink-0 border transition-colors",
                            isSelected
                              ? "bg-blue-600 dark:bg-[#0A6FE0] border-blue-600 dark:border-[#0A6FE0] text-white"
                              : "border-slate-300 dark:border-[#48484A]",
                          )}
                        >
                          {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </button>
              )
            })()}

            {/* Built-in: Arrow Duel */}
            {(() => {
              const arrowDuelName = t("sprint.arrowDuelName")
              const arrowDuelDesc = t("sprint.arrowDuelDesc")
              const arrowDuelEloType = getArrowDuelEloType()
              const isSelected = !isEditing && selectedRun.id === BUILTIN_ARROW_DUEL_ID

              if (isEditing) {
                return (
                  <Card className="bg-white dark:bg-[#1C1C1E] border-blue-200 dark:border-[#16467A] shadow-sm">
                    <CardContent className="p-3.5 sm:p-4">
                      <div className="flex items-center gap-3">
                        <div className="bg-blue-50/80 dark:bg-[#0B2A4D] border border-blue-100 dark:border-[#16467A] text-blue-600 dark:text-[#4DA3FF] p-2.5 rounded-xl shrink-0">
                          <Swords className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-sm sm:text-base font-semibold text-slate-900 dark:text-[#F2F2F7] truncate">
                              {arrowDuelName}
                            </h3>
                            <Badge
                              variant="outline"
                              className="bg-slate-50 dark:bg-[#262628] border-slate-200 dark:border-[#38383A] text-slate-700 dark:text-[#D1D1D6] text-xs font-medium tabular-nums"
                            >
                              Elo: {getEloForType(arrowDuelEloType)}
                            </Badge>
                          </div>
                          <p className="text-xs sm:text-sm text-slate-500 dark:text-[#AEAEB2] truncate">
                            {arrowDuelDesc}
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label={`Edit ${arrowDuelName}`}
                          onClick={() =>
                            openEditBuiltinRun({
                              id: BUILTIN_ARROW_DUEL_ID,
                              name: arrowDuelName,
                              eloType: arrowDuelEloType,
                              description: arrowDuelDesc,
                            })
                          }
                          className="h-8 w-8 text-blue-600 dark:text-[#4DA3FF] shrink-0"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )
              }

              return (
                <button
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => setSelectedRunId(BUILTIN_ARROW_DUEL_ID)}
                  className="w-full text-left block group focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-xl"
                >
                  <Card
                    className={cn(
                      "transition-all duration-150 shadow-sm",
                      isSelected
                        ? "bg-blue-50/70 dark:bg-[#0B2A4D]/75 border-blue-400 dark:border-[#2463A8] ring-1 ring-blue-400/40 dark:ring-[#4DA3FF]/30"
                        : "bg-white dark:bg-[#1C1C1E] border-slate-200 dark:border-[#38383A] hover:border-blue-200 dark:hover:border-[#2463A8]",
                    )}
                  >
                    <CardContent className="p-4 sm:p-5">
                      <div className="flex items-center gap-3.5 sm:gap-4">
                        <div
                          className={cn(
                            "p-3 rounded-xl shrink-0 transition-colors",
                            isSelected
                              ? "bg-blue-600 dark:bg-[#0A6FE0] text-white shadow-xs"
                              : "bg-blue-50/80 dark:bg-[#0B2A4D] border border-blue-100 dark:border-[#16467A] text-blue-600 dark:text-[#4DA3FF]",
                          )}
                        >
                          <Swords className="h-5 w-5 sm:h-6 sm:w-6" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center justify-between gap-2 mb-0.5">
                            <h3 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-[#F2F2F7]">
                              {arrowDuelName}
                            </h3>
                            <Badge
                              variant="outline"
                              className={cn(
                                "font-medium tabular-nums",
                                isSelected
                                  ? "bg-white/90 dark:bg-[#1C1C1E] border-blue-200 dark:border-[#16467A] text-blue-700 dark:text-[#4DA3FF]"
                                  : "bg-slate-50 dark:bg-[#262628] border-slate-200 dark:border-[#38383A] text-slate-700 dark:text-[#D1D1D6]",
                              )}
                            >
                              Elo: {getEloForType(arrowDuelEloType)}
                            </Badge>
                          </div>
                          <p className="text-sm text-slate-500 dark:text-[#AEAEB2] line-clamp-2">
                            {arrowDuelDesc}
                          </p>
                        </div>
                        <div
                          className={cn(
                            "h-5 w-5 rounded-full flex items-center justify-center shrink-0 border transition-colors",
                            isSelected
                              ? "bg-blue-600 dark:bg-[#0A6FE0] border-blue-600 dark:border-[#0A6FE0] text-white"
                              : "border-slate-300 dark:border-[#48484A]",
                          )}
                        >
                          {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </button>
              )
            })()}

            {/* User Customizable Saved Runs (starts with Blitz Sprint by default) */}
            {displayedCustomRuns.map((run, index) => {
              const targetCount = calculateTargetPuzzles(
                run.duration_minutes,
                run.per_puzzle_seconds,
              )
              const eloRating = getEloForType(eloTypeForSavedRun(run))
              const themeLabel = getThemeDisplayName(run.theme, locale)

              if (isEditing) {
                const isDragging = draggingRunId === run.id
                return (
                  <div
                    key={run.id}
                    ref={(el) => {
                      cardRefs.current[run.id] = el
                    }}
                    style={
                      isDragging
                        ? {
                            transform: `translate3d(0, ${dragOffsetY}px, 0) scale(1.015)`,
                            zIndex: 20,
                            position: "relative",
                          }
                        : undefined
                    }
                    className={cn(
                      "transition-transform duration-150",
                      isDragging && "transition-none",
                    )}
                  >
                    <Card
                      className={cn(
                        "bg-white dark:bg-[#1C1C1E] shadow-sm",
                        isDragging
                          ? "border-blue-500 dark:border-[#4DA3FF] ring-2 ring-blue-500/30 shadow-lg"
                          : "border-blue-200 dark:border-[#16467A]",
                      )}
                    >
                      <CardContent className="p-3.5 sm:p-4">
                        <div className="flex items-center gap-2.5 sm:gap-3.5">
                          <button
                            type="button"
                            aria-label={`Drag to reorder ${run.name}`}
                            onPointerDown={(e) => handleDragPointerDown(e, run.id)}
                            onPointerMove={handleDragPointerMove}
                            onPointerUp={handleDragPointerEnd}
                            onPointerCancel={handleDragPointerEnd}
                            className="touch-none select-none cursor-grab active:cursor-grabbing flex h-9 w-8 items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 dark:text-[#8E8E93] dark:hover:text-[#F2F2F7] hover:bg-slate-100 dark:hover:bg-[#2C2C2E] shrink-0"
                          >
                            <GripVertical className="h-5 w-5" />
                          </button>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-sm sm:text-base font-semibold text-slate-900 dark:text-[#F2F2F7] truncate">
                              {run.name}
                            </h3>
                            <p className="text-xs sm:text-sm text-slate-500 dark:text-[#AEAEB2] truncate">
                              {themeLabel} · {run.duration_minutes}m/{run.per_puzzle_seconds}s · {targetCount}
                            </p>
                          </div>
                          <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              aria-label={`Move ${run.name} up`}
                              disabled={index === 0}
                              onClick={() => moveRun(run.id, "up", customRuns)}
                              className="h-8 w-8 text-slate-500 dark:text-[#AEAEB2]"
                            >
                              <ArrowUp className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              aria-label={`Move ${run.name} down`}
                              disabled={index === displayedCustomRuns.length - 1}
                              onClick={() => moveRun(run.id, "down", customRuns)}
                              className="h-8 w-8 text-slate-500 dark:text-[#AEAEB2]"
                            >
                              <ArrowDown className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              aria-label={`Edit ${run.name}`}
                              onClick={() => openEditRun(run)}
                              className="h-8 w-8 text-blue-600 dark:text-[#4DA3FF]"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              aria-label={`Remove ${run.name}`}
                              onClick={() => removeRun(run.id, customRuns)}
                              className="h-8 w-8 text-red-600 dark:text-[#FF6961]"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )
              }

              const isSelected = selectedRun.id === run.id
              return (
                <button
                  key={run.id}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => setSelectedRunId(run.id)}
                  className="w-full text-left block group focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-xl"
                >
                  <Card
                    className={cn(
                      "transition-all duration-150 shadow-sm",
                      isSelected
                        ? "bg-blue-50/70 dark:bg-[#0B2A4D]/75 border-blue-400 dark:border-[#2463A8] ring-1 ring-blue-400/40 dark:ring-[#4DA3FF]/30"
                        : "bg-white dark:bg-[#1C1C1E] border-slate-200 dark:border-[#38383A] hover:border-blue-200 dark:hover:border-[#2463A8]",
                    )}
                  >
                    <CardContent className="p-4 sm:p-5">
                      <div className="flex items-center gap-3.5 sm:gap-4">
                        <div
                          className={cn(
                            "p-3 rounded-xl shrink-0 transition-colors",
                            isSelected
                              ? "bg-blue-600 dark:bg-[#0A6FE0] text-white shadow-xs"
                              : "bg-blue-50/80 dark:bg-[#0B2A4D] border border-blue-100 dark:border-[#16467A] text-blue-600 dark:text-[#4DA3FF]",
                          )}
                        >
                          <Target className="h-5 w-5 sm:h-6 sm:w-6" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center justify-between gap-2 mb-0.5">
                            <h3 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-[#F2F2F7]">
                              {run.name}
                            </h3>
                            <Badge
                              variant="outline"
                              className={cn(
                                "font-medium tabular-nums",
                                isSelected
                                  ? "bg-white/90 dark:bg-[#1C1C1E] border-blue-200 dark:border-[#16467A] text-blue-700 dark:text-[#4DA3FF]"
                                  : "bg-slate-50 dark:bg-[#262628] border-slate-200 dark:border-[#38383A] text-slate-700 dark:text-[#D1D1D6]",
                              )}
                            >
                              Elo: {eloRating}
                            </Badge>
                          </div>
                          <p className="text-sm text-slate-500 dark:text-[#AEAEB2] line-clamp-2">
                            {run.duration_minutes}m / {run.per_puzzle_seconds}s • {themeLabel} • {t("runModal.puzzlesCount", { count: targetCount })}
                          </p>
                        </div>
                        <div
                          className={cn(
                            "h-5 w-5 rounded-full flex items-center justify-center shrink-0 border transition-colors",
                            isSelected
                              ? "bg-blue-600 dark:bg-[#0A6FE0] border-blue-600 dark:border-[#0A6FE0] text-white"
                              : "border-slate-300 dark:border-[#48484A]",
                          )}
                        >
                          {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </button>
              )
            })}

            {isStaging && (
              <Link
                href="/puzzle-sprint/regression"
                className="block pt-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-xl"
              >
                <Card className="border-dashed border-amber-300 dark:border-amber-800/80 bg-amber-50/50 dark:bg-amber-950/20 hover:border-amber-400 dark:hover:border-amber-700 transition-colors shadow-none">
                  <CardContent className="p-3.5 sm:p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="p-2 rounded-lg bg-amber-100/80 dark:bg-amber-950/70 text-amber-700 dark:text-[#FFB340] shrink-0">
                          <FlaskConical className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-slate-900 dark:text-[#F2F2F7] truncate">
                              Regression Test Suite
                            </span>
                            <Badge className="bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-[#FFB340] border border-amber-200 dark:border-amber-800 text-[10px]">
                              Staging Only
                            </Badge>
                          </div>
                          <p className="text-xs text-slate-500 dark:text-[#AEAEB2] truncate">
                            Promotions, underpromotions, Arrow Duel promotions, and Mistake Review
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-slate-400 dark:text-[#8E8E93] shrink-0" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )}
          </div>
        </MobileContainer>

        <PracticeRunEditorModal
          open={editorOpen}
          onOpenChange={setEditorOpen}
          initialRun={editingRun}
          builtinRun={editingBuiltinRun}
          getEloForType={getEloForType}
          isSaving={isSavingRun}
          onSave={handleSaveRun}
        />

        <HowSprintWorksModal
          open={howItWorksOpen}
          onOpenChange={setHowItWorksOpen}
        />

        <Footer hideOnMobile={true} />
      </div>
    </MobileLayout>
  )
}
