"use client"

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { EndSprintResponse, PuzzleAttemptRequest } from '@/hooks/useSprintApi'
import { MistakeReview } from './MistakeReview'
import {
  Target,
  Clock,
  TrendingUp,
  TrendingDown,
  RotateCcw,
  Home,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Eye
} from 'lucide-react'

interface SprintResultsProps {
  results: EndSprintResponse
  eloType: string
  failedAttempts?: PuzzleAttemptRequest[]
  onRestart: () => void
  onHome: () => void
  className?: string
}

export function SprintResults({
  results,
  eloType,
  failedAttempts = [],
  onRestart,
  onHome,
  className = ''
}: SprintResultsProps) {
  const [showMistakeReview, setShowMistakeReview] = useState(false)
  // Debug logging reduced for cleaner output

  const isSuccess = results.status === 'completed_success'
  const failedByMistakes = results.status === 'completed_fail_mistakes'
  const failedByTime = results.status === 'completed_fail_time'
  const isAbandoned = results.status === 'abandoned'

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  const getStatusIcon = () => {
    if (isSuccess) return <CheckCircle className="h-12 w-12 text-green-600" />
    if (failedByMistakes) return <AlertTriangle className="h-12 w-12 text-red-600" />
    if (failedByTime) return <Clock className="h-12 w-12 text-orange-600" />
    if (isAbandoned) return <XCircle className="h-12 w-12 text-gray-600" />
    return <Target className="h-12 w-12 text-gray-600" />
  }

  const getStatusTitle = () => {
    if (isSuccess) return 'Sprint Completed!'
    if (failedByMistakes) return 'Sprint Failed - Too Many Mistakes'
    if (failedByTime) return 'Sprint Failed - Time Up'
    if (isAbandoned) return 'Sprint Abandoned'
    return 'Sprint Ended'
  }

  const getStatusMessage = () => {
    if (isSuccess) return 'Excellent work! You completed the sprint successfully.'
    if (failedByMistakes) return 'Don\'t worry - mistakes help you learn. Try again!'
    if (failedByTime) return 'Time ran out, but you\'re improving. Keep practicing!'
    if (isAbandoned) return 'Sprint was abandoned. No worries - you can start fresh anytime!'
    return 'Sprint session completed.'
  }

  const getEloChangeDisplay = () => {
    if (!results.elo_change) return null

    const change = results.elo_change.rating_change
    const isPositive = change > 0
    
    return (
      <div className={`flex items-center space-x-2 ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
        {isPositive ? (
          <TrendingUp className="h-5 w-5" />
        ) : (
          <TrendingDown className="h-5 w-5" />
        )}
        <span className="font-bold text-lg">
          {isPositive ? '+' : ''}{change} Elo
        </span>
      </div>
    )
  }

  // If showing mistake review, render only that
  if (showMistakeReview) {
    return (
      <MistakeReview
        sessionId={results.session_id}
        eloType={eloType}
        failedAttempts={failedAttempts}
        onClose={() => setShowMistakeReview(false)}
      />
    )
  }

  // Otherwise render the results page
  return (
    <div className={`min-h-screen bg-gray-50 flex items-center justify-center p-4 ${className}`}>
      <Card className="max-w-2xl w-full">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto mb-4 p-3 bg-gray-100 rounded-full w-fit">
            {getStatusIcon()}
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">
            {getStatusTitle()}
          </CardTitle>
          <p className="text-gray-600 mt-2">
            {getStatusMessage()}
          </p>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Main Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="p-4 text-center">
                <Target className="h-6 w-6 text-blue-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-blue-900">
                  {results.puzzles_solved}
                </div>
                <div className="text-sm text-blue-700">
                  Puzzles Solved
                </div>
              </CardContent>
            </Card>

            <Card className="border-purple-200 bg-purple-50">
              <CardContent className="p-4 text-center">
                <Clock className="h-6 w-6 text-purple-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-purple-900">
                  {formatTime(results.duration_seconds)}
                </div>
                <div className="text-sm text-purple-700">
                  Time Taken
                </div>
              </CardContent>
            </Card>

            <Card className="border-red-200 bg-red-50">
              <CardContent className="p-4 text-center">
                <AlertTriangle className="h-6 w-6 text-red-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-red-900">
                  {results.mistakes_made}
                </div>
                <div className="text-sm text-red-700">
                  Mistakes Made
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Elo Change */}
          {results.elo_change && (
            <Card className="border-orange-200 bg-orange-50">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-orange-900 mb-1">
                      Rating Change
                    </h3>
                    <p className="text-sm text-orange-700">
                      {eloType} • {results.elo_change.rating_before} → {results.elo_change.rating_after}
                    </p>
                  </div>
                  <div className="text-right">
                    {getEloChangeDisplay()}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Performance Summary */}
          <Card className="border-gray-200">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Performance Summary
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Success Rate</span>
                  <Badge variant="secondary" className="bg-green-100 text-green-800">
                    {Math.round((results.puzzles_solved / Math.max(1, results.puzzles_solved + results.mistakes_made)) * 100)}%
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Average Time per Attempt</span>
                  <Badge variant="secondary">
                    {Math.round(results.duration_seconds / Math.max(1, (results.puzzles_solved + results.mistakes_made)))}s
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Sprint Type</span>
                  <Badge variant="outline">
                    {eloType}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex flex-col gap-3 pt-4">
            {/* Primary Actions */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                onClick={onRestart}
                className="flex-1 bg-orange-600 hover:bg-orange-700"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Play Again
              </Button>
              <Button
                onClick={onHome}
                variant="outline"
                className="flex-1"
              >
                <Home className="h-4 w-4 mr-2" />
                Back to Menu
              </Button>
            </div>

            {/* Review Mistakes Button - Only show if there were mistakes */}
            {results.mistakes_made > 0 && (
              <Button
                onClick={() => setShowMistakeReview(true)}
                variant="secondary"
                className="w-full"
              >
                <Eye className="h-4 w-4 mr-2" />
                Review Mistakes ({results.mistakes_made})
              </Button>
            )}
          </div>

          {/* Encouragement Message */}
          <div className="text-center pt-4 border-t">
            <p className="text-sm text-gray-500">
              {isSuccess
                ? "Keep up the great work! Your tactical skills are improving."
                : isAbandoned
                ? "No problem! Sometimes it's good to take a break and come back fresh."
                : "Every puzzle makes you stronger. Ready for another challenge?"
              }
            </p>
          </div>
        </CardContent>
      </Card>

    </div>
  )
}
