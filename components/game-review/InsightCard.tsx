"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { ChevronRight, Lightbulb, TrendingUp, AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils"

export interface InsightCardProps {
  title: string
  type: 'strength' | 'weakness' | 'trend' | 'recommendation'
  description: string
  metrics?: Array<{
    label: string
    value: string | number
    trend?: 'up' | 'down' | 'neutral'
  }>
  recommendations?: string[]
  actionButton?: {
    text: string
    onClick: () => void
  }
  isLoading?: boolean
  className?: string
}

const typeConfig = {
  strength: {
    icon: TrendingUp,
    colors: {
      icon: 'text-emerald-600',
      badge: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    },
    badgeText: 'Strength',
  },
  weakness: {
    icon: AlertTriangle,
    colors: {
      icon: 'text-rose-600',
      badge: 'bg-rose-50 text-rose-700 border border-rose-200',
    },
    badgeText: 'Area for Improvement',
  },
  trend: {
    icon: TrendingUp,
    colors: {
      icon: 'text-blue-600',
      badge: 'bg-blue-50 text-blue-700 border border-blue-200',
    },
    badgeText: 'Trend',
  },
  recommendation: {
    icon: Lightbulb,
    colors: {
      icon: 'text-amber-600',
      badge: 'bg-amber-50 text-amber-700 border border-amber-200',
    },
    badgeText: 'Recommendation',
  },
}

export function InsightCard({
  title,
  type,
  description,
  metrics,
  recommendations,
  actionButton,
  isLoading = false,
  className,
}: InsightCardProps) {
  const config = typeConfig[type]
  const Icon = config.icon

  if (isLoading) {
    return (
      <Card className={cn('border-slate-200 bg-white shadow-sm', className)}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Icon className={cn('h-4 w-4', config.colors.icon)} />
              <Skeleton className="h-5 w-32" />
            </div>
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn('border-slate-200 bg-white shadow-sm transition-colors hover:border-slate-300', className)}>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base font-semibold tracking-tight text-slate-900">
            <Icon className={cn('h-4 w-4', config.colors.icon)} />
            <span>{title}</span>
          </CardTitle>
          <Badge variant="secondary" className={cn('font-medium shadow-none', config.colors.badge)}>
            {config.badgeText}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <p className="text-sm text-slate-600 leading-relaxed">{description}</p>

        {metrics && metrics.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {metrics.map((metric, index) => (
              <div key={index} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-sm text-slate-600">{metric.label}</span>
                <div className="flex items-center gap-2">
                  <span className="font-semibold tabular-nums text-slate-900">
                    {typeof metric.value === 'number' ? metric.value.toLocaleString() : metric.value}
                  </span>
                  {metric.trend && (
                    <div
                      className={cn(
                        'w-2 h-2 rounded-full',
                        metric.trend === 'up'
                          ? 'bg-emerald-500'
                          : metric.trend === 'down'
                            ? 'bg-rose-500'
                            : 'bg-slate-400'
                      )}
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {recommendations && recommendations.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-slate-900">Recommendations:</h4>
            <ul className="space-y-1">
              {recommendations.map((rec, index) => (
                <li key={index} className="flex items-start gap-2 text-sm text-slate-600">
                  <ChevronRight className="h-4 w-4 mt-0.5 text-slate-400 flex-shrink-0" />
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {actionButton && (
          <Button
            onClick={actionButton.onClick}
            className="w-full mt-4 border-slate-200 text-slate-700 hover:bg-slate-50"
            variant="outline"
          >
            {actionButton.text}
            <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
