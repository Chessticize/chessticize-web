"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Target } from "lucide-react"
import { cn } from "@/lib/utils"
import { GameReviewData } from "@/hooks/useGameReviewData"
import { isThemeExcluded, getThemeDisplayName } from "@/lib/theme-config"
import { useI18n } from "@/components/i18n/i18n-provider"

interface TopMissedThemesCardProps {
  data: GameReviewData | null
  isLoading?: boolean
  className?: string
}

interface ThemeWithMissRate {
  theme: string
  displayName: string
  missed: number
  caught: number
  total: number
  missRate: number
}

export function TopMissedThemesCard({
  data,
  isLoading = false,
  className,
}: TopMissedThemesCardProps) {
  const { t, locale } = useI18n()

  if (isLoading) {
    return (
      <Card className={cn("border-slate-200 bg-white shadow-sm", className)}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-semibold tracking-tight text-slate-900">
            <Target className="h-4 w-4 text-slate-500" />
            <span>{t("gameReview.topMissedThemes")}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex justify-between items-center py-1">
                <Skeleton className="h-4 w-28" />
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-12" />
                  <Skeleton className="h-5 w-14 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  const processTopMissedThemes = (): ThemeWithMissRate[] => {
    if (!data?.opponentMistakesMissed3M?.tag_counts || !data?.opponentMistakesCaught3M?.tag_counts) {
      return []
    }

    const missedMap = new Map<string, number>()
    const caughtMap = new Map<string, number>()

    data.opponentMistakesMissed3M.tag_counts.forEach(item => {
      if (!isThemeExcluded(item.tag)) {
        missedMap.set(item.tag, item.count)
      }
    })

    data.opponentMistakesCaught3M.tag_counts.forEach(item => {
      if (!isThemeExcluded(item.tag)) {
        caughtMap.set(item.tag, item.count)
      }
    })

    const allTags = new Set([...missedMap.keys(), ...caughtMap.keys()])

    return Array.from(allTags)
      .map(tag => {
        const missed = missedMap.get(tag) || 0
        const caught = caughtMap.get(tag) || 0
        const total = missed + caught
        const missRate = total > 0 ? (missed / total) * 100 : 0

        return {
          theme: tag,
          displayName: getThemeDisplayName(tag, locale),
          missed,
          caught,
          total,
          missRate: Math.round(missRate * 10) / 10,
        }
      })
      .filter(item => item.missed > 0)
      .sort((a, b) => b.missed - a.missed)
      .slice(0, 5)
  }

  const topMissedThemes = processTopMissedThemes()

  if (topMissedThemes.length === 0) {
    return (
      <Card className={cn("border-slate-200 bg-white shadow-sm", className)}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-semibold tracking-tight text-slate-900">
            <Target className="h-4 w-4 text-slate-500" />
            <span>{t("gameReview.topMissedThemes")}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center text-slate-500">
            <Target className="h-6 w-6 text-slate-300 mb-2" />
            <p className="text-sm">{t("gameReview.noMissedOpportunities")}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn("border-slate-200 bg-white shadow-sm", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-semibold tracking-tight text-slate-900">
          <Target className="h-4 w-4 text-blue-600" />
          <span>{t("gameReview.topMissedThemes")}</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="divide-y divide-slate-100">
          {topMissedThemes.map((theme, index) => (
            <div key={theme.theme} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="w-5 text-xs font-medium tabular-nums text-slate-400">
                  #{index + 1}
                </span>
                <span className="text-sm font-medium text-slate-900 truncate">
                  {theme.displayName}
                </span>
              </div>
              <div className="flex items-center gap-3 shrink-0 text-sm tabular-nums">
                <span className="text-slate-500">
                  <span className="font-semibold text-slate-900">{theme.missed}</span> {t("gameReview.missedCount")}
                </span>
                <span
                  className={cn(
                    "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
                    theme.missRate <= 30
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : theme.missRate <= 50
                        ? "bg-amber-50 text-amber-700 border-amber-200"
                        : "bg-rose-50 text-rose-700 border-rose-200"
                  )}
                >
                  {theme.missRate.toFixed(1)}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
