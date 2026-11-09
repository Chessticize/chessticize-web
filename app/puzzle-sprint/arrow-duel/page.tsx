"use client"

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { SprintSession } from '@/components/puzzle-sprint/SprintSession'
import { SprintResults } from '@/components/puzzle-sprint/SprintResults'
import { SprintErrorBoundary } from '@/components/puzzle-sprint/ErrorBoundary'
import { EndSprintResponse, PuzzleAttemptRequest } from '@/hooks/useSprintApi'
import { useUserContext } from '@/hooks/useUserContext'
import { getArrowDuelEloType } from '@/lib/sprint-config'

export default function ArrowDuelSprintPage() {
  const router = useRouter()
  const { refreshUser } = useUserContext()
  const [results, setResults] = useState<EndSprintResponse | null>(null)
  const [failedAttempts, setFailedAttempts] = useState<PuzzleAttemptRequest[]>([])

  const handleSprintComplete = async (sprintResults: EndSprintResponse, attempts?: PuzzleAttemptRequest[]) => {
    setResults(sprintResults)
    setFailedAttempts(attempts || [])
    // Refresh user data to get updated elo ratings
    await refreshUser()
  }

  const handleRestart = () => {
    setResults(null)
  }

  const handleExit = () => {
    router.push('/puzzle-sprint')
  }

  if (results) {
    return (
      <SprintErrorBoundary>
        <SprintResults
          results={results}
          eloType={getArrowDuelEloType()}
          failedAttempts={failedAttempts}
          onRestart={handleRestart}
          onHome={handleExit}
        />
      </SprintErrorBoundary>
    )
  }

  return (
    <SprintErrorBoundary>
      <SprintSession
        eloType={getArrowDuelEloType()}
        onExit={handleExit}
        onComplete={handleSprintComplete}
      />
    </SprintErrorBoundary>
  )
}
