"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Navigation from "@/components/navigation"
import Footer from "@/components/footer"
import { MobileLayout, MobileContainer, MobileCard } from "@/components/ui/mobile-layout"
import { Eye, User, Loader2, Settings, BarChart3, Calendar, RefreshCw } from "lucide-react"
import { useUserContext } from "@/hooks/useUserContext"
import { useGameReviewData } from "@/hooks/useGameReviewData"
import type { V2ImportJobResponse, V2ProfileImportStatus } from "@/hooks/useGameReviewData"
import { PerformanceOverviewGrid } from "@/components/game-review/layout/PerformanceOverviewGrid"
import { QuickActionsBar } from "@/components/game-review/layout/QuickActionsBar"
import { LoadingSkeletons } from "@/components/game-review/common/LoadingSkeletons"
import Link from "next/link"
import { DevelopmentNotice } from "@/components/development-notice"

export default function GameReviewPage() {
  // Global user context
  const { user, isLoading: isLoadingUser, error: userError } = useUserContext()

  // Game review data
  const {
    data: gameReviewData,
    importStatus,
    importJob,
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
  const importProgress = getImportProgress(importStatus?.profiles, importJob)
  const hasImportedGames = importStatus?.summary.has_imported_games ??
    chessProfiles.some(profile => (profile.games_fetched || 0) > 0)
  const hasData = !!(
    gameReviewData?.summary &&
    (gameReviewData.summary.totalGamesAnalyzed > 0 || gameReviewData.summary.totalPuzzles > 0)
  )
  const analysisStatus = isLoadingStats
    ? 'Loading...'
    : hasData
      ? 'Analysis Ready'
      : hasProfiles
        ? getImportAnalysisStatus(importSummaryStatus)
        : 'Connect Profiles'

  return (
    <MobileLayout fullHeight>
      <div className="min-h-screen bg-gray-50">
        <Navigation />

        <MobileContainer padding="lg">
          {/* Development Notice */}
          <DevelopmentNotice className="mb-6" />

          <MobileCard padding="lg" className="mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 space-y-4 sm:space-y-0">
              <div>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-orange-600 mb-2">Game Review & Analysis</h1>
                <p className="text-base sm:text-lg lg:text-xl text-gray-600">Track your tactical recognition and learn from missed opportunities</p>
              </div>
              <div className="flex items-center space-x-2 bg-orange-100 px-3 py-2 rounded-full self-start sm:self-auto">
                <Eye className="h-4 w-4 sm:h-5 sm:w-5 text-orange-600" />
                <span className="text-sm sm:text-base lg:text-lg font-semibold text-orange-800">
                  {analysisStatus}
                </span>
              </div>
            </div>

            {/* Error Messages */}
            {userError && (
              <div className="mb-6 p-3 sm:p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-800 text-sm sm:text-base">User Error: {userError}</p>
              </div>
            )}

            {/* Loading State */}
            {isLoadingUser && (
              <div className="flex items-center justify-center py-8 sm:py-12">
                <Loader2 className="h-6 w-6 sm:h-8 sm:w-8 animate-spin text-orange-600" />
                <span className="ml-2 text-base sm:text-lg text-gray-600">Loading user data...</span>
              </div>
            )}

            {/* Chess Profile Connection Prompt */}
            {!isLoadingUser && !hasProfiles && (
              <Card className="hover:shadow-xl transition-all duration-300 bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200 mb-6">
                <CardHeader className="pb-3 sm:pb-4">
                  <CardTitle className="flex items-center space-x-2 text-blue-800 text-base sm:text-lg">
                    <User className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
                    <span>Connect Chess Profiles</span>
                  </CardTitle>
                  <CardDescription className="text-blue-700 text-sm sm:text-base">
                    Connect your Lichess and Chess.com accounts to start analyzing your games and viewing statistics.
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="text-center py-6 sm:py-8">
                    <User className="h-12 w-12 sm:h-16 sm:w-16 mx-auto mb-3 sm:mb-4 text-blue-300" />
                    <h3 className="text-base sm:text-lg font-semibold text-blue-900 mb-2">No Chess Profiles Connected</h3>
                    <p className="text-blue-700 mb-4 sm:mb-6 text-sm sm:text-base">
                      To view your game analysis and statistics, you need to connect at least one chess profile.
                    </p>
                    <Link href="/settings">
                      <Button className="bg-blue-600 hover:bg-blue-700 text-sm sm:text-base">
                        <Settings className="h-4 w-4 mr-2" />
                        Go to Settings
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            )}

            {!isLoadingUser && hasProfiles && !isLoadingStats && !statsError && !hasImportedGames && (
              <Card className="border-amber-200 bg-amber-50 mb-6">
                <CardHeader className="pb-3 sm:pb-4">
                  <CardTitle className="flex items-center space-x-2 text-amber-800 text-base sm:text-lg">
                    <Calendar className="h-5 w-5 sm:h-6 sm:w-6 text-amber-600" />
                    <span>{getImportStatusTitle(importSummaryStatus)}</span>
                  </CardTitle>
                  <CardDescription className="text-amber-700 text-sm sm:text-base">
                    {getImportStatusDescription(importSummaryStatus)}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <Button
                    onClick={() => void refreshImport()}
                    disabled={isRefreshingImport || importSummaryStatus === 'queued' || importSummaryStatus === 'running'}
                    className="bg-amber-600 hover:bg-amber-700 text-white text-sm sm:text-base"
                  >
                    {isRefreshingImport ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4 mr-2" />
                    )}
                    {getImportActionLabel(importSummaryStatus, isRefreshingImport)}
                  </Button>
                  {importProgress && (
                    <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
                      <ImportProgressMetric label="Games imported" value={formatImportProgressValue(importProgress.gamesImported)} />
                      <ImportProgressMetric label="Games analyzed" value={formatImportProgressValue(importProgress.gamesAnalyzed)} />
                      <ImportProgressMetric label="Puzzles generated" value={formatImportProgressValue(importProgress.puzzlesGenerated)} />
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {!isLoadingUser && hasProfiles && !isLoadingStats && !statsError && hasImportedGames && !hasData && (
              <Card className="border-slate-200 bg-white mb-6">
                <CardHeader className="pb-3 sm:pb-4">
                  <CardTitle className="flex items-center space-x-2 text-slate-800 text-base sm:text-lg">
                    <BarChart3 className="h-5 w-5 sm:h-6 sm:w-6 text-slate-600" />
                    <span>No Analysis Yet</span>
                  </CardTitle>
                  <CardDescription className="text-slate-600 text-sm sm:text-base">
                    Imported games were found, but no tactical analysis is available for this profile yet.
                  </CardDescription>
                </CardHeader>
              </Card>
            )}
          </MobileCard>

          {/* Quick Actions Bar - Moved to top */}
          {!isLoadingStats && hasProfiles && !statsError && hasData && (
            <QuickActionsBar hasData={hasData} data={gameReviewData} className="mb-6" />
          )}

          {/* Performance Overview Cards */}
          {!isLoadingStats && hasProfiles && !statsError && hasData && (
            <div className="mb-6">
              <PerformanceOverviewGrid
                data={gameReviewData}
                isLoading={isLoadingStats}
              />
            </div>
          )}

          {/* Loading State for Stats */}
          {isLoadingStats && hasProfiles && (
            <div className="mb-6">
              <LoadingSkeletons />
            </div>
          )}

          {/* Error State for Stats */}
          {statsError && !isLoadingStats && hasProfiles && (
            <MobileCard padding="lg" className="mb-6">
              <div className="text-center py-8 sm:py-12">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 sm:p-6">
                  <h3 className="text-base sm:text-lg font-semibold text-red-900 mb-2">Analysis Error</h3>
                  <p className="text-red-700 text-sm sm:text-base mb-4">{statsError}</p>
                  <Button
                    onClick={refetch}
                    className="bg-red-600 hover:bg-red-700 text-white text-sm sm:text-base"
                  >
                    Try Again
                  </Button>
                </div>
              </div>
            </MobileCard>
          )}
        </MobileContainer>

        <Footer hideOnMobile={true} />
      </div>
    </MobileLayout>
  )
}

function ImportProgressMetric({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="min-h-16 rounded-md border border-amber-200 bg-white/70 px-3 py-2"
      role="group"
      aria-label={`${label}: ${value}`}
    >
      <div className="text-xs font-medium uppercase text-amber-700">{label}</div>
      <div className="mt-1 text-lg font-semibold text-amber-950">{value}</div>
    </div>
  )
}

function getImportProgress(
  profiles: V2ProfileImportStatus[] | undefined,
  job: V2ImportJobResponse | null
): { gamesImported?: number | null; gamesAnalyzed?: number | null; puzzlesGenerated?: number | null } | null {
  const profile = job?.profile_id
    ? profiles?.find(candidate => candidate.profile_id === job.profile_id)
    : profiles?.find(candidate => candidate.status !== 'not_started') ?? profiles?.[0]
  if (!profile && !job) return null
  if (!job && profile?.status === 'not_started') return null

  return {
    gamesImported: profile?.games_imported ?? job?.games_imported ?? profile?.games_fetched,
    gamesAnalyzed: profile?.games_analyzed ?? job?.games_analyzed,
    puzzlesGenerated: profile?.puzzles_generated ?? job?.puzzles_generated
  }
}

function formatImportProgressValue(value: number | null | undefined): string {
  return typeof value === 'number' ? String(value) : 'Pending'
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
      return 'Your chess profile is connected and the import is waiting to start. Analysis will appear after games are processed.'
    case 'running':
      return 'Your games are currently being imported. Analysis will appear as soon as imported games are processed.'
    case 'failed':
      return 'The latest import failed. Check the connected profile in Settings, then try reconnecting or refreshing it.'
    case 'complete':
      return 'The latest import completed, but no games were added for this profile yet.'
    default:
      return 'Your chess profile is connected. Analysis will appear after games have been imported and processed.'
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
