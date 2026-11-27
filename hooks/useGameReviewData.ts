import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { API_CONFIG } from '@/lib/config'
import { apiGet, apiPost } from '@/lib/auth/api-client'
import { ChessProfile } from '@/lib/auth/types'
import { useUserContext } from '@/hooks/useUserContext'

export interface TimeSeriesNode {
  start_time: string
  end_time: string
  stats: {
    theme_counts: Array<{
      theme: string
      count: number
    }>
    average_move_length: number
    total_count?: number
    unique_game_count?: number
    total_games?: number
  }
}

export interface OpponentMistakesTimeSeries {
  nodes: TimeSeriesNode[]
}

export interface MyMistakesTimeSeries {
  nodes: TimeSeriesNode[]
}

export interface TagCount {
  tag: string
  count: number
}

export interface GameMoveBucket {
  name: string
  min_move: number
  max_move: number
  count: number
}

export interface UserColorCount {
  color: string
  count: number
}

export interface MoveLengthCount {
  length: number
  count: number
}

export interface OpponentMistakes3M {
  tag_counts: TagCount[]
  game_move_buckets: GameMoveBucket[]
  user_color_counts: UserColorCount[]
  move_length_counts: MoveLengthCount[]
}

export interface MyMistakes3M {
  tag_counts: TagCount[]
  game_move_buckets: GameMoveBucket[]
  user_color_counts: UserColorCount[]
  move_length_counts: MoveLengthCount[]
}

export type GameReviewTimeClass = '' | 'rapid' | 'blitz' | 'bullet' | 'classical' | 'daily'

export interface UseGameReviewDataOptions {
  timeClass?: GameReviewTimeClass
  profileKey?: string
  enabled?: boolean
}

export interface V2TimeClassDiagnosis {
  time_class: string
  games: number
  caught_count: number
  missed_count: number
  recognition_rate: number
  own_mistakes: number
  mistakes_per_game: number
}

export interface V2ClockDiagnosis {
  total_with_clock: number
  time_trouble_count: number
  impulsive_count: number
  deliberate_count: number
  avg_time_spent_sec: number
  time_trouble_rate: number
  impulsive_rate: number
  deliberate_rate: number
}

export interface V2PriorityWeakness {
  tag: string
  missed_count: number
  caught_count: number
  total_count: number
  raw_capture_rate: number
  smoothed_capture_rate: number
  impact_score: number
}

export interface V2OwnMistakeCause {
  cause: string
  count: number
  share: number
}

export interface V2GameReviewDiagnosis {
  time_class_breakdown: V2TimeClassDiagnosis[]
  clock_breakdown: V2ClockDiagnosis
  priority_weaknesses: V2PriorityWeakness[]
  own_mistake_causes: V2OwnMistakeCause[]
}

export interface GameReviewData {
  timeClass?: GameReviewTimeClass
  diagnosis?: V2GameReviewDiagnosis
  opponentMistakesTimeSeries?: OpponentMistakesTimeSeries
  opponentMistakesMissedTimeSeries?: OpponentMistakesTimeSeries
  opponentMistakesMissed3M?: OpponentMistakes3M
  opponentMistakesCaught3M?: OpponentMistakes3M
  opponentMistakesMissed3To6M?: OpponentMistakes3M
  opponentMistakesCaught3To6M?: OpponentMistakes3M
  myMistakesTimeSeries?: MyMistakesTimeSeries
  myMistakes3M?: MyMistakes3M
  opponentMistakesMissedAllTime?: { move_length_counts: MoveLengthCount[] }
  opponentMistakesCaughtAllTime?: { move_length_counts: MoveLengthCount[] }
  myMistakesAllTime?: { move_length_counts: MoveLengthCount[] }
  opponentMistakes?: unknown
  myMistakes?: unknown
  selectedProfile?: {
    platform: string
    username: string
  }
  recommendedReview?: V2RecommendedReview
  summary?: {
    recognitionRate: number
    mistakesPerGame: number
    mistakesPerGameTrend: number
    totalGamesAnalyzed: number
    weeklyTrend: number
    totalPuzzles: number
    missedOpportunities: number
    missedAttacks: number
    caughtOpportunities: number
    caughtAttacks: number
    ownMistakes: number
    averageMoveLength?: number
  }
}

interface UseGameReviewDataReturn {
  data: GameReviewData | null
  importStatus: V2ImportStatusResponse | null
  importJob: V2ImportJobResponse | null
  isLoading: boolean
  isRefreshingImport: boolean
  error: string | null
  refetch: () => Promise<void>
  refreshImport: (profileID?: string) => Promise<void>
}

interface V2GameReviewInsightsResponse {
  filters: Record<string, string>
  summary: {
    games: number
    puzzles: number
    missed_opportunities: number
    missed_attacks: number
    missed_attack_rate: number
    caught_opportunities: number
    caught_attacks: number
    own_mistakes: number
    average_move_length: number
  }
  blindspots: Array<{
    tag: string
    missed_count: number
    total_count: number
    miss_rate: number
  }>
  phase_breakdown: Array<{
    game_phase: string
    missed_count: number
  }>
  series: Array<{
    start: string
    end: string
    games: number
    missed_opportunities: number
    missed_attacks: number
    missed_attack_rate: number
  }>
  recommended_review: V2RecommendedReview
  stats_bundle?: V2GameReviewStatsPayload
  diagnosis?: V2GameReviewDiagnosis
}

interface V2RecommendedReview {
  due_count: number
  due_regular_count: number
  due_arrow_duel_count: number
  total_queued: number
  excluded_count: number
}

export interface V2ImportStatusResponse {
  profiles: V2ProfileImportStatus[]
  summary: {
    status: 'no_profiles' | 'not_started' | 'queued' | 'running' | 'failed' | 'complete'
    has_profiles: boolean
    has_imported_games: boolean
    queued_count: number
    running_count: number
    failed_count: number
    complete_count: number
    not_started_count: number
  }
}

export interface V2ProfileImportStatus {
  profile_id: string
  platform: string
  username: string
  status: 'not_started' | 'queued' | 'running' | 'failed' | 'complete'
  games_fetched: number
  games_imported?: number
  games_analyzed?: number | null
  puzzles_generated?: number | null
  last_game_fetched_at?: string | null
  last_game_played_at?: string | null
  task_id?: string
  task_status?: 'pending' | 'in_progress' | 'completed' | 'failed'
  task_error?: string
  task_created_at?: string
  task_updated_at?: string
}

export interface V2ImportJobResponse {
  job_id: string
  import_id?: string
  status: 'not_started' | 'queued' | 'running' | 'failed' | 'complete'
  task_status: 'pending' | 'in_progress' | 'completed' | 'failed'
  profile_id: string
  platform?: string
  username?: string
  reused_existing?: boolean
  games_imported?: number
  games_analyzed?: number | null
  puzzles_generated?: number | null
  task_error?: string
  created_at: string
  updated_at: string
}

interface V2StatsResponse {
  range?: Record<string, string>
  summary: {
    total_puzzles?: number
    unique_games?: number
    average_move_length?: number
  }
  buckets: Record<string, V2StatsBucket[]>
  series: V2StatsSeriesPoint[]
}

interface V2StatsBucket {
  key: string | number | boolean
  count: number
  min_move?: number
  max_move?: number
}

interface V2StatsSeriesPoint {
  start: string
  end: string
  total_puzzles: number
  unique_games: number
  total_games?: number
  average_move_length: number
  buckets: Record<string, V2StatsBucket[]>
}

interface V2GameReviewStatsBundle {
  insights: V2GameReviewInsightsResponse
  opponentSeries: V2StatsResponse
  opponentMissedSeries?: V2StatsResponse
  myMistakesSeries: V2StatsResponse
  opponentMissed3M: V2StatsResponse
  opponentCaught3M: V2StatsResponse
  opponentMissed3To6M: V2StatsResponse
  opponentCaught3To6M: V2StatsResponse
  myMistakes3M: V2StatsResponse
  opponentMissedAllTime: V2StatsResponse
  opponentCaughtAllTime: V2StatsResponse
  myMistakesAllTime: V2StatsResponse
}

interface V2GameReviewStatsPayload {
  opponent_series: V2StatsResponse
  opponent_missed_series?: V2StatsResponse
  my_mistakes_series: V2StatsResponse
  opponent_missed_3m: V2StatsResponse
  opponent_caught_3m: V2StatsResponse
  opponent_missed_3_to_6m: V2StatsResponse
  opponent_caught_3_to_6m: V2StatsResponse
  my_mistakes_3m: V2StatsResponse
  opponent_missed_all_time: V2StatsResponse
  opponent_caught_all_time: V2StatsResponse
  my_mistakes_all_time: V2StatsResponse
}

export function useGameReviewData(options: UseGameReviewDataOptions = {}): UseGameReviewDataReturn {
  const timeClass = options.timeClass ?? ''
  const profileKey = options.profileKey ?? ''
  const enabled = options.enabled ?? true
  const { user } = useUserContext()
  const [data, setData] = useState<GameReviewData | null>(null)
  const [importStatus, setImportStatus] = useState<V2ImportStatusResponse | null>(null)
  const [importJob, setImportJob] = useState<V2ImportJobResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isRefreshingImport, setIsRefreshingImport] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const requestIdRef = useRef(0)

  const chessProfiles = useMemo(() => user?.chess_profiles || [], [user?.chess_profiles])
  const selectedProfile = useMemo(
    () => selectGameReviewProfile(chessProfiles, profileKey),
    [chessProfiles, profileKey]
  )

  const fetchData = useCallback(async () => {
    if (!enabled) return
    const requestId = ++requestIdRef.current

    if (!selectedProfile) {
      setData(null)
      if (chessProfiles.length === 0) {
        setImportStatus(null)
        setImportJob(null)
        setError(null)
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      setError(null)
      try {
        const nextStatus = await fetchV2ImportStatus()
        if (requestId !== requestIdRef.current) return
        setImportStatus(nextStatus)
        setImportJob(null)
      } catch (err: unknown) {
        if (requestId !== requestIdRef.current) return
        const message = err instanceof Error ? err.message : 'Failed to fetch game import status'
        setError(message)
        setImportStatus(null)
        setImportJob(null)
      } finally {
        if (requestId === requestIdRef.current) {
          setIsLoading(false)
        }
      }
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      setImportStatus(null)
      setImportJob(null)
      const statsBundle = await fetchV2GameReviewStats(selectedProfile, timeClass)
      if (requestId !== requestIdRef.current) return
      setData(mapV2InsightsToGameReviewData(statsBundle, selectedProfile, timeClass))
    } catch (err: unknown) {
      if (requestId !== requestIdRef.current) return
      const message = err instanceof Error ? err.message : 'Failed to fetch game review data'
      setError(message)
      setData(null)
    } finally {
      if (requestId === requestIdRef.current) {
        setIsLoading(false)
      }
    }
  }, [enabled, selectedProfile, chessProfiles.length, timeClass])

  const refreshImport = useCallback(async (profileID?: string) => {
    const targetProfileID = profileID || selectImportRefreshProfile(importStatus, chessProfiles)
    if (!targetProfileID) {
      setError('No chess profile is available to refresh')
      return
    }

    setIsRefreshingImport(true)
    setError(null)
    try {
      const job = await postV2ImportRefresh(targetProfileID)
      setImportJob(job)
      try {
        setImportJob(await fetchV2ImportJob(job.job_id))
      } catch {
        // Keep the queued job from the refresh response if the progress read races the worker.
      }
      setImportStatus(await fetchV2ImportStatus())
      setData(null)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to start game import'
      setError(message)
    } finally {
      setIsRefreshingImport(false)
    }
  }, [chessProfiles, importStatus])

  useEffect(() => {
    void fetchData()
  }, [fetchData])

  return {
    data,
    importStatus,
    importJob,
    isLoading,
    isRefreshingImport,
    error,
    refetch: fetchData,
    refreshImport
  }
}

function selectGameReviewProfile(profiles: ChessProfile[], profileKey = ''): ChessProfile | null {
  if (profiles.length === 0) return null

  const importedProfiles = profiles.filter(profile => (profile.games_fetched || 0) > 0)
  if (importedProfiles.length === 0) return null

  if (profileKey) {
    const matched = importedProfiles.find(
      profile => `${profile.platform}:${profile.username}` === profileKey || profile.id === profileKey
    )
    if (matched) return matched
  }

  return [...importedProfiles].sort((a, b) => {
    const aGames = a.games_fetched || 0
    const bGames = b.games_fetched || 0
    if (aGames !== bGames) return bGames - aGames
    return new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime()
  })[0]
}

async function fetchV2ImportStatus(): Promise<V2ImportStatusResponse> {
  return await fetchV2JSON<V2ImportStatusResponse>(`${API_CONFIG.BASE_URL}/me/import-status`)
}

async function postV2ImportRefresh(profileID: string): Promise<V2ImportJobResponse> {
  const response = await apiPost(`${API_CONFIG.BASE_URL}/me/chess-profiles/${encodeURIComponent(profileID)}:refresh`)
  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(errorText || `Game import refresh failed: ${response.status}`)
  }
  return await response.json() as V2ImportJobResponse
}

async function fetchV2ImportJob(jobID: string): Promise<V2ImportJobResponse> {
  return await fetchV2JSON<V2ImportJobResponse>(`${API_CONFIG.BASE_URL}/me/import-jobs/${encodeURIComponent(jobID)}`)
}

function selectImportRefreshProfile(
  importStatus: V2ImportStatusResponse | null,
  profiles: ChessProfile[]
): string | null {
  const idleImportProfile = importStatus?.profiles.find(profile =>
    profile.status === 'not_started' || profile.status === 'failed' || profile.status === 'complete'
  )
  if (idleImportProfile) return idleImportProfile.profile_id

  const firstStatusProfile = importStatus?.profiles[0]
  if (firstStatusProfile) return firstStatusProfile.profile_id

  return profiles[0]?.id || null
}

interface GameReviewWindowDates {
  endDate: Date
  startDate3M: Date
  startDate6M: Date
}

function gameReviewWindowDates(): GameReviewWindowDates {
  const endDate = new Date()
  const startDate3M = new Date(endDate)
  startDate3M.setMonth(startDate3M.getMonth() - 3)
  const startDate6M = new Date(endDate)
  startDate6M.setMonth(startDate6M.getMonth() - 6)
  return { endDate, startDate3M, startDate6M }
}

function buildGameReviewInsightsUrl(
  profile: ChessProfile,
  includeStatsBundle = false,
  windows = gameReviewWindowDates(),
  timeClass: GameReviewTimeClass = ''
): string {
  const params = new URLSearchParams({
    platform: profile.platform,
    username: profile.username,
    from: windows.startDate6M.toISOString(),
    to: windows.endDate.toISOString(),
    group_by: 'week',
    group_length: '1'
  })
  if (timeClass) params.set('time_class', timeClass)
  if (includeStatsBundle) params.set('include_stats_bundle', 'true')

  return `${API_CONFIG.BASE_URL}/me/insights/game-review?${params.toString()}`
}

async function fetchV2GameReviewStats(
  profile: ChessProfile,
  timeClass: GameReviewTimeClass = ''
): Promise<V2GameReviewStatsBundle> {
  const windows = gameReviewWindowDates()
  const insights = await fetchV2JSON<V2GameReviewInsightsResponse>(
    buildGameReviewInsightsUrl(profile, true, windows, timeClass)
  )
  if (!insights.stats_bundle) {
    throw new Error('Game review stats bundle is missing from the v2 response')
  }

  return mapV2StatsPayload(insights, insights.stats_bundle)
}

function mapV2StatsPayload(
  insights: V2GameReviewInsightsResponse,
  statsBundle: V2GameReviewStatsPayload
): V2GameReviewStatsBundle {
  return {
    insights,
    opponentSeries: statsBundle.opponent_series,
    opponentMissedSeries: statsBundle.opponent_missed_series,
    myMistakesSeries: statsBundle.my_mistakes_series,
    opponentMissed3M: statsBundle.opponent_missed_3m,
    opponentCaught3M: statsBundle.opponent_caught_3m,
    opponentMissed3To6M: statsBundle.opponent_missed_3_to_6m,
    opponentCaught3To6M: statsBundle.opponent_caught_3_to_6m,
    myMistakes3M: statsBundle.my_mistakes_3m,
    opponentMissedAllTime: statsBundle.opponent_missed_all_time,
    opponentCaughtAllTime: statsBundle.opponent_caught_all_time,
    myMistakesAllTime: statsBundle.my_mistakes_all_time
  }
}

async function fetchV2JSON<T>(url: string): Promise<T> {
  const response = await apiGet(url)
  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(errorText || `Game review request failed: ${response.status}`)
  }
  return await response.json() as T
}

function mapV2InsightsToGameReviewData(
  statsBundle: V2GameReviewStatsBundle,
  profile: ChessProfile,
  timeClass: GameReviewTimeClass = ''
): GameReviewData {
  const { insights } = statsBundle
  const myMistakesTimeSeries = toMyMistakesTimeSeries(statsBundle.myMistakesSeries, insights.series)
  const summary = mapV2Summary(insights, statsBundle.opponentSeries, myMistakesTimeSeries)

  return {
    timeClass,
    diagnosis: insights.diagnosis,
    selectedProfile: {
      platform: profile.platform,
      username: profile.username
    },
    recommendedReview: insights.recommended_review,
    opponentMistakesTimeSeries: toOpponentTimeSeries(statsBundle.opponentSeries),
    opponentMistakesMissedTimeSeries: statsBundle.opponentMissedSeries
      ? toOpponentTimeSeries(statsBundle.opponentMissedSeries)
      : undefined,
    myMistakesTimeSeries,
    opponentMistakesMissed3M: toPuzzleStats(statsBundle.opponentMissed3M),
    opponentMistakesCaught3M: toPuzzleStats(statsBundle.opponentCaught3M),
    opponentMistakesMissed3To6M: toPuzzleStats(statsBundle.opponentMissed3To6M),
    opponentMistakesCaught3To6M: toPuzzleStats(statsBundle.opponentCaught3To6M),
    myMistakes3M: toPuzzleStats(statsBundle.myMistakes3M),
    opponentMistakesMissedAllTime: { move_length_counts: toMoveLengthCounts(statsBundle.opponentMissedAllTime) },
    opponentMistakesCaughtAllTime: { move_length_counts: toMoveLengthCounts(statsBundle.opponentCaughtAllTime) },
    myMistakesAllTime: { move_length_counts: toMoveLengthCounts(statsBundle.myMistakesAllTime) },
    opponentMistakes: insights.summary,
    myMistakes: insights.summary.own_mistakes > 0 ? insights.summary : null,
    summary
  }
}

function toPuzzleStats(stats: V2StatsResponse): OpponentMistakes3M {
  return {
    tag_counts: toTagCounts(stats),
    game_move_buckets: toGameMoveBuckets(stats),
    user_color_counts: toUserColorCounts(stats),
    move_length_counts: toMoveLengthCounts(stats)
  }
}

function toOpponentTimeSeries(stats: V2StatsResponse): OpponentMistakesTimeSeries {
  return {
    nodes: stats.series.map(item => ({
      start_time: item.start,
      end_time: item.end,
      stats: {
        theme_counts: toThemeCounts(item),
        total_count: item.total_puzzles || 0,
        unique_game_count: item.unique_games || 0,
        average_move_length: item.average_move_length || 0
      }
    }))
  }
}

function toMyMistakesTimeSeries(
  stats: V2StatsResponse,
  insightsSeries?: V2GameReviewInsightsResponse['series']
): MyMistakesTimeSeries {
  const gamesByStart = new Map<string, number>()
  insightsSeries?.forEach(point => {
    gamesByStart.set(point.start, point.games)
  })

  return {
    nodes: stats.series.map(item => {
      const totalGames =
        typeof item.total_games === 'number'
          ? item.total_games
          : gamesByStart.get(item.start)
      return {
        start_time: item.start,
        end_time: item.end,
        stats: {
          theme_counts: toThemeCounts(item),
          total_count: item.total_puzzles || 0,
          unique_game_count: item.unique_games || 0,
          total_games: totalGames,
          average_move_length: item.average_move_length || 0
        }
      }
    })
  }
}

function toTagCounts(stats: V2StatsResponse): TagCount[] {
  return (stats.buckets.tag || []).map(item => ({
    tag: String(item.key),
    count: item.count
  }))
}

function toThemeCounts(point: V2StatsSeriesPoint): Array<{ theme: string; count: number }> {
  return (point.buckets.theme || []).map(item => ({
    theme: String(item.key),
    count: item.count
  }))
}

function toGameMoveBuckets(stats: V2StatsResponse): GameMoveBucket[] {
  return (stats.buckets.game_move_bucket || []).map(item => ({
    name: String(item.key),
    min_move: item.min_move || 0,
    max_move: item.max_move || 0,
    count: item.count
  }))
}

function toUserColorCounts(stats: V2StatsResponse): UserColorCount[] {
  return (stats.buckets.user_color || []).map(item => ({
    color: String(item.key),
    count: item.count
  }))
}

function toMoveLengthCounts(stats: V2StatsResponse): MoveLengthCount[] {
  return (stats.buckets.move_length || []).map(item => ({
    length: Number(item.key),
    count: item.count
  }))
}

function mapV2Summary(
  insights: V2GameReviewInsightsResponse,
  opponentSeries: V2StatsResponse,
  myMistakesSeries: MyMistakesTimeSeries
): NonNullable<GameReviewData['summary']> {
  const missed = insights.summary.missed_opportunities + insights.summary.missed_attacks
  const caught = insights.summary.caught_opportunities + insights.summary.caught_attacks
  const totalOpportunities = missed + caught

  return {
    recognitionRate: totalOpportunities > 0 ? (caught / totalOpportunities) * 100 : 0,
    mistakesPerGame: insights.summary.games > 0 ? insights.summary.own_mistakes / insights.summary.games : 0,
    mistakesPerGameTrend: calculateMistakesPerGameTrend(myMistakesSeries),
    totalGamesAnalyzed: insights.summary.games,
    weeklyTrend: calculateWeeklyTrend(opponentSeries),
    totalPuzzles: insights.summary.puzzles,
    missedOpportunities: insights.summary.missed_opportunities,
    missedAttacks: insights.summary.missed_attacks,
    caughtOpportunities: insights.summary.caught_opportunities,
    caughtAttacks: insights.summary.caught_attacks,
    ownMistakes: insights.summary.own_mistakes,
    averageMoveLength: insights.summary.average_move_length || 0
  }
}

function calculateWeeklyTrend(stats: V2StatsResponse): number {
  const activeWeeks = stats.series
    .map(item => {
      let caught = 0
      let missed = 0
      for (const theme of toThemeCounts(item)) {
        if (theme.theme.includes('caught')) caught += theme.count
        if (theme.theme.includes('missed')) missed += theme.count
      }
      const total = caught + missed
      return total > 0 ? { caught, total } : null
    })
    .filter((entry): entry is { caught: number; total: number } => entry !== null)

  if (activeWeeks.length < 2) return 0
  const recent = activeWeeks.slice(-4)
  const mid = Math.floor(recent.length / 2)
  const firstHalf = recent.slice(0, mid)
  const secondHalf = recent.slice(mid)

  const firstCaught = firstHalf.reduce((sum, w) => sum + w.caught, 0)
  const firstTotal = firstHalf.reduce((sum, w) => sum + w.total, 0)
  const secondCaught = secondHalf.reduce((sum, w) => sum + w.caught, 0)
  const secondTotal = secondHalf.reduce((sum, w) => sum + w.total, 0)

  if (firstTotal <= 0 || secondTotal <= 0) return 0
  return (secondCaught / secondTotal) * 100 - (firstCaught / firstTotal) * 100
}

function calculateMistakesPerGameTrend(stats: MyMistakesTimeSeries): number {
  const activeWeeks = stats.nodes
    .map(node => {
      const games = node.stats.total_games ?? node.stats.unique_game_count ?? 0
      if (games <= 0) return null
      return { mistakes: node.stats.total_count || 0, games }
    })
    .filter((entry): entry is { mistakes: number; games: number } => entry !== null)

  if (activeWeeks.length < 2) return 0
  const recent = activeWeeks.slice(-4)
  const mid = Math.floor(recent.length / 2)
  const firstHalf = recent.slice(0, mid)
  const secondHalf = recent.slice(mid)

  const firstMistakes = firstHalf.reduce((sum, w) => sum + w.mistakes, 0)
  const firstGames = firstHalf.reduce((sum, w) => sum + w.games, 0)
  const secondMistakes = secondHalf.reduce((sum, w) => sum + w.mistakes, 0)
  const secondGames = secondHalf.reduce((sum, w) => sum + w.games, 0)

  if (firstGames <= 0 || secondGames <= 0) return 0
  return secondMistakes / secondGames - firstMistakes / firstGames
}
