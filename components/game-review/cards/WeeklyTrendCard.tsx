"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts"
import { Calendar, TrendingUp, BarChart3 } from "lucide-react"
import { cn } from "@/lib/utils"
import { GameReviewData } from "@/hooks/useGameReviewData"

interface WeeklyTrendCardProps {
  data: GameReviewData | null
  isLoading?: boolean
  className?: string
}

export function WeeklyTrendCard({
  data,
  isLoading = false,
  className,
}: WeeklyTrendCardProps) {
  if (isLoading) {
    return (
      <Card className={cn("border-slate-200 bg-white shadow-sm", className)}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-semibold tracking-tight text-slate-900">
            <Calendar className="h-4 w-4 text-slate-500" />
            <span>Weekly Trends</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Skeleton className="h-32 w-full" />
            <div className="flex justify-between">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-16" />
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  const recognitionData = data?.opponentMistakesTimeSeries?.nodes?.map(node => {
    let caught = 0
    let missed = 0

    node.stats.theme_counts.forEach(theme => {
      if (theme.theme.includes('caught')) {
        caught += theme.count
      } else if (theme.theme.includes('missed')) {
        missed += theme.count
      }
    })

    const total = caught + missed
    const rate = total > 0 ? (caught / total) * 100 : 0

    const date = new Date(node.start_time)
    const label = date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    })

    return {
      week: label,
      recognitionRate: rate,
      label: `Week of ${label}`,
    }
  }) || []

  const mistakesData = data?.myMistakesTimeSeries?.nodes?.map(node => {
    const totalMistakes = node.stats.total_count || 0
    const totalGames = node.stats.unique_game_count || 0
    const mistakesPerGame = totalGames > 0 ? totalMistakes / totalGames : 0

    const date = new Date(node.start_time)
    const label = date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    })

    return {
      week: label,
      mistakesPerGame,
      label: `Week of ${label}`,
    }
  }) || []

  if (!recognitionData.length && !mistakesData.length) {
    return (
      <Card className={cn("border-slate-200 bg-white shadow-sm", className)}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-semibold tracking-tight text-slate-900">
            <Calendar className="h-4 w-4 text-slate-500" />
            <span>Weekly Trends</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-32 flex items-center justify-center text-slate-500">
            <div className="flex flex-col items-center text-center">
              <BarChart3 className="h-5 w-5 text-slate-300 mb-2" />
              <p className="text-sm">No trend data yet</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  const chartData = recognitionData.length > 0
    ? recognitionData.map(item => ({ ...item, rate: item.recognitionRate }))
    : mistakesData.map(item => ({ ...item, rate: item.mistakesPerGame }))

  const getTrend = () => {
    if (chartData.length < 2) return { direction: 'stable', change: 0 }

    const recent = chartData.slice(-4)
    if (recent.length < 2) return { direction: 'stable', change: 0 }

    const firstHalf = recent.slice(0, Math.floor(recent.length / 2))
    const secondHalf = recent.slice(Math.floor(recent.length / 2))

    const firstAvg = firstHalf.reduce((sum, d) => sum + d.rate, 0) / firstHalf.length
    const secondAvg = secondHalf.reduce((sum, d) => sum + d.rate, 0) / secondHalf.length

    const change = secondAvg - firstAvg

    if (Math.abs(change) < 2) return { direction: 'stable', change }
    return { direction: change > 0 ? 'improving' : 'declining', change }
  }

  const trend = getTrend()
  const currentRate = chartData.length > 0 ? chartData[chartData.length - 1].rate : 0
  const bestRate = chartData.length > 0 ? Math.max(...chartData.map(d => d.rate)) : 0

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-slate-200 rounded-lg shadow-sm">
          <p className="text-sm font-medium text-slate-900">{label}</p>
          <p className="text-sm text-slate-600 tabular-nums">
            Recognition Rate: <span className="font-semibold text-slate-900">{payload[0].value.toFixed(1)}%</span>
          </p>
        </div>
      )
    }
    return null
  }

  return (
    <Card className={cn("border-slate-200 bg-white shadow-sm", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-semibold tracking-tight text-slate-900">
          <Calendar className="h-4 w-4 text-slate-500" />
          <span>Weekly Recognition Trend</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="h-32">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <XAxis
                  dataKey="week"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  interval="preserveStartEnd"
                />
                <YAxis hide />
                <Tooltip content={<CustomTooltip />} />
                <Line
                  type="monotone"
                  dataKey="rate"
                  stroke="#2563eb"
                  strokeWidth={2}
                  dot={{ fill: '#2563eb', strokeWidth: 2, r: 3 }}
                  activeDot={{ r: 4, fill: '#1d4ed8' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-100 text-sm">
            <div className="text-center">
              <div className="font-semibold tabular-nums text-slate-900">{currentRate.toFixed(1)}%</div>
              <div className="text-xs text-slate-500">Current</div>
            </div>
            <div className="text-center">
              <div className="font-semibold tabular-nums text-slate-900">{bestRate.toFixed(1)}%</div>
              <div className="text-xs text-slate-500">Best</div>
            </div>
            <div className="text-center">
              <div className={cn(
                "font-semibold flex items-center justify-center gap-1",
                trend.direction === 'improving' && "text-emerald-600",
                trend.direction === 'declining' && "text-rose-600",
                trend.direction === 'stable' && "text-slate-600"
              )}>
                {trend.direction === 'improving' && <TrendingUp className="h-3.5 w-3.5" />}
                <span className="capitalize">{trend.direction}</span>
              </div>
              <div className="text-xs text-slate-500">Trend</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
