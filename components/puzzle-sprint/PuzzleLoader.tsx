"use client"

import React from 'react'
import { Loader2, Target, Zap } from 'lucide-react'

interface PuzzleLoaderProps {
  message?: string
  progress?: number
  className?: string
}

export function PuzzleLoader({ 
  message = "Loading puzzle...", 
  progress,
  className = '' 
}: PuzzleLoaderProps) {
  return (
    <div className={`flex items-center justify-center min-h-[400px] ${className}`}>
      <div className="text-center space-y-4">
        {/* Animated chess piece icons */}
        <div className="flex items-center justify-center space-x-2 mb-4">
          <div className="animate-bounce">
            <Target className="h-8 w-8 text-orange-600" />
          </div>
          <div className="animate-bounce" style={{ animationDelay: '0.1s' }}>
            <Zap className="h-8 w-8 text-blue-600" />
          </div>
          <div className="animate-bounce" style={{ animationDelay: '0.2s' }}>
            <Target className="h-8 w-8 text-green-600" />
          </div>
        </div>

        {/* Loading spinner */}
        <div className="flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-orange-600" />
        </div>

        {/* Message */}
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-gray-900">
            {message}
          </h3>
          <p className="text-gray-600 text-sm">
            Preparing your tactical challenge...
          </p>
        </div>
        
        {/* Progress bar if provided */}
        {typeof progress === 'number' && (
          <div className="w-64 mx-auto">
            <div className="bg-gray-200 rounded-full h-2">
              <div 
                className="bg-orange-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
              />
            </div>
            <p className="text-sm text-gray-500 mt-2">
              {Math.round(progress)}% complete
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
