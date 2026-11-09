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


  // Calculate total opportunities (current 3 months)
  const calculateTotalOpportunities = () => {
    if (!data?.opponentMistakesMissed3M || !data?.opponentMistakesCaught3M) return 0

    const missed = data.opponentMistakesMissed3M.tag_counts.reduce((sum, tag) => sum + tag.count, 0)
    const caught = data.opponentMistakesCaught3M.tag_counts.reduce((sum, tag) => sum + tag.count, 0)

    return missed + caught
  }

  // Calculate average puzzle length
  const calculateAveragePuzzleLength = () => {
    if (!data?.opponentMistakesTimeSeries?.nodes) return 0
    
    const nodes = data.opponentMistakesTimeSeries.nodes.filter(node => 
      node.stats.average_move_length > 0
    )
    
    if (nodes.length === 0) return 0
    
    const totalLength = nodes.reduce((sum, node) => sum + node.stats.average_move_length, 0)
    return totalLength / nodes.length
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
