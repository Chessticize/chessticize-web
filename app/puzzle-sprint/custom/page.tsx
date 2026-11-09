"use client"

import React, { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { SprintSession } from '@/components/puzzle-sprint/SprintSession'
import { SprintResults } from '@/components/puzzle-sprint/SprintResults'
import { CustomSprintSelection } from '@/components/puzzle-sprint/CustomSprintSelection'
import { SprintErrorBoundary } from '@/components/puzzle-sprint/ErrorBoundary'
import { EndSprintResponse, PuzzleAttemptRequest } from '@/hooks/useSprintApi'
import { useUserContext } from '@/hooks/useUserContext'

type PageState = 'selection' | 'sprint' | 'results'

function CustomSprintPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { refreshUser } = useUserContext()
  const [pageState, setPageState] = useState<PageState>('selection')
  const [currentEloType, setCurrentEloType] = useState<string>('')
  const [sprintResults, setSprintResults] = useState<EndSprintResponse | null>(null)
  const [failedAttempts, setFailedAttempts] = useState<PuzzleAttemptRequest[]>([])

  // Extract initial configuration from URL parameters
  const initialConfig = {
    theme: searchParams.get('theme') || undefined,
    durationMinutes: searchParams.get('duration') ? parseInt(searchParams.get('duration')!, 10) : undefined,
    perPuzzleSeconds: searchParams.get('perPuzzle') ? parseInt(searchParams.get('perPuzzle')!, 10) : undefined,
  }

  const handleStartSprint = (eloType: string, mode?: 'regular' | 'arrowduel') => {
    setCurrentEloType(eloType)
    setPageState('sprint')
  }

  const handleSprintComplete = async (results: EndSprintResponse, attempts?: PuzzleAttemptRequest[]) => {
    setSprintResults(results)
    setFailedAttempts(attempts || [])
    setPageState('results')
    // Refresh user data to get updated elo ratings
    await refreshUser()
  }

  const handleRestart = () => {
    setSprintResults(null)
    setPageState('selection')
  }

  const handleBackToSelection = () => {
    setPageState('selection')
  }

  const handleExit = () => {
    router.push('/puzzle-sprint')
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
          onExit={handleBackToSelection}
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
