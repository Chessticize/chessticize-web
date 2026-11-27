"use client"

import Link from "next/link"
import { ArrowRight, Clock, Gauge, ShieldAlert, Target } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type {
  GameReviewTimeClass,
  V2GameReviewDiagnosis,
} from "@/hooks/useGameReviewData"
import { useI18n } from "@/components/i18n/i18n-provider"

interface WeaknessDiagnosisSectionProps {
  diagnosis?: V2GameReviewDiagnosis
  activeTimeClass?: GameReviewTimeClass
  onSelectTimeClass?: (next: GameReviewTimeClass) => void
}

const VALID_CLICKABLE_TIME_CLASSES = new Set<GameReviewTimeClass>([
  "rapid",
  "blitz",
  "bullet",
  "classical",
  "daily",
])

export function WeaknessDiagnosisSection({
  diagnosis,
  activeTimeClass = "",
  onSelectTimeClass,
}: WeaknessDiagnosisSectionProps) {
  const { t, getThemeName } = useI18n()

  if (!diagnosis) return null

  const hasAnySignal =
    diagnosis.priority_weaknesses.length > 0 ||
    diagnosis.own_mistake_causes.length > 0 ||
    diagnosis.time_class_breakdown.length > 0 ||
    diagnosis.clock_breakdown.total_with_clock > 0

  if (!hasAnySignal) return null

  const timeClassSuffix = activeTimeClass
    ? `&time_class=${encodeURIComponent(activeTimeClass)}`
    : ""

  const causeLabel = (cause: string): string => {
    switch (cause) {
      case "hanging_piece":
        return t("diagnosis.cause.hanging_piece")
      case "tactical_trap":
        return t("diagnosis.cause.tactical_trap")
      case "missed_mate_threat":
        return t("diagnosis.cause.missed_mate_threat")
      case "positional_or_endgame":
        return t("diagnosis.cause.positional_or_endgame")
      default:
        return cause
    }
  }

  const timeClassLabel = (tc: string): string => {
    switch (tc) {
      case "rapid":
        return t("timeClass.rapid")
      case "blitz":
        return t("timeClass.blitz")
      case "bullet":
        return t("timeClass.bullet")
      case "classical":
        return t("timeClass.classical")
      case "daily":
        return t("timeClass.daily")
      default:
        return tc
    }
  }

  const clock = diagnosis.clock_breakdown

  return (
    <section aria-label={t("diagnosis.sectionTitle")} className="space-y-4">
      <h2 className="text-lg font-semibold tracking-tight text-slate-900">
        {t("diagnosis.sectionTitle")}
      </h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1. Priority Tactical Blindspots (Smoothed Impact Ranking) */}
        {diagnosis.priority_weaknesses.length > 0 && (
          <Card className="bg-white border-slate-200 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base font-semibold tracking-tight text-slate-900">
                <Target className="h-4 w-4 text-rose-600" />
                <span>{t("diagnosis.priorityBlindspots")}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {diagnosis.priority_weaknesses.map((item) => {
                const smoothedPct = Math.round(item.smoothed_capture_rate * 100)
                const href = `/puzzles?tags=${encodeURIComponent(item.tag)}${timeClassSuffix}`
                return (
                  <Link
                    key={item.tag}
                    href={href}
                    className="group block rounded-lg border border-slate-100 hover:border-blue-200 hover:bg-blue-50/40 p-2.5 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2 text-sm">
                      <span className="font-medium text-slate-900 group-hover:text-blue-700">
                        {getThemeName(item.tag)}
                      </span>
                      <div className="flex items-center gap-2 tabular-nums text-xs text-slate-600">
                        <span>
                          {item.caught_count}/{item.total_count}
                        </span>
                        <span
                          className={cn(
                            "font-semibold",
                            smoothedPct < 45
                              ? "text-rose-600"
                              : smoothedPct < 65
                                ? "text-amber-600"
                                : "text-emerald-600",
                          )}
                        >
                          {smoothedPct}%
                        </span>
                        <ArrowRight className="h-3.5 w-3.5 text-slate-400 group-hover:text-blue-600" />
                      </div>
                    </div>
                    <div className="mt-1.5 h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full",
                          smoothedPct < 45
                            ? "bg-rose-500"
                            : smoothedPct < 65
                              ? "bg-amber-500"
                              : "bg-emerald-500",
                        )}
                        style={{ width: `${Math.max(4, smoothedPct)}%` }}
                      />
                    </div>
                  </Link>
                )
              })}
            </CardContent>
          </Card>
        )}

        {/* 2. Why You Blunder (Own-Mistake Root Causes) */}
        {diagnosis.own_mistake_causes.length > 0 && (
          <Card className="bg-white border-slate-200 shadow-sm flex flex-col">
            <CardHeader className="pb-3 flex-row items-center justify-between space-y-0">
              <CardTitle className="flex items-center gap-2 text-base font-semibold tracking-tight text-slate-900">
                <ShieldAlert className="h-4 w-4 text-amber-600" />
                <span>{t("diagnosis.ownMistakeCauses")}</span>
              </CardTitle>
              <Link
                href={`/review-queue?mode=arrow_duel&puzzle_source=user_game&theme_groups=own_mistake_punished,own_mistake_escaped${timeClassSuffix}`}
              >
                <Button variant="outline" size="sm" className="h-8 text-xs border-slate-200 text-slate-700">
                  {t("diagnosis.practiceBlunders")}
                  <ArrowRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="space-y-3 flex-1">
              {diagnosis.own_mistake_causes.map((item) => {
                const pct = Math.round(item.share * 100)
                return (
                  <div key={item.cause} className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-slate-800">{causeLabel(item.cause)}</span>
                      <span className="tabular-nums text-xs text-slate-600">
                        {item.count} ({pct}%)
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-amber-500"
                        style={{ width: `${Math.max(4, pct)}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </CardContent>
          </Card>
        )}

        {/* 3. Time Control Comparison (Rapid vs Blitz vs Bullet) */}
        {diagnosis.time_class_breakdown.length > 0 && (
          <Card className="bg-white border-slate-200 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base font-semibold tracking-tight text-slate-900">
                <Gauge className="h-4 w-4 text-blue-600" />
                <span>{t("diagnosis.timeControlCompare")}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {diagnosis.time_class_breakdown.map((row) => {
                  const tc = row.time_class as GameReviewTimeClass
                  const clickable = Boolean(onSelectTimeClass && VALID_CLICKABLE_TIME_CLASSES.has(tc))
                  const isActive = activeTimeClass === tc
                  const recPct = Math.round(row.recognition_rate * 100)
                  return (
                    <button
                      key={row.time_class}
                      type="button"
                      disabled={!clickable}
                      onClick={() => clickable && onSelectTimeClass?.(isActive ? "" : tc)}
                      className={cn(
                        "w-full flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors",
                        isActive
                          ? "border-blue-300 bg-blue-50/70"
                          : "border-slate-100 hover:border-slate-200 hover:bg-slate-50/70",
                        !clickable && "cursor-default",
                      )}
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-slate-900">
                          {timeClassLabel(row.time_class)}
                        </div>
                        <div className="text-xs text-slate-500 tabular-nums">
                          {row.games}
                        </div>
                      </div>
                      <div className="flex items-center gap-5 tabular-nums text-right">
                        <div>
                          <div className="text-sm font-semibold text-slate-900">{recPct}%</div>
                          <div className="text-[11px] text-slate-500">{t("diagnosis.recognitionShort")}</div>
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-slate-900">
                            {row.mistakes_per_game.toFixed(1)}
                          </div>
                          <div className="text-[11px] text-slate-500">{t("diagnosis.mistakesPerGameShort")}</div>
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* 4. Clock & Timing Diagnosis (Time Trouble vs Impulsive vs Calculation Gap) */}
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardHeader className="pb-3 flex-row items-center justify-between space-y-0">
            <CardTitle className="flex items-center gap-2 text-base font-semibold tracking-tight text-slate-900">
              <Clock className="h-4 w-4 text-blue-600" />
              <span>{t("diagnosis.clockTiming")}</span>
            </CardTitle>
            {clock.total_with_clock > 0 && clock.avg_time_spent_sec > 0 && (
              <span className="text-xs font-medium text-slate-500 tabular-nums">
                {t("diagnosis.avgThinkTime", { sec: clock.avg_time_spent_sec.toFixed(1) })}
              </span>
            )}
          </CardHeader>
          <CardContent>
            {clock.total_with_clock === 0 ? (
              <p className="text-sm text-slate-500 py-4">{t("diagnosis.noClockData")}</p>
            ) : (
              <div className="space-y-4">
                <div className="h-3 w-full rounded-full bg-slate-100 overflow-hidden flex">
                  {clock.time_trouble_rate > 0 && (
                    <div
                      className="h-full bg-amber-500"
                      style={{ width: `${(clock.time_trouble_rate * 100).toFixed(1)}%` }}
                    />
                  )}
                  {clock.impulsive_rate > 0 && (
                    <div
                      className="h-full bg-rose-500"
                      style={{ width: `${(clock.impulsive_rate * 100).toFixed(1)}%` }}
                    />
                  )}
                  {clock.deliberate_rate > 0 && (
                    <div
                      className="h-full bg-blue-500"
                      style={{ width: `${(clock.deliberate_rate * 100).toFixed(1)}%` }}
                    />
                  )}
                </div>

                <div className="grid grid-cols-3 gap-3 tabular-nums">
                  <div className="rounded-lg border border-slate-100 p-2.5">
                    <div className="flex items-center gap-1.5 text-xs text-slate-600">
                      <span className="h-2 w-2 rounded-full bg-amber-500 shrink-0" />
                      <span className="truncate">{t("diagnosis.timeTrouble")}</span>
                    </div>
                    <div className="mt-1 text-lg font-semibold text-slate-900">
                      {Math.round(clock.time_trouble_rate * 100)}%
                    </div>
                    <div className="text-xs text-slate-500">{clock.time_trouble_count}</div>
                  </div>

                  <div className="rounded-lg border border-slate-100 p-2.5">
                    <div className="flex items-center gap-1.5 text-xs text-slate-600">
                      <span className="h-2 w-2 rounded-full bg-rose-500 shrink-0" />
                      <span className="truncate">{t("diagnosis.impulsive")}</span>
                    </div>
                    <div className="mt-1 text-lg font-semibold text-slate-900">
                      {Math.round(clock.impulsive_rate * 100)}%
                    </div>
                    <div className="text-xs text-slate-500">{clock.impulsive_count}</div>
                  </div>

                  <div className="rounded-lg border border-slate-100 p-2.5">
                    <div className="flex items-center gap-1.5 text-xs text-slate-600">
                      <span className="h-2 w-2 rounded-full bg-blue-500 shrink-0" />
                      <span className="truncate">{t("diagnosis.deliberate")}</span>
                    </div>
                    <div className="mt-1 text-lg font-semibold text-slate-900">
                      {Math.round(clock.deliberate_rate * 100)}%
                    </div>
                    <div className="text-xs text-slate-500">{clock.deliberate_count}</div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  )
}
