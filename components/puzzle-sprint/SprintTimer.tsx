"use client"

import React from 'react'
import { Clock } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface SprintTimerProps {
  timeRemaining: number
  className?: string
}

export function SprintTimer({ timeRemaining, className = '' }: SprintTimerProps) {
  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  const getTimerColor = (seconds: number): string => {
    if (seconds <= 30) return 'bg-red-100 text-red-800 border-red-200'
    if (seconds <= 120) return 'bg-yellow-100 text-yellow-800 border-yellow-200'
    return 'bg-blue-100 text-blue-800 border-blue-200'
  }

  const getTimerIcon = (seconds: number): string => {
    if (seconds <= 30) return 'text-red-600'
    if (seconds <= 120) return 'text-yellow-600'
    return 'text-blue-600'
  }

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <Clock className={`h-4 w-4 ${getTimerIcon(timeRemaining)}`} />
      <Badge 
        variant="secondary" 
        className={`font-mono text-lg px-3 py-1 ${getTimerColor(timeRemaining)}`}
      >
        {formatTime(timeRemaining)}
      </Badge>
    </div>
  )
}
