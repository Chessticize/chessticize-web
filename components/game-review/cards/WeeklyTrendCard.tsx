"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts"
import { Calendar, TrendingUp, TrendingDown } from "lucide-react"
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
  className
}: WeeklyTrendCardProps) {
  if (isLoading) {
    return (
      <Card className={cn("border-blue-200 bg-blue-50", className)}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center space-x-2 text-blue-800">
            <Calendar className="h-5 w-5" />
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

  // Process recognition rate data
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
      day: 'numeric'
    })

    return {
      week: label,
      recognitionRate: rate,
      label: `Week of ${label}`
    }
  }) || []

  // Process mistakes per game data
  const mistakesData = data?.myMistakesTimeSeries?.nodes?.map(node => {
    const totalMistakes = node.stats.total_count || 0
    const totalGames = node.stats.unique_game_count || 0
    const mistakesPerGame = totalGames > 0 ? totalMistakes / totalGames : 0

    const date = new Date(node.start_time)
    const label = date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    })

    return {
      week: label,
      mistakesPerGame: mistakesPerGame,
      label: `Week of ${label}`
    }
  }) || []

  if (!recognitionData.length && !mistakesData.length) {
    return (
      <Card className={cn("border-blue-200 bg-blue-50", className)}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center space-x-2 text-blue-800">
            <Calendar className="h-5 w-5" />
            <span>Weekly Trends</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-32 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <div className="text-2xl mb-1">📊</div>
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

  // Calculate trend direction
  const getTrend = () => {
    if (chartData.length < 2) return { direction: 'stable', change: 0 }
    
    const recent = chartData.slice(-4) // Last 4 weeks
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

  // Custom tooltip for the chart
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-blue-200 rounded-lg shadow-lg">
          <p className="text-sm font-medium text-blue-900">{label}</p>
          <p className="text-sm text-blue-700">
            Recognition Rate: {payload[0].value.toFixed(1)}%
          </p>
        </div>
      )
    }
    return null
  }

  return (
    <Card className={cn("border-blue-200 bg-blue-50", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center space-x-2 text-blue-800">
          <Calendar className="h-5 w-5" />
          <span>Weekly Recognition Trend</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Mini chart */}
          <div className="h-32">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <XAxis 
                  dataKey="week" 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: '#1e40af' }}
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
          
          {/* Summary stats */}
          <div className="grid grid-cols-3 gap-2 text-sm">
            <div className="text-center">
              <div className="font-semibold text-blue-900">{currentRate.toFixed(1)}%</div>
              <div className="text-blue-700">Current</div>
            </div>
            <div className="text-center">
              <div className="font-semibold text-blue-900">{bestRate.toFixed(1)}%</div>
              <div className="text-blue-700">Best</div>
            </div>
            <div className="text-center">
              <div className={cn(
                "font-semibold flex items-center justify-center space-x-1",
                trend.direction === 'improving' && "text-green-700",
                trend.direction === 'declining' && "text-red-700",
                trend.direction === 'stable' && "text-gray-700"
              )}>
                {trend.direction === 'improving' && <TrendingUp className="h-3 w-3" />}
                <span className="capitalize">{trend.direction}</span>
              </div>
              <div className="text-blue-700">Trend</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
