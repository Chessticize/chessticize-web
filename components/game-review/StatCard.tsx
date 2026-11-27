"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { LucideIcon, TrendingUp, TrendingDown, Minus } from "lucide-react"
import { cn } from "@/lib/utils"

export interface StatCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon?: LucideIcon
  trend?: {
    value: number
    label: string
    direction: 'up' | 'down' | 'neutral'
  }
  badge?: {
    text: string
    variant?: 'default' | 'secondary' | 'destructive' | 'outline'
  }
  colorScheme?: 'green' | 'blue' | 'purple' | 'orange' | 'gray'
  isLoading?: boolean
  className?: string
}

const colorSchemes = {
  green: {
    icon: 'text-emerald-600',
    badge: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  },
  blue: {
    icon: 'text-blue-600',
    badge: 'bg-blue-50 text-blue-700 border border-blue-200',
  },
  purple: {
    icon: 'text-slate-600',
    badge: 'bg-slate-100 text-slate-700 border border-slate-200',
  },
  orange: {
    icon: 'text-amber-600',
    badge: 'bg-amber-50 text-amber-700 border border-amber-200',
  },
  gray: {
    icon: 'text-slate-500',
    badge: 'bg-slate-100 text-slate-700 border border-slate-200',
  },
}

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  badge,
  colorScheme = 'gray',
  isLoading = false,
  className,
}: StatCardProps) {
  const colors = colorSchemes[colorScheme]

  if (isLoading) {
    return (
      <Card className={cn('border-slate-200 bg-white shadow-sm', className)}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-semibold tracking-tight text-slate-900">
            {Icon && <Icon className={cn('h-4 w-4', colors.icon)} />}
            <Skeleton className="h-5 w-24" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Skeleton className="h-8 w-16" />
            {subtitle && <Skeleton className="h-4 w-20" />}
            {badge && <Skeleton className="h-6 w-16 rounded-full" />}
          </div>
        </CardContent>
      </Card>
    )
  }

  const TrendIcon =
    trend?.direction === 'up'
      ? TrendingUp
      : trend?.direction === 'down'
        ? TrendingDown
        : Minus

  return (
    <Card className={cn('border-slate-200 bg-white shadow-sm transition-colors hover:border-slate-300', className)}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-semibold tracking-tight text-slate-900">
          {Icon && <Icon className={cn('h-4 w-4', colors.icon)} />}
          <span>{title}</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="text-3xl font-semibold tracking-tight tabular-nums text-slate-900">
            {typeof value === 'number' ? value.toLocaleString() : value}
          </div>

          {subtitle && (
            <p className="text-sm text-slate-500">{subtitle}</p>
          )}

          <div className="flex items-center justify-between gap-2">
            {badge && (
              <Badge
                variant={badge.variant || 'secondary'}
                className={cn('font-medium shadow-none', colors.badge)}
              >
                {badge.text}
              </Badge>
            )}

            {trend && (
              <div
                className={cn(
                  'flex items-center gap-1 text-sm tabular-nums',
                  trend.direction === 'up'
                    ? 'text-emerald-600'
                    : trend.direction === 'down'
                      ? 'text-rose-600'
                      : 'text-slate-500'
                )}
              >
                <TrendIcon className="h-4 w-4" />
                <span className="font-medium">
                  {trend.value > 0 ? '+' : ''}
                  {trend.value}%
                </span>
                <span className="text-slate-500">{trend.label}</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
