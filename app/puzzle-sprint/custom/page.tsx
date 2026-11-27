"use client"

import React, { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { SprintSession } from '@/components/puzzle-sprint/SprintSession'
import { SprintResults } from '@/components/puzzle-sprint/SprintResults'
import { CustomSprintSelection } from '@/components/puzzle-sprint/CustomSprintSelection'
import { SprintErrorBoundary } from '@/components/puzzle-sprint/ErrorBoundary'
import { EndSprintResponse, PuzzleAttemptRequest } from '@/hooks/useSprintApi'
import { useUserContext } from '@/hooks/useUserContext'
import { VALID_PER_PUZZLE_TIMES, VALID_SPRINT_DURATIONS, VALID_THEMES } from '@/lib/sprint-config'

type PageState = 'selection' | 'sprint' | 'results'

function resolveAutostartEloType(
  autostart: string | null,
  theme?: string,
  duration?: number,
  perPuzzle?: number,
): string | null {
  if (autostart !== '1' && autostart !== 'true') return null
  if (!theme || !duration || !perPuzzle) return null
  if (!(VALID_THEMES as readonly string[]).includes(theme)) return null
  if (!(VALID_SPRINT_DURATIONS as readonly number[]).includes(duration)) return null
  if (!(VALID_PER_PUZZLE_TIMES as readonly number[]).includes(perPuzzle)) return null
  return `${theme} ${duration}/${perPuzzle}`
}

function CustomSprintPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { refreshUser } = useUserContext()

  const initialConfig = {
    theme: searchParams.get('theme') || undefined,
    durationMinutes: searchParams.get('duration') ? parseInt(searchParams.get('duration')!, 10) : undefined,
    perPuzzleSeconds: searchParams.get('perPuzzle') ? parseInt(searchParams.get('perPuzzle')!, 10) : undefined,
  }
  const autostartEloType = resolveAutostartEloType(
    searchParams.get('autostart'),
    initialConfig.theme,
    initialConfig.durationMinutes,
    initialConfig.perPuzzleSeconds,
  )

  const [pageState, setPageState] = useState<PageState>(autostartEloType ? 'sprint' : 'selection')
  const [currentEloType, setCurrentEloType] = useState<string>(autostartEloType || '')
  const [sprintResults, setSprintResults] = useState<EndSprintResponse | null>(null)
  const [failedAttempts, setFailedAttempts] = useState<PuzzleAttemptRequest[]>([])

  const handleStartSprint = (eloType: string) => {
    setCurrentEloType(eloType)
    setPageState('sprint')
  }

  const handleSprintComplete = async (results: EndSprintResponse, attempts?: PuzzleAttemptRequest[]) => {
    setSprintResults(results)
    setFailedAttempts(attempts || [])
    setPageState('results')
    await refreshUser()
  }

  const handleRestart = () => {
    setSprintResults(null)
    setPageState(autostartEloType ? 'sprint' : 'selection')
  }

  const handleExit = () => {
    router.push('/puzzle-sprint')
  }

  const handleBackFromSprint = () => {
    if (autostartEloType) {
      router.push('/puzzle-sprint')
    } else {
      setPageState('selection')
    }
  }

  if (pageState === 'results' && sprintResults) {
    return (
      <SprintErrorBoundary>
        <SprintResults
          results={sprintResults}
          eloType={currentEloType}
          failedAttempts={failedAttempts}
          onRestart={handleRestart}
          onHome={handleExit}
        />
      </SprintErrorBoundary>
    )
  }

  if (pageState === 'sprint') {
    return (
      <SprintErrorBoundary>
        <SprintSession
          eloType={currentEloType}
          onExit={handleBackFromSprint}
          onComplete={handleSprintComplete}
        />
      </SprintErrorBoundary>
    )
  }

  return (
    <SprintErrorBoundary>
      <CustomSprintSelection
        onStartSprint={handleStartSprint}
        onCancel={handleExit}
        initialConfig={initialConfig}
      />
    </SprintErrorBoundary>
  )
}

export default function CustomSprintPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <CustomSprintPageContent />
    </Suspense>
  )
}
