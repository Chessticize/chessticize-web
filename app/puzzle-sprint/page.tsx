"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Navigation from "@/components/navigation"
import Footer from "@/components/footer"
import { MobileLayout, MobileContainer, MobileCard } from "@/components/ui/mobile-layout"
// import { GameBasedThematicTraining } from "@/components/puzzle-sprint/GameBasedThematicTraining"
import { useUserContext } from "@/hooks/useUserContext"
import { useSprintStats } from "@/hooks/useSprintStats"
import { Target, Zap, Settings, Clock, Swords, Flame, CheckCircle, Timer } from "lucide-react"
import Link from "next/link"
import { getStandardEloType, getBlitzEloType, getArrowDuelEloType, SPRINT_DISPLAY, VALID_THEMES, VALID_SPRINT_DURATIONS, VALID_PER_PUZZLE_TIMES, calculateTargetPuzzles } from "@/lib/sprint-config"
import { getThemeDisplayName } from "@/lib/theme-config"



export default function PuzzleSprintPage() {
  const { user, isLoading } = useUserContext()
  const { stats: sprintStats, isLoading: isSprintStatsLoading } = useSprintStats({
    days: 365,
    group_by: "day",
    group_length: 1,
  }, Boolean(user) && !isLoading)
  const sprintStatsSummary = sprintStats?.summary
  const todaySprintSummary = sprintStats?.series.at(-1)?.summary

  // Get current Elo ratings
  const getMixedElo = () => {
    if (!user?.elos) return 600 // Default starting Elo
    const mixedElo = user.elos.find(elo => elo.elo_type === getStandardEloType())
    return mixedElo?.rating || 600
  }

  const getBlitzElo = () => {
    if (!user?.elos) return 600 // Default starting Elo
    const blitzElo = user.elos.find(elo => elo.elo_type === getBlitzEloType())
    return blitzElo?.rating || 600
  }

  const getArrowDuelElo = () => {
    if (!user?.elos) return 600 // Default starting Elo
    const arrowDuelElo = user.elos.find(elo => elo.elo_type === getArrowDuelEloType())
    return arrowDuelElo?.rating || 600
  }

  const getTotalSprints = () => {
    return sprintStatsSummary?.completed_count || 0
  }

  const getTodayStartedSprints = () => {
    return todaySprintSummary?.started_count || 0
  }

  const getTodayPuzzlesSolved = () => {
    return todaySprintSummary?.puzzles_solved || 0
  }

  const getTodaySprintTime = () => {
    const secs = todaySprintSummary?.sprint_total_duration_seconds || 0
    const mins = Math.round(secs / 60)
    return `${mins}m`
  }

  // Get the 3 most recent custom sprint ELOs
  const getRecentCustomSprints = () => {
    if (!user?.elos) return []

    const customSprints = user.elos
      .filter(elo => {
        const eloType = elo.elo_type
        // Skip standard predefined types
        if (eloType === 'mixed 5/20' || eloType === 'mixed 5/10') return false

        // Check if it matches custom ELO pattern
        const match = eloType.match(/^(.+)\s+(\d+)\/(\d+)$/)
        if (!match) return false

        const [, theme, duration, perPuzzle] = match
        const durationNum = parseInt(duration, 10)
        const perPuzzleNum = parseInt(perPuzzle, 10)

        // Validate it's a valid custom configuration
        return VALID_THEMES.includes(theme as any) &&
               VALID_SPRINT_DURATIONS.includes(durationNum as any) &&
               VALID_PER_PUZZLE_TIMES.includes(perPuzzleNum as any)
      })
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
      .slice(0, 3)
      .map(elo => {
        const match = elo.elo_type.match(/^(.+)\s+(\d+)\/(\d+)$/)!
        const [, theme, duration, perPuzzle] = match
        return {
          eloType: elo.elo_type,
          theme,
          durationMinutes: parseInt(duration, 10),
          perPuzzleSeconds: parseInt(perPuzzle, 10),
          rating: elo.rating,
          updatedAt: elo.updated_at
        }
      })

    return customSprints
  }

  // Get vibrant colors for custom sprints (similar to thematic training)
  const getCustomSprintColor = (index: number) => {
    const colors = [
      { bg: 'from-red-50 to-red-100', border: 'border-red-200', text: 'text-red-800', badge: 'bg-red-200 text-red-800', icon: 'bg-red-500' },
      { bg: 'from-orange-50 to-orange-100', border: 'border-orange-200', text: 'text-orange-800', badge: 'bg-orange-200 text-orange-800', icon: 'bg-orange-500' },
      { bg: 'from-yellow-50 to-yellow-100', border: 'border-yellow-200', text: 'text-yellow-800', badge: 'bg-yellow-200 text-yellow-800', icon: 'bg-yellow-500' },
      { bg: 'from-purple-50 to-purple-100', border: 'border-purple-200', text: 'text-purple-800', badge: 'bg-purple-200 text-purple-800', icon: 'bg-purple-500' },
      { bg: 'from-blue-50 to-blue-100', border: 'border-blue-200', text: 'text-blue-800', badge: 'bg-blue-200 text-blue-800', icon: 'bg-blue-500' },
      { bg: 'from-green-50 to-green-100', border: 'border-green-200', text: 'text-green-800', badge: 'bg-green-200 text-green-800', icon: 'bg-green-500' }
    ]
    return colors[index % colors.length]
  }

  return (
    <MobileLayout fullHeight>
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Navigation />

        <MobileContainer padding="lg">
          {/* Main Sprint Modes */}
          <MobileCard padding="lg" className="mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 space-y-4 sm:space-y-0">
              <div>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-orange-600 mb-2">Puzzle Sprint</h1>
                <p className="text-base sm:text-lg lg:text-xl text-gray-600">Sharpen your tactical instincts with rapid-fire puzzles</p>
              </div>
              <div className="flex items-center space-x-2 bg-orange-100 px-3 py-2 rounded-full self-start sm:self-auto">
                <Target className="h-4 w-4 sm:h-5 sm:w-5 text-orange-600" />
                <span className="text-sm sm:text-base lg:text-lg font-semibold text-orange-800">
                  {isLoading || isSprintStatsLoading ? 'Loading...' : `Total Sprints: ${getTotalSprints()}`}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 mb-4">
              <div className="flex items-center space-x-1 bg-orange-100 px-3 py-1 rounded-full">
                <Flame className="h-4 w-4 text-orange-600" />
                <span className="text-xs font-semibold text-orange-800">
                  Sprints today: {getTodayStartedSprints()}
                </span>
              </div>
              <div className="flex items-center space-x-1 bg-green-100 px-3 py-1 rounded-full">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-xs font-semibold text-green-800">
                  Correct today: {getTodayPuzzlesSolved()}
                </span>
              </div>
              <div className="flex items-center space-x-1 bg-blue-100 px-3 py-1 rounded-full">
                <Timer className="h-4 w-4 text-blue-600" />
                <span className="text-xs font-semibold text-blue-800">
                  Time today: {getTodaySprintTime()}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:gap-6">
              <Link href="/puzzle-sprint/sprint" className="block">
                <Card className="hover:shadow-lg transition-all duration-200 bg-gradient-to-r from-orange-50 to-orange-100 border-orange-200 min-h-[80px] sm:min-h-[100px]">
                  <CardContent className="p-4 sm:p-6 lg:p-8">
                    <div className="flex items-center space-x-3 sm:space-x-4">
                      <div className="bg-orange-600 p-2 sm:p-3 lg:p-4 rounded-xl sm:rounded-2xl flex-shrink-0">
                        <Zap className="h-5 w-5 sm:h-6 sm:w-6 lg:h-8 lg:w-8 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-1 sm:mb-2 space-y-1 sm:space-y-0">
                          <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-orange-800">{SPRINT_DISPLAY.STANDARD.name}</h3>
                          <Badge variant="secondary" className="bg-orange-200 text-orange-800 text-xs sm:text-sm self-start sm:self-auto">
                            Elo: {getMixedElo()}
                          </Badge>
                        </div>
                        <p className="text-sm sm:text-base text-orange-700 line-clamp-2">{SPRINT_DISPLAY.STANDARD.description}</p>
                      </div>
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link href="/puzzle-sprint/arrow-duel" className="block">
              <Card className="hover:shadow-lg transition-all duration-200 bg-gradient-to-r from-green-50 to-green-100 border-green-200 min-h-[80px] sm:min-h-[100px]">
                <CardContent className="p-4 sm:p-6 lg:p-8">
                  <div className="flex items-center space-x-3 sm:space-x-4">
                    <div className="bg-green-600 p-2 sm:p-3 lg:p-4 rounded-xl sm:rounded-2xl flex-shrink-0">
                      <Swords className="h-5 w-5 sm:h-6 sm:w-6 lg:h-8 lg:w-8 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-1 sm:mb-2 space-y-1 sm:space-y-0">
                        <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-green-800">{SPRINT_DISPLAY.ARROW_DUEL.name}</h3>
                        <Badge variant="secondary" className="bg-green-200 text-green-800 text-xs sm:text-sm self-start sm:self-auto">
                          Elo: {getArrowDuelElo()}
                        </Badge>
                      </div>
                      <p className="text-sm sm:text-base text-green-700 line-clamp-2">{SPRINT_DISPLAY.ARROW_DUEL.description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link href="/puzzle-sprint/blitz" className="block">
              <Card className="hover:shadow-lg transition-all duration-200 bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200 min-h-[80px] sm:min-h-[100px]">
                <CardContent className="p-4 sm:p-6 lg:p-8">
                  <div className="flex items-center space-x-3 sm:space-x-4">
                    <div className="bg-blue-600 p-2 sm:p-3 lg:p-4 rounded-xl sm:rounded-2xl flex-shrink-0">
                      <Target className="h-5 w-5 sm:h-6 sm:w-6 lg:h-8 lg:w-8 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-1 sm:mb-2 space-y-1 sm:space-y-0">
                        <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-blue-800">{SPRINT_DISPLAY.BLITZ.name}</h3>
                        <Badge variant="secondary" className="bg-blue-200 text-blue-800 text-xs sm:text-sm self-start sm:self-auto">
                          Elo: {getBlitzElo()}
                        </Badge>
                      </div>
                      <p className="text-sm sm:text-base text-blue-700 line-clamp-2">{SPRINT_DISPLAY.BLITZ.description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>

            {/* Recent Custom Sprints */}
            {getRecentCustomSprints().length > 0 && (
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-gray-700 flex items-center space-x-2">
                  <Clock className="h-5 w-5" />
                  <span>Recent Custom Sprints</span>
                </h3>
                <div className="grid grid-cols-1 gap-3">
                  {getRecentCustomSprints().map((sprint, index) => {
                    const colors = getCustomSprintColor(index)
                    return (
                      <Link
                        key={sprint.eloType}
                        href={`/puzzle-sprint/custom?theme=${sprint.theme}&duration=${sprint.durationMinutes}&perPuzzle=${sprint.perPuzzleSeconds}`}
                        className="block"
                      >
                        <Card className={`hover:shadow-xl transition-all duration-300 sm:hover:scale-105 bg-gradient-to-r ${colors.bg} ${colors.border}`}>
                          <CardContent className="p-4">
                            <div className="flex items-start space-x-3">
                              <div className={`${colors.icon} p-2 rounded-lg flex-shrink-0`}>
                                <Target className="h-4 w-4 text-white" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex flex-col space-y-2 sm:flex-row sm:items-start sm:justify-between sm:space-y-0">
                                  <div className="space-y-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <Badge variant="secondary" className={`text-xs ${colors.badge}`}>
                                        {getThemeDisplayName(sprint.theme)}
                                      </Badge>
                                      <span className={`text-sm ${colors.text} opacity-75`}>
                                        {sprint.durationMinutes}m / {sprint.perPuzzleSeconds}s
                                      </span>
                                    </div>
                                    <div className={`text-xs ${colors.text} opacity-60`}>
                                      {calculateTargetPuzzles(sprint.durationMinutes, sprint.perPuzzleSeconds)} puzzles • {new Date(sprint.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                    </div>
                                  </div>
                                  <Badge variant="outline" className={`${colors.badge} self-start sm:self-auto mt-1 sm:mt-0`}>
                                    ELO: {sprint.rating}
                                  </Badge>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
                    )
                  })}
                </div>
              </div>
            )}

            <Link href="/puzzle-sprint/custom" className="block">
              <Card className="hover:shadow-lg transition-all duration-200 bg-gradient-to-r from-purple-50 to-purple-100 border-purple-200 min-h-[80px] sm:min-h-[100px]">
                <CardContent className="p-4 sm:p-6 lg:p-8">
                  <div className="flex items-center space-x-3 sm:space-x-4">
                    <div className="bg-purple-600 p-2 sm:p-3 lg:p-4 rounded-xl sm:rounded-2xl flex-shrink-0">
                      <Settings className="h-5 w-5 sm:h-6 sm:w-6 lg:h-8 lg:w-8 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-1 sm:mb-2 space-y-1 sm:space-y-0">
                        <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-purple-800">Custom Sprint</h3>
                        <Badge variant="secondary" className="bg-purple-200 text-purple-800 text-xs sm:text-sm self-start sm:self-auto">
                          Customized
                        </Badge>
                      </div>
                      <p className="text-sm sm:text-base text-purple-700 line-clamp-2">Create your own sprint with custom theme, timing, and duration settings.</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </div>
        </MobileCard>

        {/* Game-Based Thematic Training - removed for MVP */}
        {/* <GameBasedThematicTraining /> */}

        {/* Deep Stats Section - removed for MVP */}
        {/* <MobileCard padding="lg">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Your Progress</h2>
          ...
        </MobileCard> */}
        </MobileContainer>

        <Footer hideOnMobile={true} />
      </div>
    </MobileLayout>
  )
}
