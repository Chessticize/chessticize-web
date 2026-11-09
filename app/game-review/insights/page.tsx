"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Navigation from "@/components/navigation"
import Footer from "@/components/footer"
import { ArrowLeft, BarChart3, Target, TrendingUp, PieChart, Calendar, Loader2, RefreshCw } from "lucide-react"
import { useUserContext } from "@/hooks/useUserContext"
import { useGameReviewData } from "@/hooks/useGameReviewData"
import { ThemeAnalysisChart } from "@/components/game-review/charts/ThemeAnalysisChart"
import { CaptureSuccessRateChart } from "@/components/game-review/charts/CaptureSuccessRateChart"
import { ThemeSuccessRateTrendChart } from "@/components/game-review/charts/ThemeSuccessRateTrendChart"
import { GamePhaseChart } from "@/components/game-review/charts/GamePhaseChart"
import { WeeklyTrendChart } from "@/components/game-review/charts/WeeklyTrendChart"
import { ColorPerformanceChart } from "@/components/game-review/charts/ColorPerformanceChart"
import { MyMistakesTrendChart } from "@/components/game-review/charts/MyMistakesTrendChart"
import { CombinedPuzzleLengthChart } from "@/components/game-review/charts/CombinedPuzzleLengthChart"
import { MoveLengthTrendChart } from "@/components/game-review/charts/MoveLengthTrendChart"
import { LoadingSkeletons } from "@/components/game-review/common/LoadingSkeletons"
import Link from "next/link"

export default function GameReviewInsightsPage() {
  // Global user context
  const { user, isLoading: isLoadingUser } = useUserContext()

  // Game review data
  const {
    data: gameReviewData,
    importStatus,
    isLoading: isLoadingStats,
    isRefreshingImport,
    error: statsError,
    refetch,
    refreshImport
  } = useGameReviewData()

  // Get chess profiles from user data
  const chessProfiles = user?.chess_profiles || []

  const hasProfiles = chessProfiles.length > 0
  const importSummaryStatus = importStatus?.summary.status
  const hasImportedGames = importStatus?.summary.has_imported_games ??
    chessProfiles.some(profile => (profile.games_fetched || 0) > 0)
  const hasData = !!(
    gameReviewData?.summary &&
    (gameReviewData.summary.totalGamesAnalyzed > 0 || gameReviewData.summary.totalPuzzles > 0)
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />

      <main className="max-w-7xl mx-auto px-8 py-12">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <Link href="/game-review">
                <Button variant="outline" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Overview
                </Button>
              </Link>
              <div>
                <h1 className="text-4xl font-bold text-blue-600 mb-2">Detailed Insights</h1>
                <p className="text-xl text-gray-600">Deep dive into your tactical performance patterns</p>
              </div>
            </div>
            <div className="flex items-center space-x-2 bg-blue-100 px-4 py-2 rounded-full">
              <BarChart3 className="h-5 w-5 text-blue-600" />
              <span className="text-lg font-semibold text-blue-800">
                {isLoadingStats ? 'Loading...' : hasData ? 'Analysis Ready' : getImportAnalysisStatus(importSummaryStatus)}
              </span>
            </div>
          </div>

          {/* Quick Summary */}
          {gameReviewData?.summary && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-orange-50 rounded-lg">
                <div className="text-2xl font-bold text-orange-900">
                  {gameReviewData.summary.recognitionRate.toFixed(1)}%
                </div>
                <div className="text-sm text-orange-700">Recognition Rate</div>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <div className="text-2xl font-bold text-red-900">
                  {gameReviewData.summary.mistakesPerGame.toFixed(1)}
                </div>
                <div className="text-sm text-red-700">Mistakes Per Game</div>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-900">
                  {gameReviewData.summary.totalGamesAnalyzed}
                </div>
                <div className="text-sm text-blue-700">Games Analyzed</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-900">
                  {gameReviewData.summary.weeklyTrend > 0 ? '+' : ''}{gameReviewData.summary.weeklyTrend.toFixed(1)}%
                </div>
                <div className="text-sm text-green-700">Weekly Trend</div>
              </div>
            </div>
          )}
        </div>

        {/* No Chess Profiles */}
        {!isLoadingUser && !hasProfiles && (
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
            <Target className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Chess Profiles Found</h3>
            <p className="text-gray-600 mb-6">
              Add your chess.com or lichess.org profile to start analyzing your games.
            </p>
            <Link href="/settings">
              <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                Add Chess Profile
              </Button>
            </Link>
          </div>
        )}

        {!isLoadingUser && hasProfiles && !isLoadingStats && !statsError && !hasImportedGames && (
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
            <Calendar className="h-16 w-16 text-amber-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">{getImportStatusTitle(importSummaryStatus)}</h3>
            <p className="text-gray-600 mb-6">
              {getImportStatusDescription(importSummaryStatus)}
            </p>
            <Button
              onClick={() => void refreshImport()}
              disabled={isRefreshingImport || importSummaryStatus === 'queued' || importSummaryStatus === 'running'}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              {isRefreshingImport ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              {getImportActionLabel(importSummaryStatus, isRefreshingImport)}
            </Button>
          </div>
        )}

        {!isLoadingUser && hasProfiles && !isLoadingStats && !statsError && hasImportedGames && !hasData && (
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
            <BarChart3 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Analysis Yet</h3>
            <p className="text-gray-600">
              Imported games were found, but tactical analysis is not available for this profile yet.
            </p>
          </div>
        )}

        {/* Loading State */}
        {isLoadingStats && hasProfiles && (
          <div className="space-y-8">
            <LoadingSkeletons />
            <LoadingSkeletons />
          </div>
        )}

        {/* Error State */}
        {statsError && !isLoadingStats && hasProfiles && (
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-red-900 mb-2">Analysis Error</h3>
              <p className="text-red-700 text-sm mb-4">{statsError}</p>
              <Button
                onClick={refetch}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Try Again
              </Button>
            </div>
          </div>
        )}

        {/* Charts Grid */}
        {!isLoadingStats && hasProfiles && !statsError && hasData && gameReviewData && (
          <div className="space-y-8">
            {/* Performance Trends Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Weekly Recognition Trend */}
              <Card className="bg-white shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <TrendingUp className="h-5 w-5 text-blue-600" />
                    <span>Weekly Recognition Trend</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <WeeklyTrendChart data={gameReviewData} />
                </CardContent>
              </Card>

              {/* My Mistakes Trend */}
              <Card className="bg-white shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <TrendingUp className="h-5 w-5 text-red-600" />
                    <span>My Mistakes Per Game Trend</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <MyMistakesTrendChart data={gameReviewData} />
                </CardContent>
              </Card>
            </div>

            {/* My Mistakes Analysis */}
            <Card className="bg-white shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Calendar className="h-5 w-5 text-red-600" />
                  <span>My Mistakes by Theme</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ThemeAnalysisChart
                  data={gameReviewData.myMistakes3M}
                  type="mistakes"
                />
              </CardContent>
            </Card>

            {/* Theme Analysis Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <Card className="bg-white shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Target className="h-5 w-5 text-orange-600" />
                    <span>Missed Opportunities by Theme</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ThemeAnalysisChart
                    data={gameReviewData.opponentMistakesMissed3M}
                    type="missed"
                  />
                </CardContent>
              </Card>

              <Card className="bg-white shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Target className="h-5 w-5 text-green-600" />
                    <span>Successfully Caught by Theme</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ThemeAnalysisChart
                    data={gameReviewData.opponentMistakesCaught3M}
                    type="caught"
                  />
                </CardContent>
              </Card>
            </div>

            {/* Capture Success Rate Analysis */}
            <Card className="bg-white shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Target className="h-5 w-5 text-blue-600" />
                  <span>Capture Success Rate by Theme</span>
                </CardTitle>
                <p className="text-sm text-gray-600 mt-1">
                  Shows your success rate for each tactical theme - focus on themes with lower rates
                </p>
              </CardHeader>
              <CardContent>
                <CaptureSuccessRateChart
                  caughtData={gameReviewData.opponentMistakesCaught3M}
                  missedData={gameReviewData.opponentMistakesMissed3M}
                />
              </CardContent>
            </Card>

            {/* Theme Success Rate Trends */}
            <Card className="bg-white shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                  <span>Theme Success Rate Trends</span>
                </CardTitle>
                <p className="text-sm text-gray-600 mt-1">
                  Compare your success rates between recent 3 months vs previous 3 months for top themes
                </p>
              </CardHeader>
              <CardContent>
                <ThemeSuccessRateTrendChart
                  caughtData3M={gameReviewData.opponentMistakesCaught3M}
                  missedData3M={gameReviewData.opponentMistakesMissed3M}
                  caughtData3To6M={gameReviewData.opponentMistakesCaught3To6M}
                  missedData3To6M={gameReviewData.opponentMistakesMissed3To6M}
                />
              </CardContent>
            </Card>

            {/* Game Phase and Color Analysis */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <Card className="bg-white shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <BarChart3 className="h-5 w-5 text-purple-600" />
                    <span>Performance by Game Phase</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <GamePhaseChart data={gameReviewData} />
                </CardContent>
              </Card>

              <Card className="bg-white shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <PieChart className="h-5 w-5 text-indigo-600" />
                    <span>Performance by Color</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ColorPerformanceChart data={gameReviewData} />
                </CardContent>
              </Card>
            </div>

            {/* Move Length Trend Analysis */}
            <Card className="bg-white shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <TrendingUp className="h-5 w-5 text-purple-600" />
                  <span>Puzzle Complexity Trends</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <MoveLengthTrendChart data={gameReviewData} />
              </CardContent>
            </Card>

            {/* Combined Puzzle Length Distribution */}
            <Card className="bg-white shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <BarChart3 className="h-5 w-5 text-purple-600" />
                  <span>Puzzle Length Comparison</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CombinedPuzzleLengthChart data={gameReviewData} />
              </CardContent>
            </Card>


          </div>
        )}
      </main>

      <Footer hideOnMobile={true} />
    </div>
  )
}

function getImportAnalysisStatus(status?: string): string {
  switch (status) {
    case 'queued':
      return 'Import Queued'
    case 'running':
      return 'Import Running'
    case 'failed':
      return 'Import Failed'
    case 'complete':
      return 'Import Complete'
    default:
      return 'Waiting for Analysis'
  }
}

function getImportStatusTitle(status?: string): string {
  switch (status) {
    case 'queued':
      return 'Game Import Queued'
    case 'running':
      return 'Game Import Running'
    case 'failed':
      return 'Game Import Failed'
    case 'complete':
      return 'No Games Imported'
    default:
      return 'Game Import Pending'
  }
}

function getImportStatusDescription(status?: string): string {
  switch (status) {
    case 'queued':
      return 'Detailed insights will appear after your queued import has run and games have been analyzed.'
    case 'running':
      return 'Your games are currently being imported. Detailed insights will appear after processing finishes.'
    case 'failed':
      return 'The latest import failed. Check the connected profile in Settings, then try reconnecting or refreshing it.'
    case 'complete':
      return 'The latest import completed, but no games were added for this profile yet.'
    default:
      return 'Detailed insights will appear after your connected profile has imported and analyzed games.'
  }
}

function getImportActionLabel(status?: string, isRefreshingImport = false): string {
  if (isRefreshingImport) return 'Starting Import...'
  switch (status) {
    case 'queued':
      return 'Import Queued'
    case 'running':
      return 'Import Running'
    case 'failed':
      return 'Retry Import'
    default:
      return 'Start Import'
  }
}
