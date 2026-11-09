"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Target, TrendingDown, Eye, Shield, Crosshair, Swords, Zap } from "lucide-react"
import Link from "next/link"
import { useGameReviewData } from "@/hooks/useGameReviewData"
import { isThemeExcluded, getThemeDisplayName } from "@/lib/theme-config"
import { Skeleton } from "@/components/ui/skeleton"
import { MobileContainer, MobileCard } from "@/components/ui/mobile-layout"

interface ThemeWithCaptureRate {
  tag: string
  displayName: string
  missed: number
  caught: number
  total: number
  captureRate: number
}

export function GameBasedThematicTraining() {
  const { data, isLoading, error } = useGameReviewData()

  // Process missed and caught themes to calculate capture rates
  const getTopMissedThemes = (): ThemeWithCaptureRate[] => {
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

    // Combine data and calculate capture rates
    const allTags = new Set([...missedMap.keys(), ...caughtMap.keys()])
    
    return Array.from(allTags)
      .map(tag => {
        const missed = missedMap.get(tag) || 0
        const caught = caughtMap.get(tag) || 0
        const total = missed + caught
        const captureRate = total > 0 ? (caught / total) * 100 : 0
        
        return {
          tag,
          displayName: getThemeDisplayName(tag),
          missed,
          caught,
          total,
          captureRate: Math.round(captureRate * 10) / 10
        }
      })
      .filter(item => item.missed > 0) // Only themes that were actually missed
      .sort((a, b) => b.missed - a.missed) // Sort by most missed
      .slice(0, 6) // Top 6
  }

  // Theme icon mapping
  const getThemeIcon = (tag: string) => {
    const iconMap: { [key: string]: any } = {
      'hangingPiece': Target,
      'pin': Shield,
      'fork': Crosshair,
      'discoveredAttack': Eye,
      'skewer': Swords,
      'backRankMate': Target,
      'mateIn1': Target,
      'mateIn2': Target,
      'deflection': Eye,
      'attraction': Target
    }
    return iconMap[tag] || Target
  }

  // Theme color mapping
  const getThemeColor = (index: number) => {
    const colors = [
      { bg: 'from-red-50 to-red-100', border: 'border-red-200', text: 'text-red-800', button: 'bg-red-600 hover:bg-red-700', icon: 'bg-red-500' },
      { bg: 'from-orange-50 to-orange-100', border: 'border-orange-200', text: 'text-orange-800', button: 'bg-orange-600 hover:bg-orange-700', icon: 'bg-orange-500' },
      { bg: 'from-yellow-50 to-yellow-100', border: 'border-yellow-200', text: 'text-yellow-800', button: 'bg-yellow-600 hover:bg-yellow-700', icon: 'bg-yellow-500' },
      { bg: 'from-purple-50 to-purple-100', border: 'border-purple-200', text: 'text-purple-800', button: 'bg-purple-600 hover:bg-purple-700', icon: 'bg-purple-500' },
      { bg: 'from-blue-50 to-blue-100', border: 'border-blue-200', text: 'text-blue-800', button: 'bg-blue-600 hover:bg-blue-700', icon: 'bg-blue-500' },
      { bg: 'from-green-50 to-green-100', border: 'border-green-200', text: 'text-green-800', button: 'bg-green-600 hover:bg-green-700', icon: 'bg-green-500' }
    ]
    return colors[index % colors.length]
  }

  if (isLoading) {
    return (
      <MobileCard padding="lg" className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 space-y-4 sm:space-y-0">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-orange-600 mb-2">Thematic Training</h2>
            <p className="text-base sm:text-lg text-gray-600">Training your weaknesses from the lichess puzzle library</p>
          </div>
          <Skeleton className="h-10 w-32 self-start sm:self-auto" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="border-gray-200">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center space-x-3 sm:space-x-4">
                  <Skeleton className="h-10 w-10 sm:h-12 sm:w-12 rounded-2xl" />
                  <div className="flex-1">
                    <Skeleton className="h-5 w-20 sm:h-6 sm:w-24 mb-2" />
                    <Skeleton className="h-3 w-12 sm:h-4 sm:w-16 mb-2" />
                    <Skeleton className="h-7 w-full sm:h-8" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </MobileCard>
    )
  }

  if (error || !data) {
    return (
      <MobileCard padding="lg" className="mb-6">
        <div className="text-center py-6 sm:py-8">
          <div className="text-3xl sm:text-4xl mb-4">🎯</div>
          <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">No Game Data Available</h3>
          <p className="text-sm sm:text-base text-gray-600 mb-4">
            Add chess profiles in Settings to see your weakness themes
          </p>
          <Link href="/settings">
            <Button className="bg-orange-600 hover:bg-orange-700 text-white text-sm sm:text-base">
              Add Chess Profile
            </Button>
          </Link>
        </div>
      </MobileCard>
    )
  }

  const topMissedThemes = getTopMissedThemes()

  if (topMissedThemes.length === 0) {
    return (
      <MobileCard padding="lg" className="mb-6">
        <div className="text-center py-6 sm:py-8">
          <div className="text-3xl sm:text-4xl mb-4">🎉</div>
          <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">Great Job!</h3>
          <p className="text-sm sm:text-base text-gray-600">
            No weakness themes found in your recent games. Keep up the excellent tactical play!
          </p>
        </div>
      </MobileCard>
    )
  }

  return (
    <MobileCard padding="lg" className="mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 space-y-4 sm:space-y-0">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-orange-600 mb-2">Thematic Training</h2>
          <p className="text-base sm:text-lg text-gray-600">Training your weaknesses from the lichess puzzle library</p>
        </div>
        <div className="flex items-center space-x-2 bg-orange-100 px-3 py-2 rounded-full self-start sm:self-auto">
          <Target className="h-4 w-4 sm:h-5 sm:w-5 text-orange-600" />
          <span className="text-sm sm:text-base font-semibold text-orange-800">{topMissedThemes.length} Themes Available</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        {topMissedThemes.map((theme, index) => {
          const Icon = getThemeIcon(theme.tag)
          const colors = getThemeColor(index)

          return (
            <Card
              key={theme.tag}
              className={`hover:shadow-xl transition-all duration-300 hover:scale-105 bg-gradient-to-r ${colors.bg} ${colors.border}`}
            >
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center space-x-3 sm:space-x-4">
                  <div className={`${colors.icon} p-2 sm:p-3 rounded-xl sm:rounded-2xl flex-shrink-0`}>
                    <Icon className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className={`text-lg sm:text-xl font-bold ${colors.text} mb-1`}>{theme.displayName}</h3>
                    <div className="flex items-center space-x-2 mb-2">
                      <span className={`text-xs sm:text-sm ${colors.text} opacity-75`}>
                        {theme.missed} missed
                      </span>
                      <span className="text-gray-400">•</span>
                      <div className="flex items-center space-x-1">
                        <TrendingDown className="h-3 w-3 text-red-600" />
                        <span className={`text-xs sm:text-sm font-semibold ${
                          theme.captureRate >= 70 ? 'text-green-700' :
                          theme.captureRate >= 50 ? 'text-yellow-700' : 'text-red-700'
                        }`}>
                          {theme.captureRate.toFixed(1)}% success
                        </span>
                      </div>
                    </div>
                    <Link href={`/puzzle-sprint/theme/${theme.tag}`}>
                      <Button className={`w-full ${colors.button} text-white text-xs sm:text-sm py-2`}>
                        Train {theme.displayName}
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </MobileCard>
  )
}
