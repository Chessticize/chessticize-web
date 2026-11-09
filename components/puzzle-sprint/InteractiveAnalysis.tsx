"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useStockfish } from '@/hooks/useStockfish'
import {
  formatEvaluation
} from '@/lib/evaluation-utils'

interface AnalysisLine {
  moves: string[] // SAN moves for display
  uciMoves?: string[] // UCI moves for engine commands
  evaluation: number
  depth: number
  pv: string // Principal variation
  multipv?: number // MultiPV line number (1, 2, 3)
  isMate?: boolean // Whether this is a mate score
  mateIn?: number // Mate in N moves (positive for white, negative for black)
}
import {
  Brain,
  TrendingUp,
  TrendingDown,
  Minus,
  Loader2,
  AlertCircle,
  RotateCcw,
  Eye,
  EyeOff,
  Undo
} from 'lucide-react'

interface InteractiveAnalysisProps {
  fen: string
  onMakeMove?: (move: string) => void
  onMoveBack?: () => void
  onResetToPuzzleStart?: () => void
  canMoveBack?: boolean
  canReset?: boolean
  onAnalysisUpdate?: (analysisLines: AnalysisLine[]) => void // New prop to expose analysis data
}

export function InteractiveAnalysis({
  fen,
  onMakeMove,
  onMoveBack,
  onResetToPuzzleStart,
  canMoveBack = false,
  canReset = false,
  onAnalysisUpdate
}: InteractiveAnalysisProps) {
  const { analysis, analyzePosition, stopAnalysis } = useStockfish()
  const [selectedLineIndex, setSelectedLineIndex] = useState(0)
  const [maxDepth, setMaxDepth] = useState(20)


  // Start analysis when FEN changes
  useEffect(() => {
    if (fen && fen !== analysis.currentPosition) {
      // Only restart analysis if we're analyzing a different position
      analyzePosition(fen, maxDepth)
    }
  }, [fen, maxDepth, analyzePosition, analysis.currentPosition])

  // Cleanup function to stop analysis when component unmounts
  useEffect(() => {
    return () => {
      stopAnalysis()
    }
  }, [stopAnalysis])

  // Notify parent component when analysis data changes
  useEffect(() => {
    if (onAnalysisUpdate && analysis.topLines.length > 0) {
      onAnalysisUpdate(analysis.topLines)
    }
  }, [analysis.topLines, onAnalysisUpdate])

  // Helper functions - neutral gray color for all evaluations
  const getEvaluationColorForResolver = (): string => {
    return 'text-gray-600'
  }

  const getEvaluationIconForResolver = (centipawns: number) => {
    // Icons based on evaluation magnitude but no color coding
    if (centipawns > 100) return <TrendingUp className="h-4 w-4" />
    if (centipawns < -100) return <TrendingDown className="h-4 w-4" />
    return <Minus className="h-4 w-4" />
  }

  const handleLineClick = (line: AnalysisLine, index: number) => {
    setSelectedLineIndex(index)
    // Make the first move of the selected line using UCI notation
    if (line.uciMoves && line.uciMoves.length > 0 && onMakeMove) {
      onMakeMove(line.uciMoves[0])
    }
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-2 sm:pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm sm:text-lg">
            <Brain className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
            <span className="hidden sm:inline">Engine Analysis</span>
            <span className="sm:hidden">Analysis</span>
          </CardTitle>
          <div className="flex items-center gap-1 sm:gap-2">
            {onMoveBack && (
              <Button
                onClick={onMoveBack}
                variant="outline"
                size="sm"
                className="text-xs"
                disabled={!canMoveBack}
                title="Move back one move"
              >
                <Undo className="h-3 w-3 mr-0 sm:mr-1" />
                <span className="hidden sm:inline">Back</span>
              </Button>
            )}
            {onResetToPuzzleStart && (
              <Button
                onClick={onResetToPuzzleStart}
                variant="outline"
                size="sm"
                className="text-xs"
                disabled={!canReset}
                title="Reset to puzzle starting position (after first move)"
              >
                <RotateCcw className="h-3 w-3 mr-0 sm:mr-1" />
                <span className="hidden sm:inline">Reset</span>
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-2 sm:space-y-4">
        {/* Fixed height container to prevent layout shifts */}
        <div className="min-h-[280px] space-y-2 sm:space-y-4">
          {analysis.error ? (
            <div className="flex items-center gap-2 text-red-600 bg-red-50 p-2 sm:p-3 rounded-lg">
              <AlertCircle className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="text-xs sm:text-sm">{analysis.error}</span>
            </div>
          ) : analysis.isAnalyzing && analysis.depth === 0 ? (
            <div className="flex items-center gap-2 text-blue-600 bg-blue-50 p-2 sm:p-3 rounded-lg">
              <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
              <span className="text-xs sm:text-sm">Analyzing position...</span>
            </div>
          ) : (
            <>
              {/* Position Evaluation */}
              <div className="space-y-1 sm:space-y-2">
                <div className="flex items-center gap-2">
                  <div className={`flex items-center gap-1 ${getEvaluationColorForResolver()}`}>
                    {getEvaluationIconForResolver(analysis.evaluation)}
                    <span className="font-mono text-lg sm:text-xl font-bold">
                      {formatEvaluation(analysis.evaluation, analysis.isMate, analysis.mateIn)}
                    </span>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    SF 16 · 7MB NNUE
                  </Badge>
                </div>
                <div className="text-xs text-gray-600">
                  Depth {analysis.depth}{analysis.isAnalyzing ? `/${maxDepth}` : ''} · 1.6 Mn/s
                  {analysis.isAnalyzing && (
                    <span className="ml-2 text-blue-600">Analyzing...</span>
                  )}
                </div>
              </div>

              {/* Top Engine Lines - Compact Single Line Format */}
              {analysis.topLines.length > 0 && (
                <div className="space-y-1">
                  {analysis.topLines.map((line, index) => {
                    // Show first 3-4 moves followed by "..." if there are more
                    const maxMovesToShow = 4
                    const movesToShow = line.moves.slice(0, maxMovesToShow)
                    const hasMoreMoves = line.moves.length > maxMovesToShow
                    const moveText = movesToShow.join(' ') + (hasMoreMoves ? ' ...' : '')

                    return (
                      <div
                        key={index}
                        className={`p-2 rounded border cursor-pointer transition-colors ${
                          selectedLineIndex === index
                            ? 'bg-blue-50 border-blue-200'
                            : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                        }`}
                        onClick={() => handleLineClick(line, index)}
                      >
                        <div className="flex items-center gap-2">
                          <div className={`flex items-center gap-1 ${getEvaluationColorForResolver()}`}>
                            <span className="font-mono text-sm font-bold">
                              {formatEvaluation(line.evaluation, line.isMate, line.mateIn)}
                            </span>
                          </div>
                          <div className="text-xs font-mono text-gray-700 flex-1">
                            {moveText}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
