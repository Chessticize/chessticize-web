"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { BarChart3 } from "lucide-react"
import { cn } from "@/lib/utils"
import { useI18n } from "@/components/i18n/i18n-provider"

interface QuickStatsCardProps {
  totalGames: number
  totalOpportunities: number
  averagePuzzleLength: number
  isLoading?: boolean
  className?: string
}

export function QuickStatsCard({
  totalGames,
  totalOpportunities,
  averagePuzzleLength,
  isLoading = false,
  className,
}: QuickStatsCardProps) {
  const { t } = useI18n()

  if (isLoading) {
    return (
      <Card className={cn("border-slate-200 bg-white shadow-sm", className)}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-semibold tracking-tight text-slate-900">
            <BarChart3 className="h-4 w-4 text-slate-500" />
            <span>{t("gameReview.quickStats")}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center justify-between py-1">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-4 w-14" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn("border-slate-200 bg-white shadow-sm flex flex-col", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-semibold tracking-tight text-slate-900">
          <BarChart3 className="h-4 w-4 text-blue-600" />
          <span>{t("gameReview.quickStats")}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col justify-between">
        <div className="divide-y divide-slate-100">
          <div className="flex justify-between items-center py-2.5 first:pt-0">
            <span className="text-sm text-slate-600">{t("gameReview.gamesAnalyzed")}</span>
            <span className="text-sm font-semibold tabular-nums text-slate-900">
              {totalGames.toLocaleString()}
            </span>
          </div>

          <div className="flex justify-between items-center py-2.5">
            <span className="text-sm text-slate-600">{t("gameReview.totalOpportunities")}</span>
            <span className="text-sm font-semibold tabular-nums text-slate-900">
              {totalOpportunities.toLocaleString()}
            </span>
          </div>

          <div className="flex justify-between items-center py-2.5 last:pb-0">
            <span className="text-sm text-slate-600">{t("gameReview.avgPuzzleLength")}</span>
            <span className="text-sm font-semibold tabular-nums text-slate-900">
              {t("gameReview.movesUnit", { count: averagePuzzleLength.toFixed(1) })}
            </span>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-slate-100">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span
              className={cn(
                "h-2 w-2 rounded-full",
                totalGames > 0 ? "bg-emerald-500" : "bg-slate-300"
              )}
            />
            <span>{totalGames > 0 ? t("gameReview.activeAnalysis") : t("gameReview.noDataYet")}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
