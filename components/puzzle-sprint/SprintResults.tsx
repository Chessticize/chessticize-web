"use client"

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { EndSprintResponse, PuzzleAttemptRequest } from '@/hooks/useSprintApi'
import { MistakeReview } from './MistakeReview'
import Navigation from '@/components/navigation'
import { MobileContainer, MobileLayout } from '@/components/ui/mobile-layout'
import { useI18n } from '@/components/i18n/i18n-provider'
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
  Eye,
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
  className = '',
}: SprintResultsProps) {
  const { t } = useI18n()
  const [showMistakeReview, setShowMistakeReview] = useState(false)

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
    if (isSuccess) return <CheckCircle className="h-10 w-10 text-emerald-600" />
    if (failedByMistakes) return <AlertTriangle className="h-10 w-10 text-rose-600" />
    if (failedByTime) return <Clock className="h-10 w-10 text-amber-600" />
    if (isAbandoned) return <XCircle className="h-10 w-10 text-slate-500" />
    return <Target className="h-10 w-10 text-slate-500" />
  }

  const getStatusTitle = () => {
    if (isSuccess) return t('sprintResult.completedTitle')
    if (failedByMistakes) return t('sprintResult.failMistakesTitle')
    if (failedByTime) return t('sprintResult.failTimeTitle')
    if (isAbandoned) return t('sprintResult.abandonedTitle')
    return t('sprintResult.endedTitle')
  }

  const getStatusMessage = () => {
    if (isSuccess) return t('sprintResult.completedMsg')
    if (failedByMistakes) return t('sprintResult.failMistakesMsg')
    if (failedByTime) return t('sprintResult.failTimeMsg')
    if (isAbandoned) return t('sprintResult.abandonedMsg')
    return t('sprintResult.endedMsg')
  }

  const getEloChangeDisplay = () => {
    if (!results.elo_change) return null

    const change = results.elo_change.rating_change
    const isPositive = change > 0

    return (
      <div className={`flex items-center gap-1.5 tabular-nums ${isPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
        {isPositive ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
        <span className="font-semibold text-lg">
          {isPositive ? '+' : ''}
          {change} Elo
        </span>
      </div>
    )
  }

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

  return (
    <MobileLayout fullHeight>
      <div className={`min-h-screen flex flex-col bg-slate-50 dark:bg-[#0B0D12] ${className}`}>
        <Navigation />
        <MobileContainer padding="lg" className="flex-1 pb-24 lg:pb-8 flex items-start justify-center">
          <Card className="max-w-2xl w-full border-slate-200 dark:border-[#38383A] bg-white dark:bg-[#1C1C1E] shadow-sm">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto mb-3 p-3 bg-slate-50 dark:bg-[#262628] border border-slate-200 dark:border-[#38383A] rounded-full w-fit">
            {getStatusIcon()}
          </div>
          <CardTitle className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-[#F2F2F7]">
            {getStatusTitle()}
          </CardTitle>
          <p className="text-sm text-slate-600 dark:text-[#AEAEB2] mt-1.5">{getStatusMessage()}</p>
        </CardHeader>

        <CardContent className="space-y-5">
          {/* Main Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Card className="border-slate-200 dark:border-[#38383A] bg-slate-50 dark:bg-[#262628] shadow-none">
              <CardContent className="p-4 text-center">
                <Target className="h-5 w-5 text-blue-600 dark:text-[#4DA3FF] mx-auto mb-1.5" />
                <div className="text-2xl font-semibold tabular-nums text-slate-900 dark:text-[#F2F2F7]">
                  {results.puzzles_solved}
                </div>
                <div className="text-xs text-slate-500 dark:text-[#AEAEB2] mt-0.5">{t('sprintResult.puzzlesSolved')}</div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 dark:border-[#38383A] bg-slate-50 dark:bg-[#262628] shadow-none">
              <CardContent className="p-4 text-center">
                <Clock className="h-5 w-5 text-slate-500 dark:text-[#AEAEB2] mx-auto mb-1.5" />
                <div className="text-2xl font-semibold tabular-nums text-slate-900 dark:text-[#F2F2F7]">
                  {formatTime(results.duration_seconds)}
                </div>
                <div className="text-xs text-slate-500 dark:text-[#AEAEB2] mt-0.5">{t('sprintResult.timeTaken')}</div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 dark:border-[#38383A] bg-slate-50 dark:bg-[#262628] shadow-none">
              <CardContent className="p-4 text-center">
                <AlertTriangle className="h-5 w-5 text-rose-600 dark:text-[#FF6961] mx-auto mb-1.5" />
                <div className="text-2xl font-semibold tabular-nums text-slate-900 dark:text-[#F2F2F7]">
                  {results.mistakes_made}
                </div>
                <div className="text-xs text-slate-500 dark:text-[#AEAEB2] mt-0.5">{t('sprintResult.mistakesMade')}</div>
              </CardContent>
            </Card>
          </div>

          {/* Elo Change */}
          {results.elo_change && (
            <Card className="border-slate-200 dark:border-[#38383A] bg-white dark:bg-[#262628] shadow-none">
              <CardContent className="p-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h3 className="text-base font-semibold text-slate-900 dark:text-[#F2F2F7] mb-0.5">{t('sprintResult.ratingChange')}</h3>
                    <p className="text-sm text-slate-500 dark:text-[#AEAEB2] tabular-nums">
                      {eloType} · {results.elo_change.rating_before} → {results.elo_change.rating_after}
                    </p>
                  </div>
                  <div className="text-right">{getEloChangeDisplay()}</div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Performance Summary */}
          <Card className="border-slate-200 dark:border-[#38383A] bg-white dark:bg-[#262628] shadow-none">
            <CardContent className="p-5">
              <h3 className="text-base font-semibold text-slate-900 dark:text-[#F2F2F7] mb-3">{t('sprintResult.performanceSummary')}</h3>
              <div className="divide-y divide-slate-100 dark:divide-[#38383A] text-sm">
                <div className="flex justify-between items-center py-2 first:pt-0">
                  <span className="text-slate-600 dark:text-[#AEAEB2]">{t('sprintResult.successRate')}</span>
                  <Badge variant="secondary" className="bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-[#4CD964] border border-emerald-200 dark:border-emerald-800 tabular-nums shadow-none">
                    {Math.round(
                      (results.puzzles_solved / Math.max(1, results.puzzles_solved + results.mistakes_made)) * 100
                    )}
                    %
                  </Badge>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-slate-600 dark:text-[#AEAEB2]">{t('sprintResult.avgTimePerAttempt')}</span>
                  <Badge variant="secondary" className="bg-slate-100 dark:bg-[#1C1C1E] text-slate-700 dark:text-[#D1D1D6] tabular-nums shadow-none">
                    {Math.round(
                      results.duration_seconds / Math.max(1, results.puzzles_solved + results.mistakes_made)
                    )}
                    s
                  </Badge>
                </div>
                <div className="flex justify-between items-center py-2 last:pb-0">
                  <span className="text-slate-600 dark:text-[#AEAEB2]">{t('sprintResult.sprintType')}</span>
                  <Badge variant="outline" className="border-slate-200 dark:border-[#38383A] text-slate-700 dark:text-[#D1D1D6]">
                    {eloType}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex flex-col gap-3 pt-2">
            <div className="flex flex-col sm:flex-row gap-3">
              <Button onClick={onRestart} className="flex-1 bg-blue-600 hover:bg-blue-700 dark:bg-[#0A6FE0] dark:hover:bg-[#1980F5] text-white">
                <RotateCcw className="h-4 w-4 mr-2" />
                {t('sprintResult.playAgain')}
              </Button>
              <Button onClick={onHome} variant="outline" className="flex-1 border-slate-200 dark:border-[#38383A] bg-white dark:bg-[#262628] text-slate-700 dark:text-[#F2F2F7] hover:bg-slate-50 dark:hover:bg-[#2C2C2E]">
                <Home className="h-4 w-4 mr-2" />
                {t('sprintResult.backToMenu')}
              </Button>
            </div>

            {results.mistakes_made > 0 && (
              <Button
                onClick={() => setShowMistakeReview(true)}
                variant="outline"
                className="w-full border-slate-200 dark:border-[#38383A] bg-white dark:bg-[#262628] text-slate-700 dark:text-[#F2F2F7] hover:bg-slate-50 dark:hover:bg-[#2C2C2E]"
              >
                <Eye className="h-4 w-4 mr-2" />
                {t('sprintResult.reviewMistakesCount', { count: results.mistakes_made })}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
        </MobileContainer>
      </div>
    </MobileLayout>
  )
}
