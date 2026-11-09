"use client"

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { SprintSession } from '@/components/puzzle-sprint/SprintSession'
import { SprintResults } from '@/components/puzzle-sprint/SprintResults'
import { SprintErrorBoundary } from '@/components/puzzle-sprint/ErrorBoundary'
import { EndSprintResponse } from '@/hooks/useSprintApi'
import { useUserContext } from '@/hooks/useUserContext'
import { getBlitzEloType } from '@/lib/sprint-config'

export default function BlitzSprintPage() {
  const router = useRouter()
  const { refreshUser } = useUserContext()
  const [sprintResults, setSprintResults] = useState<EndSprintResponse | null>(null)
  const [showResults, setShowResults] = useState(false)

  const handleSprintComplete = async (results: EndSprintResponse) => {
    setSprintResults(results)
    setShowResults(true)
    // Refresh user data to get updated elo ratings
    await refreshUser()
  }

  const handleRestart = () => {
    setSprintResults(null)
    setShowResults(false)
  }

  const handleExit = () => {
    router.push('/puzzle-sprint')
  }

  if (showResults && sprintResults) {
    return (
      <SprintErrorBoundary>
        <SprintResults
          results={sprintResults}
          eloType={getBlitzEloType()}
          onRestart={handleRestart}
          onHome={handleExit}
        />
      </SprintErrorBoundary>
    )
  }

  return (
    <SprintErrorBoundary>
      <SprintSession
        eloType={getBlitzEloType()}
        onExit={handleExit}
        onComplete={handleSprintComplete}
      />
    </SprintErrorBoundary>
  )
}
