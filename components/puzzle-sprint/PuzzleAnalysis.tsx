"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Brain,
  Loader2,
  AlertCircle
} from 'lucide-react'
import {
  formatEvaluation,
  getEvaluationColor,
  getEvaluationIcon,
  getEvaluationDescription,
  getPuzzleResolverColor
} from '@/lib/evaluation-utils'

interface PuzzleAnalysisProps {
  fen: string
  solutionMoves: string[]
  userMoves?: string[]
  onClose?: () => void
}

interface AnalysisLine {
  moves: string[]
  evaluation: number
  depth: number
  pv: string // Principal variation
}

interface AnalysisResult {
  evaluation: number // In centipawns
  bestMove: string
  depth: number
  isAnalyzing: boolean
  error?: string
  topLines: AnalysisLine[] // Top 3 engine lines
  currentPosition: string // Current FEN being analyzed
}

export function PuzzleAnalysis({ fen, solutionMoves, userMoves, onClose }: PuzzleAnalysisProps) {
  const [analysis, setAnalysis] = useState<AnalysisResult>({
    evaluation: 0,
    bestMove: '',
    depth: 0,
    isAnalyzing: true,
    topLines: [],
    currentPosition: fen
  })
  const [selectedLineIndex, setSelectedLineIndex] = useState(0)

  // Determine the puzzle resolver's color for proper color coding
  const puzzleResolverColor = getPuzzleResolverColor(fen)

  useEffect(() => {
    // Simulate Stockfish analysis
    // In a real implementation, this would initialize Stockfish and analyze the position
    const analyzePosition = async () => {
      setAnalysis(prev => ({ ...prev, isAnalyzing: true, error: undefined }))
      
      try {
        // Simulate analysis delay
        await new Promise(resolve => setTimeout(resolve, 2000))
        
        // Mock analysis results with multiple lines
        // In a real implementation, this would come from Stockfish
        const mockEvaluation = Math.floor(Math.random() * 400) - 200 // Random evaluation between -200 and +200 centipawns
        const mockBestMove = solutionMoves[0] || 'e2e4' // Use first solution move as mock best move

        // Generate mock top 3 lines
        const mockTopLines: AnalysisLine[] = [
          {
            moves: solutionMoves.slice(0, 3),
            evaluation: mockEvaluation,
            depth: 20,
            pv: solutionMoves.slice(0, 3).join(' ')
          },
          {
            moves: solutionMoves.slice(0, 2).concat(['Nf6']),
            evaluation: mockEvaluation - 50,
            depth: 19,
            pv: solutionMoves.slice(0, 2).concat(['Nf6']).join(' ')
          },
          {
            moves: solutionMoves.slice(0, 1).concat(['Bd7', 'Qh5']),
            evaluation: mockEvaluation - 100,
            depth: 18,
            pv: solutionMoves.slice(0, 1).concat(['Bd7', 'Qh5']).join(' ')
          }
        ]

        setAnalysis({
          evaluation: mockEvaluation,
          bestMove: mockBestMove,
          depth: 20,
          isAnalyzing: false,
          topLines: mockTopLines,
          currentPosition: fen
        })
      } catch (error) {
        setAnalysis(prev => ({
          ...prev,
          isAnalyzing: false,
          error: 'Failed to analyze position'
        }))
      }
    }

    analyzePosition()
  }, [fen, solutionMoves])

  // Helper functions using the new evaluation utilities
  const getEvaluationColorForResolver = (centipawns: number): string => {
    return getEvaluationColor(centipawns, puzzleResolverColor)
  }

  const getEvaluationIconForResolver = (centipawns: number) => {
    const IconComponent = getEvaluationIcon(centipawns, puzzleResolverColor)
    return <IconComponent className="h-4 w-4" />
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-2 sm:pb-3">
        <CardTitle className="flex items-center gap-2 text-sm sm:text-lg">
          <Brain className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
          <span className="hidden sm:inline">Stockfish Analysis</span>
          <span className="sm:hidden">Analysis</span>
          {analysis.isAnalyzing && (
            <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin text-blue-600" />
          )}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-2 sm:space-y-4">
        {analysis.error ? (
          <div className="flex items-center gap-2 text-red-600 bg-red-50 p-2 sm:p-3 rounded-lg">
            <AlertCircle className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="text-xs sm:text-sm">{analysis.error}</span>
          </div>
        ) : analysis.isAnalyzing ? (
          <div className="flex items-center gap-2 text-blue-600 bg-blue-50 p-2 sm:p-3 rounded-lg">
            <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
            <span className="text-xs sm:text-sm">Analyzing position...</span>
          </div>
        ) : (
          <>
            {/* Position Evaluation */}
            <div className="space-y-1 sm:space-y-2">
              <h4 className="text-xs sm:text-sm font-medium text-gray-900">Position Evaluation</h4>
              <div className="flex items-center gap-2">
                <div className={`flex items-center gap-1 ${getEvaluationColorForResolver(analysis.evaluation)}`}>
                  {getEvaluationIconForResolver(analysis.evaluation)}
                  <span className="font-mono text-sm sm:text-lg font-bold">
                    {formatEvaluation(analysis.evaluation)}
                  </span>
                </div>
                <Badge variant="outline" className="text-xs">
                  Depth {analysis.depth}
                </Badge>
              </div>
              <p className="text-xs text-gray-600">
                {getEvaluationDescription(analysis.evaluation, puzzleResolverColor)}
              </p>
            </div>

            {/* Top Engine Lines */}
            {analysis.topLines.length > 0 && (
              <div className="space-y-1 sm:space-y-2">
                <h4 className="text-xs sm:text-sm font-medium text-gray-900">Top Engine Lines</h4>
                <div className="space-y-1">
                  {analysis.topLines.map((line, index) => (
                    <div
                      key={index}
                      className={`p-2 rounded border cursor-pointer transition-colors ${
                        selectedLineIndex === index
                          ? 'bg-blue-50 border-blue-200'
                          : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                      }`}
                      onClick={() => setSelectedLineIndex(index)}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className={`flex items-center gap-1 ${getEvaluationColorForResolver(line.evaluation)}`}>
                          {getEvaluationIconForResolver(line.evaluation)}
                          <span className="font-mono text-xs sm:text-sm font-bold">
                            {formatEvaluation(line.evaluation)}
                          </span>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          Depth {line.depth}
                        </Badge>
                      </div>
                      <div className="text-xs font-mono text-gray-700 break-all">
                        {line.pv}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Solution vs Your Moves Comparison */}
            <div className="grid grid-cols-1 gap-2">
              <div className="space-y-1">
                <h4 className="text-xs sm:text-sm font-medium text-gray-900">Solution</h4>
                <div className="bg-green-50 border border-green-200 rounded p-2">
                  <div className="text-xs font-mono text-green-800 break-all">
                    {solutionMoves.join(', ')}
                  </div>
                </div>
              </div>

              {userMoves && userMoves.length > 0 && (
                <div className="space-y-1">
                  <h4 className="text-xs sm:text-sm font-medium text-gray-900">Your Moves</h4>
                  <div className="bg-red-50 border border-red-200 rounded p-2">
                    <div className="text-xs font-mono text-red-800 break-all">
                      {userMoves.join(', ')}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Interactive Analysis Note */}
            <div className="bg-blue-50 border border-blue-200 rounded p-2">
              <p className="text-xs text-blue-800">
                <strong>💡 Tip:</strong> Click on engine lines above to explore different variations.
                In a full implementation, this would allow interactive position analysis.
              </p>
            </div>
          </>
        )}

        {onClose && (
          <div className="pt-2">
            <Button onClick={onClose} variant="outline" className="w-full text-xs sm:text-sm" size="sm">
              Close Analysis
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
