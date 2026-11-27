"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Navigation from "@/components/navigation"
import Footer from "@/components/footer"
import { ArrowLeft, BarChart3, Target, TrendingUp, PieChart, Calendar, Loader2, RefreshCw } from "lucide-react"
import { useUserContext } from "@/hooks/useUserContext"
import { useGameReviewData, type GameReviewTimeClass } from "@/hooks/useGameReviewData"
import { TimeClassFilterBar } from "@/components/game-review/common/TimeClassFilterBar"
import { WeaknessDiagnosisSection } from "@/components/game-review/diagnosis/WeaknessDiagnosisSection"
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
import { useI18n } from "@/components/i18n/i18n-provider"

const VALID_TIME_CLASSES = new Set<GameReviewTimeClass>(["rapid", "blitz", "bullet", "classical", "daily"])

export default function GameReviewInsightsPage() {
  const { t } = useI18n()
  const [timeClass, setTimeClass] = useState<GameReviewTimeClass>("")
  const [selectedProfileKey, setSelectedProfileKey] = useState("")
  const [urlReady, setUrlReady] = useState(false)

  useEffect(() => {
    if (typeof window !== "undefined") {
      const param = new URLSearchParams(window.location.search).get("time_class") as GameReviewTimeClass | null
      if (param && VALID_TIME_CLASSES.has(param)) {
        setTimeClass(param)
      }
    }
    setUrlReady(true)
  }, [])

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
  } = useGameReviewData({ timeClass, profileKey: selectedProfileKey, enabled: urlReady })

  // Get chess profiles from user data
  const chessProfiles = user?.chess_profiles || []
  const importedProfiles = chessProfiles.filter(profile => (profile.games_fetched || 0) > 0)

  const hasProfiles = chessProfiles.length > 0
  const importSummaryStatus = importStatus?.summary.status
  const hasImportedGames = importStatus?.summary.has_imported_games ??
    chessProfiles.some(profile => (profile.games_fetched || 0) > 0)
  const hasData = !!(
    gameReviewData?.summary &&
    (gameReviewData.summary.totalGamesAnalyzed > 0 || gameReviewData.summary.totalPuzzles > 0)
  )

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navigation />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12 pb-24 lg:pb-12">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <Link href="/game-review" className="inline-block mb-4">
            <Button variant="outline" size="sm" className="border-slate-200 bg-white text-slate-700 hover:bg-slate-50">
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t('gameReview.backToOverview')}
            </Button>
          </Link>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900">
                {t('gameReview.detailedInsights')}
              </h1>
              <p className="text-sm sm:text-base text-slate-500 mt-1">{t('gameReview.insightsSubtitle')}</p>
            </div>
            <div
              className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border self-start lg:self-auto shrink-0 text-sm font-medium ${
                hasData
                  ? "bg-blue-50 border-blue-200 text-blue-700"
                  : "bg-white border-slate-200 text-slate-600 shadow-xs"
              }`}
            >
              <BarChart3 className={`h-4 w-4 ${hasData ? "text-blue-600" : "text-slate-400"}`} />
              <span>
                {isLoadingStats ? t('common.loading') : hasData ? t('gameReview.analysisReady') : getImportAnalysisStatus(importSummaryStatus, t)}
              </span>
            </div>
          </div>

          {/* Time Control & Profile Filter Strip */}
          {!isLoadingUser && hasImportedGames && (
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
              <TimeClassFilterBar value={timeClass} onChange={setTimeClass} />
              {importedProfiles.length > 1 && (
                <select
                  aria-label="Chess profile"
                  value={
                    selectedProfileKey ||
                    (gameReviewData?.selectedProfile
                      ? `${gameReviewData.selectedProfile.platform}:${gameReviewData.selectedProfile.username}`
                      : "")
                  }
                  onChange={(e) => setSelectedProfileKey(e.target.value)}
                  className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs sm:text-sm text-slate-700 shadow-2xs"
                >
                  {importedProfiles.map((profile) => {
                    const key = `${profile.platform}:${profile.username}`
                    return (
                      <option key={key} value={key}>
                        {profile.platform} / {profile.username}
                      </option>
                    )
                  })}
                </select>
              )}
            </div>
          )}

          {/* Quick Summary */}
          {gameReviewData?.summary && (
            <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
              <div className="p-4 bg-white border border-slate-200 shadow-sm rounded-xl">
                <div className="text-2xl font-semibold tabular-nums text-slate-900">
                  {gameReviewData.summary.recognitionRate.toFixed(1)}%
                </div>
                <div className="text-xs sm:text-sm text-slate-500 mt-0.5">{t('gameReview.recognitionRate')}</div>
              </div>
              <div className="p-4 bg-white border border-slate-200 shadow-sm rounded-xl">
                <div className="text-2xl font-semibold tabular-nums text-slate-900">
                  {gameReviewData.summary.mistakesPerGame.toFixed(1)}
                </div>
                <div className="text-xs sm:text-sm text-slate-500 mt-0.5">{t('gameReview.mistakesPerGame')}</div>
              </div>
              <div className="p-4 bg-white border border-slate-200 shadow-sm rounded-xl">
                <div className="text-2xl font-semibold tabular-nums text-slate-900">
                  {gameReviewData.summary.totalGamesAnalyzed}
                </div>
                <div className="text-xs sm:text-sm text-slate-500 mt-0.5">{t('gameReview.gamesAnalyzed')}</div>
              </div>
              <div className="p-4 bg-white border border-slate-200 shadow-sm rounded-xl">
                <div className="text-2xl font-semibold tabular-nums text-slate-900">
                  {gameReviewData.summary.weeklyTrend > 0 ? '+' : ''}{gameReviewData.summary.weeklyTrend.toFixed(1)}%
                </div>
                <div className="text-xs sm:text-sm text-slate-500 mt-0.5">{t('gameReview.weeklyTrend')}</div>
              </div>
            </div>
          )}
        </div>

        {/* No Chess Profiles */}
        {!isLoadingUser && !hasProfiles && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 text-center">
            <Target className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">{t('gameReview.noProfilesConnected')}</h3>
            <p className="text-sm text-slate-600 mb-6">
              {t('gameReview.connectProfilesDesc')}
            </p>
            <Link href="/settings">
              <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                {t('settings.addChessProfile')}
              </Button>
            </Link>
          </div>
        )}

        {!isLoadingUser && hasProfiles && !isLoadingStats && !statsError && !hasImportedGames && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 text-center">
            <Calendar className="h-12 w-12 text-amber-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">{getImportStatusTitle(importSummaryStatus, t)}</h3>
            <p className="text-sm text-slate-600 mb-6">
              {getImportStatusDescription(importSummaryStatus)}
            </p>
            <Button
              onClick={() => void refreshImport()}
              disabled={isRefreshingImport || importSummaryStatus === 'queued' || importSummaryStatus === 'running'}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isRefreshingImport ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              {getImportActionLabel(importSummaryStatus, isRefreshingImport, t)}
            </Button>
          </div>
        )}

        {!isLoadingUser && hasProfiles && !isLoadingStats && !statsError && hasImportedGames && !hasData && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 text-center">
            <BarChart3 className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">{t('gameReview.noAnalysisYet')}</h3>
            <p className="text-sm text-slate-600">
              {t('gameReview.noAnalysisDesc')}
            </p>
          </div>
        )}

        {/* Loading State */}
        {isLoadingStats && hasProfiles && (
          <div className="space-y-6">
            <LoadingSkeletons />
            <LoadingSkeletons />
          </div>
        )}

        {/* Error State */}
        {statsError && !isLoadingStats && hasProfiles && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 text-center">
            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-red-900 mb-2">{t('gameReview.analysisError')}</h3>
              <p className="text-red-700 text-sm mb-4">{statsError}</p>
              <Button
                onClick={refetch}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {t('common.tryAgain')}
              </Button>
            </div>
          </div>
        )}

        {/* Charts Grid */}
        {!isLoadingStats && hasProfiles && !statsError && hasData && gameReviewData && (
          <div className="space-y-6">
            {/* Weakness Diagnosis Overview */}
            <WeaknessDiagnosisSection
              diagnosis={gameReviewData.diagnosis}
              activeTimeClass={timeClass}
              onSelectTimeClass={setTimeClass}
            />

            {/* Performance Trends Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Weekly Recognition Trend */}
              <Card className="bg-white border-slate-200 shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base font-semibold tracking-tight text-slate-900">
                    <TrendingUp className="h-4 w-4 text-blue-600" />
                    <span>{t('gameReview.weeklyRecognitionTrend')}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <WeeklyTrendChart data={gameReviewData} />
                </CardContent>
              </Card>

              {/* My Mistakes Trend */}
              <Card className="bg-white border-slate-200 shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base font-semibold tracking-tight text-slate-900">
                    <TrendingUp className="h-4 w-4 text-slate-500" />
                    <span>{t('gameReview.myMistakesTrend')}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <MyMistakesTrendChart data={gameReviewData} />
                </CardContent>
              </Card>
            </div>

            {/* My Mistakes Analysis */}
            <Card className="bg-white border-slate-200 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base font-semibold tracking-tight text-slate-900">
                  <Calendar className="h-4 w-4 text-slate-500" />
                  <span>{t('gameReview.myMistakesByTheme')}</span>
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
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-white border-slate-200 shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base font-semibold tracking-tight text-slate-900">
                    <Target className="h-4 w-4 text-slate-500" />
                    <span>{t('gameReview.missedByTheme')}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ThemeAnalysisChart
                    data={gameReviewData.opponentMistakesMissed3M}
                    type="missed"
                  />
                </CardContent>
              </Card>

              <Card className="bg-white border-slate-200 shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base font-semibold tracking-tight text-slate-900">
                    <Target className="h-4 w-4 text-emerald-600" />
                    <span>{t('gameReview.caughtByTheme')}</span>
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
            <Card className="bg-white border-slate-200 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base font-semibold tracking-tight text-slate-900">
                  <Target className="h-4 w-4 text-blue-600" />
                  <span>{t('gameReview.captureSuccessRateByTheme')}</span>
                </CardTitle>
                <p className="text-sm text-slate-500 mt-1">
                  {t('gameReview.captureSuccessRateDesc')}
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
            <Card className="bg-white border-slate-200 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base font-semibold tracking-tight text-slate-900">
                  <TrendingUp className="h-4 w-4 text-blue-600" />
                  <span>{t('gameReview.themeSuccessRateTrends')}</span>
                </CardTitle>
                <p className="text-sm text-slate-500 mt-1">
                  {t('gameReview.themeSuccessRateTrendsDesc')}
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
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-white border-slate-200 shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base font-semibold tracking-tight text-slate-900">
                    <BarChart3 className="h-4 w-4 text-slate-500" />
                    <span>{t('gameReview.performanceByGamePhase')}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <GamePhaseChart data={gameReviewData} />
                </CardContent>
              </Card>

              <Card className="bg-white border-slate-200 shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base font-semibold tracking-tight text-slate-900">
                    <PieChart className="h-4 w-4 text-slate-500" />
                    <span>{t('gameReview.performanceByColor')}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ColorPerformanceChart data={gameReviewData} />
                </CardContent>
              </Card>
            </div>

            {/* Move Length Trend Analysis */}
            <Card className="bg-white border-slate-200 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base font-semibold tracking-tight text-slate-900">
                  <TrendingUp className="h-4 w-4 text-slate-500" />
                  <span>{t('gameReview.puzzleComplexityTrends')}</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <MoveLengthTrendChart data={gameReviewData} />
              </CardContent>
            </Card>

            {/* Combined Puzzle Length Distribution */}
            <Card className="bg-white border-slate-200 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base font-semibold tracking-tight text-slate-900">
                  <BarChart3 className="h-4 w-4 text-slate-500" />
                  <span>{t('gameReview.puzzleLengthComparison')}</span>
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

function getImportAnalysisStatus(
  status: string | undefined,
  t: ReturnType<typeof useI18n>["t"],
): string {
  switch (status) {
    case 'queued':
      return t('gameReview.importQueued')
    case 'running':
      return t('gameReview.importRunning')
    case 'failed':
      return t('gameReview.importFailed')
    case 'complete':
      return t('gameReview.importComplete')
    default:
      return t('gameReview.waitingForAnalysis')
  }
}

function getImportStatusTitle(
  status: string | undefined,
  t: ReturnType<typeof useI18n>["t"],
): string {
  switch (status) {
    case 'queued':
      return t('gameReview.importTitleQueued')
    case 'running':
      return t('gameReview.importTitleRunning')
    case 'failed':
      return t('gameReview.importTitleFailed')
    case 'complete':
      return t('gameReview.importTitleComplete')
    default:
      return t('gameReview.importTitlePending')
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

function getImportActionLabel(
  status: string | undefined,
  isRefreshingImport: boolean,
  t: ReturnType<typeof useI18n>["t"],
): string {
  if (isRefreshingImport) return t('gameReview.startingImport')
  switch (status) {
    case 'queued':
      return t('gameReview.importQueued')
    case 'running':
      return t('gameReview.importRunning')
    case 'failed':
      return t('gameReview.retryImport')
    default:
      return t('gameReview.startImport')
  }
}
