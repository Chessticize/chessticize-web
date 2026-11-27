import type { SavedPracticeRun, UserPreferences } from '@/lib/api/preferences'
import { VALID_PER_PUZZLE_TIMES, VALID_SPRINT_DURATIONS, VALID_THEMES } from '@/lib/sprint-config'

export const PRACTICE_RUNS_STORAGE_KEY = 'chessticize_practice_runs_v1'
export const PRACTICE_RUNS_CHANGE_EVENT = 'chessticize-practice-runs-change'
export const MAX_SAVED_PRACTICE_RUNS = 20

export const DEFAULT_CUSTOM_PRACTICE_RUNS: readonly SavedPracticeRun[] = [
  {
    id: 'blitz-5-10',
    name: 'Blitz Sprint',
    theme: 'mixed',
    duration_minutes: 5,
    per_puzzle_seconds: 10,
  },
]

const VALID_THEME_SET = new Set<string>(VALID_THEMES)
const VALID_DURATION_SET = new Set<number>(VALID_SPRINT_DURATIONS)
const VALID_PACE_SET = new Set<number>(VALID_PER_PUZZLE_TIMES)

export function isValidSavedPracticeRun(input: unknown): input is SavedPracticeRun {
  if (!input || typeof input !== 'object') return false
  const run = input as Partial<SavedPracticeRun>
  return (
    typeof run.id === 'string' &&
    /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/.test(run.id) &&
    typeof run.name === 'string' &&
    run.name.trim().length > 0 &&
    run.name.trim().length <= 40 &&
    typeof run.theme === 'string' &&
    VALID_THEME_SET.has(run.theme) &&
    typeof run.duration_minutes === 'number' &&
    Number.isInteger(run.duration_minutes) &&
    run.duration_minutes >= 1 &&
    run.duration_minutes <= 60 &&
    typeof run.per_puzzle_seconds === 'number' &&
    Number.isInteger(run.per_puzzle_seconds) &&
    run.per_puzzle_seconds >= 5 &&
    run.per_puzzle_seconds <= 300
  )
}

export function normalizeSavedPracticeRuns(input: unknown): SavedPracticeRun[] {
  if (!Array.isArray(input)) return [...DEFAULT_CUSTOM_PRACTICE_RUNS]
  const seen = new Set<string>()
  const out: SavedPracticeRun[] = []
  for (const item of input) {
    if (!isValidSavedPracticeRun(item)) continue
    if (seen.has(item.id)) continue
    seen.add(item.id)
    out.push({
      id: item.id,
      name: item.name.trim(),
      theme: item.theme,
      duration_minutes: VALID_DURATION_SET.has(item.duration_minutes)
        ? item.duration_minutes
        : item.duration_minutes,
      per_puzzle_seconds: VALID_PACE_SET.has(item.per_puzzle_seconds)
        ? item.per_puzzle_seconds
        : item.per_puzzle_seconds,
    })
    if (out.length >= MAX_SAVED_PRACTICE_RUNS) break
  }
  return out
}

export function readStoredPracticeRuns(): SavedPracticeRun[] {
  if (typeof window === 'undefined') return [...DEFAULT_CUSTOM_PRACTICE_RUNS]
  try {
    const raw = window.localStorage.getItem(PRACTICE_RUNS_STORAGE_KEY)
    if (!raw) return [...DEFAULT_CUSTOM_PRACTICE_RUNS]
    return normalizeSavedPracticeRuns(JSON.parse(raw))
  } catch {
    return [...DEFAULT_CUSTOM_PRACTICE_RUNS]
  }
}

export function hasStoredPracticeRuns(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return window.localStorage.getItem(PRACTICE_RUNS_STORAGE_KEY) !== null
  } catch {
    return false
  }
}

export function savePracticeRuns(runs: SavedPracticeRun[]): SavedPracticeRun[] {
  const normalized = normalizeSavedPracticeRuns(runs)
  if (typeof window === 'undefined') return normalized

  try {
    window.localStorage.setItem(PRACTICE_RUNS_STORAGE_KEY, JSON.stringify(normalized))
  } catch {
    // Ignore storage write errors
  }

  window.dispatchEvent(
    new CustomEvent<SavedPracticeRun[]>(PRACTICE_RUNS_CHANGE_EVENT, {
      detail: normalized,
    }),
  )
  return normalized
}

export function hydratePracticeRunsFromPreferences(
  prefs?: UserPreferences | null,
): SavedPracticeRun[] {
  if (!prefs || !Array.isArray(prefs.practice_runs)) {
    return readStoredPracticeRuns()
  }
  return savePracticeRuns(prefs.practice_runs)
}

export function buildPracticeRunId(name: string, existingIds: ReadonlySet<string>): string {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32)
  const base = slug && /^[a-z0-9]/.test(slug) ? slug : 'run'
  if (!existingIds.has(base)) return base
  let suffix = 2
  while (existingIds.has(`${base}-${suffix}`)) {
    suffix += 1
  }
  return `${base}-${suffix}`
}

export function eloTypeForSavedRun(run: SavedPracticeRun): string {
  return `${run.theme} ${run.duration_minutes}/${run.per_puzzle_seconds}`
}

export function getSavedRunHref(run: SavedPracticeRun): string {
  if (
    run.theme === 'mixed' &&
    run.duration_minutes === 5 &&
    run.per_puzzle_seconds === 10
  ) {
    return '/puzzle-sprint/blitz'
  }
  const params = new URLSearchParams({
    theme: run.theme,
    duration: String(run.duration_minutes),
    perPuzzle: String(run.per_puzzle_seconds),
    autostart: '1',
  })
  return `/puzzle-sprint/custom?${params.toString()}`
}
