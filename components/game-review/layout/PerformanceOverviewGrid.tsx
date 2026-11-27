"use client"

import { RecognitionRateCard } from "@/components/game-review/cards/RecognitionRateCard"
import { MistakesPerGameCard } from "@/components/game-review/cards/MistakesPerGameCard"
import { TopMissedThemesCard } from "@/components/game-review/cards/TopMissedThemesCard"
import { QuickStatsCard } from "@/components/game-review/cards/QuickStatsCard"
import { GameReviewData } from "@/hooks/useGameReviewData"
import { cn } from "@/lib/utils"

interface PerformanceOverviewGridProps {
  data: GameReviewData | null
  isLoading: boolean
  className?: string
}

export function PerformanceOverviewGrid({ 
  data, 
  isLoading,
  className 
}: PerformanceOverviewGridProps) {


  // Calculate total opportunities directly from puzzle counts (never sum tag_counts,
  // since each puzzle carries multiple tags).
  const calculateTotalOpportunities = () => {
    if (data?.summary) {
      return (
        data.summary.missedOpportunities +
        data.summary.missedAttacks +
        data.summary.caughtOpportunities +
        data.summary.caughtAttacks
      )
    }
    return 0
  }

  // Convert ply-based average move length to full moves (weighted across puzzles).
  const calculateAveragePuzzleLength = () => {
    if (data?.summary?.averageMoveLength && data.summary.averageMoveLength > 0) {
      return data.summary.averageMoveLength / 2
    }
    if (!data?.opponentMistakesTimeSeries?.nodes) return 0

    let weightedSum = 0
    let totalWeight = 0
    for (const node of data.opponentMistakesTimeSeries.nodes) {
      if (node.stats.average_move_length <= 0) continue
      const weight =
        node.stats.total_count && node.stats.total_count > 0
          ? node.stats.total_count
          : 1
      weightedSum += node.stats.average_move_length * weight
      totalWeight += weight
    }
    if (totalWeight === 0) return 0
    return weightedSum / totalWeight / 2
  }

  const totalOpportunities = calculateTotalOpportunities()
  const averagePuzzleLength = calculateAveragePuzzleLength()

  return (
    <div className={cn("grid grid-cols-1 md:grid-cols-2 gap-6", className)}>
      {/* Recognition Rate Card */}
      <RecognitionRateCard
        currentRate={data?.summary?.recognitionRate || 0}
        trend={data?.summary?.weeklyTrend || 0}
        isLoading={isLoading}
      />
      
      {/* Mistakes Per Game Card */}
      <MistakesPerGameCard
        mistakesPerGame={data?.summary?.mistakesPerGame || 0}
        trend={data?.summary?.mistakesPerGameTrend || 0}
        isLoading={isLoading}
      />
      
      {/* Top Missed Themes Card */}
      <TopMissedThemesCard
        data={data}
        isLoading={isLoading}
      />
      
      {/* Quick Stats Card */}
      <QuickStatsCard
        totalGames={data?.summary?.totalGamesAnalyzed || 0}
        totalOpportunities={totalOpportunities}
        averagePuzzleLength={averagePuzzleLength}
        isLoading={isLoading}
      />
    </div>
  )
}
