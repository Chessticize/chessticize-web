"use client"

import { useState, useCallback } from 'react'

interface AnalysisLine {
  moves: string[]
  evaluation: number
  depth: number
  pv: string // Principal variation
  multipv: number // MultiPV line number (1, 2, 3)
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

export function useStockfishAPI() {
  const [analysis, setAnalysis] = useState<AnalysisResult>({
    evaluation: 0,
    bestMove: '',
    depth: 0,
    isAnalyzing: false,
    topLines: [],
    currentPosition: ''
  })

  // Analyze position using the API endpoint
  const analyzePosition = useCallback(async (fen: string, maxDepth: number = 20) => {
    if (!fen) return

    setAnalysis(prev => ({
      ...prev,
      isAnalyzing: true,
      error: undefined,
      currentPosition: fen,
      topLines: [],
      depth: 0,
      evaluation: 0,
      bestMove: ''
    }))

    try {
      const response = await fetch('/api/stockfish', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fen,
          depth: maxDepth,
          multiPV: 3
        })
      })

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }

      const result = await response.json()

      if (result.error) {
        throw new Error(result.error)
      }

      setAnalysis(prev => ({
        ...prev,
        evaluation: result.evaluation,
        bestMove: result.bestMove,
        depth: result.depth,
        topLines: result.topLines,
        isAnalyzing: false,
        currentPosition: result.currentPosition
      }))

    } catch (error) {
      console.error('Analysis error:', error)
      setAnalysis(prev => ({
        ...prev,
        isAnalyzing: false,
        error: error instanceof Error ? error.message : 'Failed to analyze position'
      }))
    }
  }, [])

  // Stop analysis (for API approach, this just resets the state)
  const stopAnalysis = useCallback(() => {
    setAnalysis(prev => ({
      ...prev,
      isAnalyzing: false
    }))
  }, [])

  // Initialize engine (for API approach, this is a no-op)
  const initEngine = useCallback(async () => {
    return true // API is always "ready"
  }, [])

  return {
    analysis,
    analyzePosition,
    stopAnalysis,
    initEngine,
    isEngineReady: true // API is always ready
  }
}
