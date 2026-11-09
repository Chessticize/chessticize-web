import { useCallback, useEffect, useMemo, useState } from "react"
import { ApiError } from "@/lib/auth/api-client"
import {
  getSprintStats,
  SprintStatsParams,
  V2SprintStatsResponse,
} from "@/lib/api/library"

interface UseSprintStatsReturn {
  stats: V2SprintStatsResponse | null
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useSprintStats(params: SprintStatsParams = {}, enabled = true): UseSprintStatsReturn {
  const [stats, setStats] = useState<V2SprintStatsResponse | null>(null)
  const [isLoading, setIsLoading] = useState(enabled)
  const [error, setError] = useState<string | null>(null)
  const paramsKey = useMemo(() => JSON.stringify(params), [params])
  const requestParams = useMemo(() => JSON.parse(paramsKey) as SprintStatsParams, [paramsKey])

  const loadStats = useCallback(async () => {
    if (!enabled) {
      setStats(null)
      setIsLoading(false)
      setError(null)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      setStats(await getSprintStats(requestParams))
    } catch (err) {
      const message = err instanceof ApiError || err instanceof Error
        ? err.message
        : "Failed to load sprint stats"
      setError(message)
      setStats(null)
    } finally {
      setIsLoading(false)
    }
  }, [enabled, requestParams])

  useEffect(() => {
    void loadStats()
  }, [loadStats])

  return {
    stats,
    isLoading,
    error,
    refetch: loadStats,
  }
}
