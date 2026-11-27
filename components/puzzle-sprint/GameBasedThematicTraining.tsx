"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Target, TrendingDown, Eye, Shield, Crosshair, Swords, CheckCircle2 } from "lucide-react"
import Link from "next/link"
import { useGameReviewData } from "@/hooks/useGameReviewData"
import { isThemeExcluded, getThemeDisplayName } from "@/lib/theme-config"
import { Skeleton } from "@/components/ui/skeleton"
import { MobileCard } from "@/components/ui/mobile-layout"
import { useI18n } from "@/components/i18n/i18n-provider"
import { cn } from "@/lib/utils"

interface ThemeWithCaptureRate {
  tag: string
  displayName: string
  missed: number
  caught: number
  total: number
  captureRate: number
}

export function GameBasedThematicTraining() {
  const { locale } = useI18n()
  const { data, isLoading, error } = useGameReviewData()

  const getTopMissedThemes = (): ThemeWithCaptureRate[] => {
    if (!data?.opponentMistakesMissed3M?.tag_counts || !data?.opponentMistakesCaught3M?.tag_counts) {
      return []
    }

    const missedMap = new Map<string, number>()
    const caughtMap = new Map<string, number>()

    data.opponentMistakesMissed3M.tag_counts.forEach(item => {
      if (!isThemeExcluded(item.tag)) {
        missedMap.set(item.tag, item.count)
      }
    })

    data.opponentMistakesCaught3M.tag_counts.forEach(item => {
      if (!isThemeExcluded(item.tag)) {
        caughtMap.set(item.tag, item.count)
      }
    })

    const allTags = new Set([...missedMap.keys(), ...caughtMap.keys()])

    return Array.from(allTags)
      .map(tag => {
        const missed = missedMap.get(tag) || 0
        const caught = caughtMap.get(tag) || 0
        const total = missed + caught
        const captureRate = total > 0 ? (caught / total) * 100 : 0

        return {
          tag,
          displayName: getThemeDisplayName(tag, locale),
          missed,
          caught,
          total,
          captureRate: Math.round(captureRate * 10) / 10,
        }
      })
      .filter(item => item.missed > 0)
      .sort((a, b) => b.missed - a.missed)
      .slice(0, 6)
  }

  const getThemeIcon = (tag: string) => {
    const iconMap: Record<string, typeof Target> = {
      hangingPiece: Target,
      pin: Shield,
      fork: Crosshair,
      discoveredAttack: Eye,
      skewer: Swords,
      backRankMate: Target,
      mateIn1: Target,
      mateIn2: Target,
      deflection: Eye,
      attraction: Target,
    }
    return iconMap[tag] || Target
  }

  if (isLoading) {
    return (
      <MobileCard padding="lg" className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-slate-900 mb-1">
              Thematic Training
            </h2>
            <p className="text-sm text-slate-600">
              Practice your missed tactical motifs from recent games
            </p>
          </div>
          <Skeleton className="h-8 w-32 self-start sm:self-auto rounded-full" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="border-slate-200 bg-white shadow-none">
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-lg" />
                  <div className="flex-1">
                    <Skeleton className="h-5 w-28 mb-2" />
                    <Skeleton className="h-4 w-36 mb-3" />
                    <Skeleton className="h-9 w-full" />
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
          <Target className="h-8 w-8 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base sm:text-lg font-semibold text-slate-900 mb-1">No Game Data Available</h3>
          <p className="text-sm text-slate-600 mb-4">
            Add chess profiles in Settings to see your weakness themes
          </p>
          <Link href="/settings">
            <Button className="bg-blue-600 hover:bg-blue-700 text-white text-sm">
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
          <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-3" />
          <h3 className="text-base sm:text-lg font-semibold text-slate-900 mb-1">Great Job!</h3>
          <p className="text-sm text-slate-600">
            No weakness themes found in your recent games. Keep up the tactical play.
          </p>
        </div>
      </MobileCard>
    )
  }

  return (
    <MobileCard padding="lg" className="mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-slate-900 mb-1">
            Thematic Training
          </h2>
          <p className="text-sm text-slate-600">
            Practice your missed tactical motifs from recent games
          </p>
        </div>
        <div className="inline-flex items-center gap-2 bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-full self-start sm:self-auto">
          <Target className="h-4 w-4 text-blue-600" />
          <span className="text-xs sm:text-sm font-medium text-slate-700 tabular-nums">
            {topMissedThemes.length} Themes Available
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {topMissedThemes.map((theme) => {
          const Icon = getThemeIcon(theme.tag)

          return (
            <Card
              key={theme.tag}
              className="border-slate-200 bg-white shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:border-slate-300"
            >
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-start gap-3.5">
                  <div className="bg-slate-100 text-slate-700 p-2.5 rounded-lg flex-shrink-0">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-semibold text-slate-900 truncate mb-1">
                      {theme.displayName}
                    </h3>
                    <div className="flex items-center gap-2 mb-3 text-xs sm:text-sm tabular-nums">
                      <span className="text-slate-500">{theme.missed} missed</span>
                      <span className="text-slate-300">·</span>
                      <div className="flex items-center gap-1">
                        <TrendingDown className="h-3.5 w-3.5 text-slate-400" />
                        <span
                          className={cn(
                            "font-medium",
                            theme.captureRate >= 70
                              ? 'text-emerald-700'
                              : theme.captureRate >= 50
                                ? 'text-amber-700'
                                : 'text-rose-700'
                          )}
                        >
                          {theme.captureRate.toFixed(1)}% success
                        </span>
                      </div>
                    </div>
                    <Link href={`/puzzle-sprint/theme/${theme.tag}`}>
                      <Button variant="outline" className="w-full border-slate-200 text-slate-800 hover:bg-slate-50 text-xs sm:text-sm">
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
