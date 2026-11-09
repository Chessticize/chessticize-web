"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Target, TrendingDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { GameReviewData } from "@/hooks/useGameReviewData"
import { isThemeExcluded, getThemeDisplayName } from "@/lib/theme-config"

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
  className
}: TopMissedThemesCardProps) {
  if (isLoading) {
    return (
      <Card className={cn("border-red-200 bg-red-50", className)}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center space-x-2 text-red-800">
            <Target className="h-5 w-5" />
            <span>Top Missed Themes</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex justify-between items-center">
                <Skeleton className="h-4 w-24" />
                <div className="flex items-center space-x-2">
                  <Skeleton className="h-4 w-8" />
                  <Skeleton className="h-4 w-12" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  // Process missed and caught themes to calculate miss rates
  const processTopMissedThemes = (): ThemeWithMissRate[] => {
    if (!data?.opponentMistakesMissed3M?.tag_counts || !data?.opponentMistakesCaught3M?.tag_counts) {
      return []
    }

    const missedMap = new Map<string, number>()
    const caughtMap = new Map<string, number>()

    // Process missed themes
    data.opponentMistakesMissed3M.tag_counts.forEach(item => {
      if (!isThemeExcluded(item.tag)) {
        missedMap.set(item.tag, item.count)
      }
    })

    // Process caught themes
    data.opponentMistakesCaught3M.tag_counts.forEach(item => {
      if (!isThemeExcluded(item.tag)) {
        caughtMap.set(item.tag, item.count)
      }
    })

    // Combine data and calculate miss rates
    const allTags = new Set([...missedMap.keys(), ...caughtMap.keys()])

    return Array.from(allTags)
      .map(tag => {
        const missed = missedMap.get(tag) || 0
        const caught = caughtMap.get(tag) || 0
        const total = missed + caught
        const missRate = total > 0 ? (missed / total) * 100 : 0

        return {
          theme: tag,
          displayName: getThemeDisplayName(tag),
          missed,
          caught,
          total,
          missRate: Math.round(missRate * 10) / 10
        }
      })
      .filter(item => item.missed > 0) // Only themes that were actually missed
      .sort((a, b) => b.missed - a.missed) // Sort by most missed
      .slice(0, 5) // Top 5
  }

  const topMissedThemes = processTopMissedThemes()

  if (topMissedThemes.length === 0) {
    return (
      <Card className={cn("border-red-200 bg-red-50", className)}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center space-x-2 text-red-800">
            <Target className="h-5 w-5" />
            <span>Top Missed Themes</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <div className="text-4xl mb-2">🎯</div>
            <p>No missed opportunities data available</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn("border-red-200 bg-red-50", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center space-x-2 text-red-800">
          <Target className="h-5 w-5" />
          <span>Top Missed Themes</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {topMissedThemes.map((theme, index) => (
            <div key={theme.theme} className="flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <Badge variant="outline" className="text-xs font-medium">
                  #{index + 1}
                </Badge>
                <span className="font-medium text-red-900">{theme.displayName}</span>
              </div>
              <div className="flex items-center space-x-3 text-sm">
                <div className="text-red-700">
                  <span className="font-semibold">{theme.missed}</span> missed
                </div>
                <div className={cn(
                  "flex items-center space-x-1 font-semibold",
                  theme.missRate <= 30 ? "text-green-700" :
                  theme.missRate <= 50 ? "text-yellow-700" : "text-red-700"
                )}>
                  <TrendingDown className="h-3 w-3" />
                  <span>{theme.missRate.toFixed(1)}%</span>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {/* Summary */}
        <div className="mt-4 pt-3 border-t border-red-200">
          <div className="text-xs text-red-700 text-center">
            Focus on these themes to improve your tactical recognition
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
