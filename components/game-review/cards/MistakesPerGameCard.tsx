"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { AlertTriangle, TrendingUp, TrendingDown, Minus } from "lucide-react"
import { cn } from "@/lib/utils"
import { useI18n } from "@/components/i18n/i18n-provider"

interface MistakesPerGameCardProps {
  mistakesPerGame: number
  previousPeriod?: number
  trend?: number
  isLoading?: boolean
  className?: string
}

export function MistakesPerGameCard({
  mistakesPerGame,
  trend = 0,
  isLoading = false,
  className,
}: MistakesPerGameCardProps) {
  const { t } = useI18n()

  if (isLoading) {
    return (
      <Card className={cn("border-slate-200 bg-white shadow-sm", className)}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-semibold tracking-tight text-slate-900">
            <AlertTriangle className="h-4 w-4 text-slate-500" />
            <span>{t("gameReview.myMistakesPerGame")}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Skeleton className="h-10 w-16" />
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-6 w-24 rounded-full" />
          </div>
        </CardContent>
      </Card>
    )
  }

  const getStatus = (rate: number) => {
    if (rate <= 1.5) return { color: 'emerald' as const, label: t("gameReview.strong") }
    if (rate <= 2.5) return { color: 'amber' as const, label: t("gameReview.needsWork") }
    return { color: 'rose' as const, label: t("gameReview.focusArea") }
  }

  // Negative trend is good for mistakes
  const getTrendIcon = () => {
    if (Math.abs(trend) < 0.1) return <Minus className="h-4 w-4" />
    return trend < 0 ? <TrendingDown className="h-4 w-4" /> : <TrendingUp className="h-4 w-4" />
  }

  const getTrendColor = () => {
    if (Math.abs(trend) < 0.1) return 'text-slate-500'
    return trend < 0 ? 'text-emerald-600' : 'text-rose-600'
  }

  const getTrendLabel = () => {
    if (Math.abs(trend) < 0.1) return t("gameReview.stable")
    return trend < 0 ? t("gameReview.improving") : t("gameReview.declining")
  }

  const status = getStatus(mistakesPerGame)

  return (
    <Card className={cn("border-slate-200 bg-white shadow-sm", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-semibold tracking-tight text-slate-900">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <span>{t("gameReview.myMistakesPerGame")}</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="text-4xl font-semibold tracking-tight tabular-nums text-slate-900">
            {mistakesPerGame.toFixed(1)}
          </div>

          <div className="flex items-center gap-2 text-sm">
            <div className={cn("inline-flex items-center gap-1 font-medium tabular-nums", getTrendColor())}>
              {getTrendIcon()}
              <span>
                {Math.abs(trend) < 0.1 ? t("gameReview.stable") : `${trend > 0 ? '+' : ''}${trend.toFixed(1)}`}
              </span>
            </div>
            <span className="text-slate-300">·</span>
            <span className="text-slate-500">{t("gameReview.thisWeek")}</span>
          </div>

          <div className="pt-1">
            <Badge
              variant="secondary"
              className={cn(
                "inline-flex items-center gap-1.5 font-medium shadow-none",
                status.color === 'emerald' && "bg-emerald-50 text-emerald-700 border border-emerald-200",
                status.color === 'amber' && "bg-amber-50 text-amber-700 border border-amber-200",
                status.color === 'rose' && "bg-rose-50 text-rose-700 border border-rose-200"
              )}
            >
              <span
                className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  status.color === 'emerald' && "bg-emerald-500",
                  status.color === 'amber' && "bg-amber-500",
                  status.color === 'rose' && "bg-rose-500"
                )}
              />
              {getTrendLabel()}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
