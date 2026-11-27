"use client"

import { useCallback, useEffect, useState } from 'react'
import {
  DEFAULT_CUSTOM_PRACTICE_RUNS,
  PRACTICE_RUNS_CHANGE_EVENT,
  PRACTICE_RUNS_STORAGE_KEY,
  buildPracticeRunId,
  hasStoredPracticeRuns,
  readStoredPracticeRuns,
  savePracticeRuns,
} from '@/lib/practice-runs'
import {
  syncUserPreferencesInBackground,
  type SavedPracticeRun,
} from '@/lib/api/preferences'

export function usePracticeRuns() {
  const [runs, setRuns] = useState<SavedPracticeRun[]>([...DEFAULT_CUSTOM_PRACTICE_RUNS])
  const [hasCustomConfig, setHasCustomConfig] = useState(false)

  useEffect(() => {
    setHasCustomConfig(hasStoredPracticeRuns())
    setRuns(readStoredPracticeRuns())

    const handleCustomChange = (event: Event) => {
      const customEvent = event as CustomEvent<SavedPracticeRun[]>
      setHasCustomConfig(true)
      if (Array.isArray(customEvent.detail)) {
        setRuns(customEvent.detail)
      } else {
        setRuns(readStoredPracticeRuns())
      }
    }

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === PRACTICE_RUNS_STORAGE_KEY) {
        setHasCustomConfig(hasStoredPracticeRuns())
        setRuns(readStoredPracticeRuns())
      }
    }

    window.addEventListener(PRACTICE_RUNS_CHANGE_EVENT, handleCustomChange)
    window.addEventListener('storage', handleStorageChange)
    return () => {
      window.removeEventListener(PRACTICE_RUNS_CHANGE_EVENT, handleCustomChange)
      window.removeEventListener('storage', handleStorageChange)
    }
  }, [])

  const persistRuns = useCallback((nextRuns: SavedPracticeRun[]) => {
    const saved = savePracticeRuns(nextRuns)
    setHasCustomConfig(true)
    setRuns(saved)
    syncUserPreferencesInBackground({ practice_runs: saved })
  }, [])

  const addRun = useCallback(
    (input: Omit<SavedPracticeRun, 'id'>, baseRuns: SavedPracticeRun[] = runs) => {
      const existingIds = new Set(baseRuns.map((r) => r.id))
      const newRun: SavedPracticeRun = {
        ...input,
        id: buildPracticeRunId(input.name, existingIds),
        name: input.name.trim(),
      }
      persistRuns([...baseRuns, newRun])
      return newRun
    },
    [runs, persistRuns],
  )

  const updateRun = useCallback(
    (id: string, input: Omit<SavedPracticeRun, 'id'>, baseRuns: SavedPracticeRun[] = runs) => {
      persistRuns(
        baseRuns.map((run) =>
          run.id === id
            ? { ...run, ...input, name: input.name.trim() }
            : run,
        ),
      )
    },
    [runs, persistRuns],
  )

  const removeRun = useCallback(
    (id: string, baseRuns: SavedPracticeRun[] = runs) => {
      persistRuns(baseRuns.filter((run) => run.id !== id))
    },
    [runs, persistRuns],
  )

  const moveRun = useCallback(
    (id: string, direction: 'up' | 'down', baseRuns: SavedPracticeRun[] = runs) => {
      const idx = baseRuns.findIndex((run) => run.id === id)
      if (idx === -1) return
      const targetIdx = direction === 'up' ? idx - 1 : idx + 1
      if (targetIdx < 0 || targetIdx >= baseRuns.length) return
      const next = [...baseRuns]
      const [moved] = next.splice(idx, 1)
      next.splice(targetIdx, 0, moved)
      persistRuns(next)
    },
    [runs, persistRuns],
  )

  const reorderRuns = useCallback(
    (nextRuns: SavedPracticeRun[]) => {
      persistRuns(nextRuns)
    },
    [persistRuns],
  )

  return {
    runs,
    hasCustomConfig,
    addRun,
    updateRun,
    removeRun,
    moveRun,
    reorderRuns,
  }
}
