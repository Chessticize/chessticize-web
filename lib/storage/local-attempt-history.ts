import type { V2AttemptHistoryItem } from '@/lib/api/library'

const LOCAL_HISTORY_STORAGE_KEY = 'chessticize_recent_attempts_v1'
const MAX_LOCAL_HISTORY_ITEMS = 120

export function readLocalAttemptHistory(): V2AttemptHistoryItem[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(LOCAL_HISTORY_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (item): item is V2AttemptHistoryItem =>
        Boolean(item && typeof item.attempt_id === 'string' && typeof item.puzzle_id === 'string'),
    )
  } catch {
    return []
  }
}

export function recordLocalAttempt(entry: V2AttemptHistoryItem): void {
  if (typeof window === 'undefined') return
  try {
    const existing = readLocalAttemptHistory()
    const filtered = existing.filter((item) => item.attempt_id !== entry.attempt_id)
    const next = [entry, ...filtered].slice(0, MAX_LOCAL_HISTORY_ITEMS)
    window.localStorage.setItem(LOCAL_HISTORY_STORAGE_KEY, JSON.stringify(next))
  } catch {
    // Ignore storage quota or private browsing errors
  }
}

export function mergeAttemptHistory(
  remote: readonly V2AttemptHistoryItem[],
  local: readonly V2AttemptHistoryItem[],
): V2AttemptHistoryItem[] {
  const seenIds = new Set<string>()
  const seenFingerprints = new Set<string>()
  const merged: V2AttemptHistoryItem[] = []

  const fingerprint = (item: V2AttemptHistoryItem) => {
    const minuteBucket = Math.floor(new Date(item.attempted_at).getTime() / 60000)
    return `${item.puzzle_source}:${item.puzzle_id}:${item.mode}:${item.context}:${minuteBucket}`
  }

  for (const item of [...remote, ...local]) {
    const fp = fingerprint(item)
    if (seenIds.has(item.attempt_id) || seenFingerprints.has(fp)) {
      continue
    }
    seenIds.add(item.attempt_id)
    seenFingerprints.add(fp)
    merged.push(item)
  }

  return merged.sort(
    (a, b) => new Date(b.attempted_at).getTime() - new Date(a.attempted_at).getTime(),
  )
}
