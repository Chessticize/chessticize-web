"use client"

import React, { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { SprintSession } from '@/components/puzzle-sprint/SprintSession'
import { SprintResults } from '@/components/puzzle-sprint/SprintResults'
import { SprintErrorBoundary } from '@/components/puzzle-sprint/ErrorBoundary'
import { EndSprintResponse } from '@/hooks/useSprintApi'
import { getThemeDisplayName } from '@/lib/theme-config'
import { getThemeEloType, SPRINT_DISPLAY } from '@/lib/sprint-config'

export default function ThemeSprintPage() {
  const router = useRouter()
  const params = useParams()
  const theme = params.theme as string
  const [sprintResults, setSprintResults] = useState<EndSprintResponse | null>(null)
  const [showResults, setShowResults] = useState(false)

  // Generate elo type for theme-specific sprint
  const eloType = getThemeEloType(theme)
  const themeDisplayName = getThemeDisplayName(theme)

  const handleSprintComplete = (results: EndSprintResponse) => {
    setSprintResults(results)
    setShowResults(true)
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
          eloType={eloType}
          onRestart={handleRestart}
          onHome={handleExit}
        />
      </SprintErrorBoundary>
    )
  }

  return (
    <SprintErrorBoundary>
      <div className="min-h-screen bg-gray-50">
        {/* Theme Header */}
        <div className="bg-white border-b border-gray-200 py-4">
          <div className="max-w-6xl mx-auto px-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {SPRINT_DISPLAY.THEME.getName(themeDisplayName)}
                </h1>
                <p className="text-gray-600 mt-1">
                  {SPRINT_DISPLAY.THEME.getDescription(themeDisplayName)}
                </p>
              </div>
              <div className="text-sm text-gray-500">
                Theme: {theme}
              </div>
            </div>
          </div>
        </div>

        <SprintSession
          eloType={eloType}
          onExit={handleExit}
          onComplete={handleSprintComplete}
        />
      </div>
    </SprintErrorBoundary>
  )
}
