// @vitest-environment jsdom
import { describe, expect, it, beforeEach, vi } from 'vitest'
import {
  DEFAULT_CUSTOM_PRACTICE_RUNS,
  PRACTICE_RUNS_STORAGE_KEY,
  buildPracticeRunId,
  eloTypeForSavedRun,
  getSavedRunHref,
  hydratePracticeRunsFromPreferences,
  readStoredPracticeRuns,
  savePracticeRuns,
} from '@/lib/practice-runs'

describe('practice-runs', () => {
  const storage = new Map<string, string>()

  beforeEach(() => {
    storage.clear()
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => {
        storage.set(key, String(value))
      },
      removeItem: (key: string) => {
        storage.delete(key)
      },
      clear: () => {
        storage.clear()
      },
    })
  })

  it('defaults to Blitz Sprint when nothing is stored', () => {
    expect(readStoredPracticeRuns()).toEqual(DEFAULT_CUSTOM_PRACTICE_RUNS)
  })

  it('saves, hydrates, and builds autostart URLs for custom runs', () => {
    const custom = {
      id: buildPracticeRunId('Fork Drill', new Set()),
      name: 'Fork Drill',
      theme: 'fork',
      duration_minutes: 5,
      per_puzzle_seconds: 15,
    }
    savePracticeRuns([custom])
    expect(window.localStorage.getItem(PRACTICE_RUNS_STORAGE_KEY)).toContain('Fork Drill')
    expect(eloTypeForSavedRun(custom)).toBe('fork 5/15')
    expect(getSavedRunHref(custom)).toBe('/puzzle-sprint/custom?theme=fork&duration=5&perPuzzle=15&autostart=1')

    const hydrated = hydratePracticeRunsFromPreferences({
      practice_runs: [
        {
          id: 'mate-run',
          name: 'Mate in 2',
          theme: 'mateIn2',
          duration_minutes: 3,
          per_puzzle_seconds: 10,
        },
      ],
    })
    expect(hydrated).toHaveLength(1)
    expect(hydrated[0].id).toBe('mate-run')
  })
})
