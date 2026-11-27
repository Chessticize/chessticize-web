"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Navigation from "@/components/navigation"
import Footer from "@/components/footer"
import { MobileLayout, MobileContainer, MobileCard } from "@/components/ui/mobile-layout"
import { Eye, User, Loader2, Settings, BarChart3, Calendar, RefreshCw, FlaskConical } from "lucide-react"
import { useUserContext } from "@/hooks/useUserContext"
import { useGameReviewData, type GameReviewTimeClass } from "@/hooks/useGameReviewData"
import type { V2ImportJobResponse, V2ProfileImportStatus } from "@/hooks/useGameReviewData"
import { PerformanceOverviewGrid } from "@/components/game-review/layout/PerformanceOverviewGrid"
import { QuickActionsBar } from "@/components/game-review/layout/QuickActionsBar"
import { LoadingSkeletons } from "@/components/game-review/common/LoadingSkeletons"
import { TimeClassFilterBar } from "@/components/game-review/common/TimeClassFilterBar"
import Link from "next/link"
import { useI18n } from "@/components/i18n/i18n-provider"

export default function GameReviewPage() {
  const { t } = useI18n()
  const [timeClass, setTimeClass] = useState<GameReviewTimeClass>("")
  const [selectedProfileKey, setSelectedProfileKey] = useState("")
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
  } = useGameReviewData({ timeClass, profileKey: selectedProfileKey })

  // Get chess profiles from user data
  const chessProfiles = user?.chess_profiles || []
  const importedProfiles = chessProfiles.filter(profile => (profile.games_fetched || 0) > 0)

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
    ? t('common.loading')
    : hasData
      ? t('gameReview.analysisReady')
      : hasProfiles
        ? getImportAnalysisStatus(importSummaryStatus, t)
        : t('gameReview.connectProfiles')

  return (
    <MobileLayout fullHeight>
      <div className="min-h-screen flex flex-col bg-slate-50">
        <Navigation />

        <MobileContainer padding="lg" className="flex-1">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 sm:mb-8 gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900">
                {t('gameReview.title')}
              </h1>
              <p className="text-sm sm:text-base text-slate-500 mt-1">{t('gameReview.subtitle')}</p>
            </div>
            <div
              className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border self-start sm:self-auto text-sm font-medium ${
                hasData
                  ? "bg-blue-50 border-blue-200 text-blue-700"
                  : "bg-white border-slate-200 text-slate-600 shadow-xs"
              }`}
            >
              <Eye className={`h-4 w-4 ${hasData ? "text-blue-600" : "text-slate-400"}`} />
              <span>{analysisStatus}</span>
            </div>
          </div>

          {/* Experimental Notice Banner */}
          <div
            role="status"
            className="mb-6 rounded-xl border border-amber-200 dark:border-amber-800/80 bg-amber-50/85 dark:bg-amber-950/40 px-4 py-3 text-xs sm:text-sm text-amber-950 dark:text-[#FFD699] flex items-start gap-2.5 shadow-2xs"
          >
            <FlaskConical className="h-4 w-4 shrink-0 mt-0.5 text-amber-600 dark:text-[#FFB340]" />
            <div className="space-y-0.5 leading-relaxed">
              <div className="font-semibold">{t("gameReview.experimentalTitle")}</div>
              <p className="text-amber-900/90 dark:text-[#FFE2B3]/90">
                {t("gameReview.experimentalBody")}{" "}
                <a
                  href="https://github.com/Chessticize/chessticize-web/issues/new"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium underline underline-offset-2 hover:opacity-80"
                >
                  GitHub
                </a>
                .
              </p>
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
            <div className="mb-6 flex items-center justify-center py-8 sm:py-12">
              <Loader2 className="h-6 w-6 sm:h-8 sm:w-8 animate-spin text-blue-600" />
              <span className="ml-2 text-base text-slate-600">{t("common.loading")}</span>
            </div>
          )}

          {/* Chess Profile Connection Prompt */}
          {!isLoadingUser && !hasProfiles && (
            <Card className="mb-6 bg-white border-slate-200 shadow-sm">
              <CardHeader className="pb-3 sm:pb-4">
                <CardTitle className="flex items-center gap-2 text-slate-900 text-base sm:text-lg">
                  <User className="h-5 w-5 text-blue-600" />
                  <span>{t("gameReview.connectProfilesTitle")}</span>
                </CardTitle>
                <CardDescription className="text-slate-500 text-sm sm:text-base">
                  {t("gameReview.connectProfilesDesc")}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-center py-6 sm:py-8">
                  <User className="h-12 w-12 sm:h-14 sm:w-14 mx-auto mb-3 sm:mb-4 text-slate-300" />
                  <h3 className="text-base sm:text-lg font-semibold text-slate-900 mb-2">{t("gameReview.noProfilesConnected")}</h3>
                  <p className="text-slate-600 mb-4 sm:mb-6 text-sm sm:text-base">
                    {t("gameReview.noProfilesHint")}
                  </p>
                  <Link href="/settings">
                    <Button className="bg-blue-600 hover:bg-blue-700 text-white text-sm sm:text-base">
                      <Settings className="h-4 w-4 mr-2" />
                      {t("gameReview.goToSettings")}
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          )}

          {!isLoadingUser && hasProfiles && !isLoadingStats && !statsError && !hasImportedGames && (
            <Card className="mb-6 border-slate-200 bg-white shadow-sm">
              <CardHeader className="pb-3 sm:pb-4">
                <CardTitle className="flex items-center gap-2 text-slate-900 text-base sm:text-lg">
                  <Calendar className="h-5 w-5 text-amber-600" />
                  <span>{getImportStatusTitle(importSummaryStatus, t)}</span>
                </CardTitle>
                <CardDescription className="text-slate-500 text-sm sm:text-base">
                  {getImportStatusDescription(importSummaryStatus)}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <Button
                  onClick={() => void refreshImport()}
                  disabled={isRefreshingImport || importSummaryStatus === 'queued' || importSummaryStatus === 'running'}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-sm sm:text-base"
                >
                  {isRefreshingImport ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  {getImportActionLabel(importSummaryStatus, isRefreshingImport, t)}
                </Button>
                {importProgress && (
                  <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
                    <ImportProgressMetric label={t("gameReview.gamesImportedMetric")} value={formatImportProgressValue(importProgress.gamesImported, t)} />
                    <ImportProgressMetric label={t("gameReview.gamesAnalyzedMetric")} value={formatImportProgressValue(importProgress.gamesAnalyzed, t)} />
                    <ImportProgressMetric label={t("gameReview.puzzlesGeneratedMetric")} value={formatImportProgressValue(importProgress.puzzlesGenerated, t)} />
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {!isLoadingUser && hasProfiles && !isLoadingStats && !statsError && hasImportedGames && !hasData && (
            <Card className="mb-6 border-slate-200 bg-white shadow-sm">
              <CardHeader className="pb-3 sm:pb-4">
                <CardTitle className="flex items-center gap-2 text-slate-900 text-base sm:text-lg">
                  <BarChart3 className="h-5 w-5 text-slate-500" />
                  <span>{t("gameReview.noAnalysisYet")}</span>
                </CardTitle>
                <CardDescription className="text-slate-500 text-sm sm:text-base">
                  {t("gameReview.noAnalysisDesc")}
                </CardDescription>
              </CardHeader>
            </Card>
          )}

          {/* Time Control & Profile Filter Strip */}
          {!isLoadingUser && hasImportedGames && (
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
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

          {/* Quick Actions Bar - Moved to top */}
          {!isLoadingStats && hasProfiles && !statsError && hasData && (
            <QuickActionsBar hasData={hasData} data={gameReviewData} timeClass={timeClass} className="mb-6" />
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
                  <h3 className="text-base sm:text-lg font-semibold text-red-900 mb-2">{t("gameReview.analysisError")}</h3>
                  <p className="text-red-700 text-sm sm:text-base mb-4">{statsError}</p>
                  <Button
                    onClick={refetch}
                    className="bg-red-600 hover:bg-red-700 text-white text-sm sm:text-base"
                  >
                    {t("common.tryAgain")}
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
      className="min-h-16 rounded-md border border-slate-200 bg-white px-3 py-2"
      role="group"
      aria-label={`${label}: ${value}`}
    >
      <div className="text-xs font-medium text-slate-500">{label}</div>
      <div className="mt-1 text-lg font-semibold tabular-nums text-slate-900">{value}</div>
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

function formatImportProgressValue(
  value: number | null | undefined,
  t: ReturnType<typeof useI18n>["t"],
): string {
  return typeof value === 'number' ? String(value) : t("gameReview.pending")
}

function getImportAnalysisStatus(
  status: string | undefined,
  t: ReturnType<typeof useI18n>["t"],
): string {
  switch (status) {
    case 'queued':
      return t("gameReview.importQueued")
    case 'running':
      return t("gameReview.importRunning")
    case 'failed':
      return t("gameReview.importFailed")
    case 'complete':
      return t("gameReview.importComplete")
    default:
      return t("gameReview.waitingForAnalysis")
  }
}

function getImportStatusTitle(
  status: string | undefined,
  t: ReturnType<typeof useI18n>["t"],
): string {
  switch (status) {
    case 'queued':
      return t("gameReview.importTitleQueued")
    case 'running':
      return t("gameReview.importTitleRunning")
    case 'failed':
      return t("gameReview.importTitleFailed")
    case 'complete':
      return t("gameReview.importTitleComplete")
    default:
      return t("gameReview.importTitlePending")
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

function getImportActionLabel(
  status: string | undefined,
  isRefreshingImport: boolean,
  t: ReturnType<typeof useI18n>["t"],
): string {
  if (isRefreshingImport) return t("gameReview.startingImport")
  switch (status) {
    case 'queued':
      return t("gameReview.importQueued")
    case 'running':
      return t("gameReview.importRunning")
    case 'failed':
      return t("gameReview.retryImport")
    default:
      return t("gameReview.startImport")
  }
}
