"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Target, TrendingUp, TrendingDown, Minus } from "lucide-react"
import { cn } from "@/lib/utils"

interface RecognitionRateCardProps {
  currentRate: number
  previousRate?: number
  trend?: number
  isLoading?: boolean
  className?: string
}

export function RecognitionRateCard({ 
  currentRate, 
  previousRate, 
  trend = 0,
  isLoading = false,
  className 
}: RecognitionRateCardProps) {
  if (isLoading) {
    return (
      <Card className={cn("border-orange-200 bg-orange-50", className)}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center space-x-2 text-orange-800">
            <Target className="h-5 w-5" />
            <span>Opponent Mistake Recognition</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Skeleton className="h-12 w-24" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-6 w-32" />
          </div>
        </CardContent>
      </Card>
    )
  }

  // Determine status based on recognition rate
  const getStatus = (rate: number) => {
    if (rate >= 70) return { color: 'green', label: 'Strong', icon: '🟢' }
    if (rate >= 50) return { color: 'yellow', label: 'Needs Work', icon: '🟡' }
    return { color: 'red', label: 'Focus Area', icon: '🔴' }
  }

  // Determine trend direction
  const getTrendIcon = () => {
    if (Math.abs(trend) < 1) return <Minus className="h-4 w-4" />
    return trend > 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />
  }

  const getTrendColor = () => {
    if (Math.abs(trend) < 1) return 'text-gray-600'
    return trend > 0 ? 'text-green-600' : 'text-red-600'
  }

  const status = getStatus(currentRate)

  return (
    <Card className={cn("border-orange-200 bg-orange-50", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center space-x-2 text-orange-800">
          <Target className="h-5 w-5" />
          <span>Opponent Mistake Recognition</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {/* Main percentage */}
          <div className="text-4xl font-bold text-orange-900">
            {currentRate.toFixed(1)}%
          </div>
          
          {/* Trend indicator */}
          <div className={cn("flex items-center space-x-1", getTrendColor())}>
            {getTrendIcon()}
            <span className="text-sm font-medium">
              {Math.abs(trend) < 1 ? 'Stable' : `${trend > 0 ? '+' : ''}${trend.toFixed(1)}%`}
            </span>
          </div>
          
          {/* Time period */}
          <div className="text-sm text-orange-700">
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
            {status.icon} {status.label}
          </Badge>
        </div>
      </CardContent>
    </Card>
  )
}
