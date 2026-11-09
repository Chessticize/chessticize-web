"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { AlertTriangle, TrendingUp, TrendingDown, Minus } from "lucide-react"
import { cn } from "@/lib/utils"

interface MistakesPerGameCardProps {
  mistakesPerGame: number
  previousPeriod?: number
  trend?: number
  isLoading?: boolean
  className?: string
}

export function MistakesPerGameCard({ 
  mistakesPerGame, 
  previousPeriod, 
  trend = 0,
  isLoading = false,
  className 
}: MistakesPerGameCardProps) {
  if (isLoading) {
    return (
      <Card className={cn("border-red-200 bg-red-50", className)}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center space-x-2 text-red-800">
            <AlertTriangle className="h-5 w-5" />
            <span>My Mistakes Per Game</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Skeleton className="h-12 w-16" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-6 w-32" />
          </div>
        </CardContent>
      </Card>
    )
  }

  // Determine status based on mistakes per game (lower is better)
  const getStatus = (rate: number) => {
    if (rate <= 1.5) return { color: 'green', label: 'Strong', icon: '🟢' }
    if (rate <= 2.5) return { color: 'yellow', label: 'Needs Work', icon: '🟡' }
    return { color: 'red', label: 'Focus Area', icon: '🔴' }
  }

  // Determine trend direction (negative trend is good for mistakes)
  const getTrendIcon = () => {
    if (Math.abs(trend) < 0.1) return <Minus className="h-4 w-4" />
    return trend < 0 ? <TrendingDown className="h-4 w-4" /> : <TrendingUp className="h-4 w-4" />
  }

  const getTrendColor = () => {
    if (Math.abs(trend) < 0.1) return 'text-gray-600'
    return trend < 0 ? 'text-green-600' : 'text-red-600' // Negative trend is good for mistakes
  }

  const getTrendLabel = () => {
    if (Math.abs(trend) < 0.1) return 'Stable'
    return trend < 0 ? 'Improving' : 'Declining'
  }

  const status = getStatus(mistakesPerGame)

  return (
    <Card className={cn("border-red-200 bg-red-50", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center space-x-2 text-red-800">
          <AlertTriangle className="h-5 w-5" />
          <span>My Mistakes Per Game</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {/* Main number */}
          <div className="text-4xl font-bold text-red-900">
            {mistakesPerGame.toFixed(1)}
          </div>
          
          {/* Trend indicator */}
          <div className={cn("flex items-center space-x-1", getTrendColor())}>
            {getTrendIcon()}
            <span className="text-sm font-medium">
              {Math.abs(trend) < 0.1 ? 'Stable' : `${trend > 0 ? '+' : ''}${trend.toFixed(1)}`}
            </span>
          </div>
          
          {/* Time period */}
          <div className="text-sm text-red-700">
            This Week
          </div>
          
          {/* Status badge */}
          <Badge 
            variant="secondary" 
            className={cn(
              "mt-3",
              status.color === 'green' && "bg-green-100 text-green-800",
              status.color === 'yellow' && "bg-yellow-100 text-yellow-800", 
              status.color === 'red' && "bg-red-100 text-red-800"
            )}
          >
            {status.icon} {getTrendLabel()}
          </Badge>
        </div>
      </CardContent>
    </Card>
  )
}
