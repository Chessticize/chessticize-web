"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useStockfish } from '@/hooks/useStockfish'
import { Clock, Zap, Activity } from 'lucide-react'

interface PerformanceMetrics {
  initTime: number
  firstResultTime: number
  totalAnalysisTime: number
  engineReady: boolean
}

export function AnalysisPerformanceMonitor() {
  const { analysis, analyzePosition, initEngine, isEngineReady } = useStockfish()
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    initTime: 0,
    firstResultTime: 0,
    totalAnalysisTime: 0,
    engineReady: false
  })
  const [startTime, setStartTime] = useState<number>(0)
  const [initStartTime, setInitStartTime] = useState<number>(0)
  const [firstResultReceived, setFirstResultReceived] = useState<boolean>(false)

  // Monitor engine initialization
  useEffect(() => {
    if (!isEngineReady && initStartTime === 0) {
      setInitStartTime(Date.now())
    } else if (isEngineReady && initStartTime > 0) {
      setMetrics(prev => ({
        ...prev,
        initTime: Date.now() - initStartTime,
        engineReady: true
      }))
    }
  }, [isEngineReady, initStartTime])

  // Monitor analysis performance
  useEffect(() => {
    if (analysis.isAnalyzing && startTime === 0) {
      setStartTime(Date.now())
      setFirstResultReceived(false)
    } else if (!analysis.isAnalyzing && startTime > 0) {
      setMetrics(prev => ({
        ...prev,
        totalAnalysisTime: Date.now() - startTime
      }))
      setStartTime(0)
    }
  }, [analysis.isAnalyzing, startTime])

  // Monitor first result
  useEffect(() => {
    if (analysis.depth > 0 && !firstResultReceived && startTime > 0) {
      setMetrics(prev => ({
        ...prev,
        firstResultTime: Date.now() - startTime
      }))
      setFirstResultReceived(true)
    }
  }, [analysis.depth, firstResultReceived, startTime])

  const runPerformanceTest = async () => {
    console.log('🚀 Starting performance test...')
    setMetrics({
      initTime: 0,
      firstResultTime: 0,
      totalAnalysisTime: 0,
      engineReady: false
    })
    setInitStartTime(Date.now())
    
    // Test with starting position
    await analyzePosition('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', 15)
  }

  const formatTime = (ms: number) => {
    if (ms === 0) return 'N/A'
    if (ms < 1000) return `${ms}ms`
    return `${(ms / 1000).toFixed(1)}s`
  }

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-blue-600" />
          Analysis Performance Monitor
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-blue-50 p-3 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium">Engine Init</span>
            </div>
            <div className="text-lg font-bold text-blue-700">
              {formatTime(metrics.initTime)}
            </div>
            <Badge variant={metrics.engineReady ? "default" : "secondary"} className="text-xs">
              {metrics.engineReady ? "Ready" : "Initializing"}
            </Badge>
          </div>

          <div className="bg-green-50 p-3 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <Zap className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium">First Result</span>
            </div>
            <div className="text-lg font-bold text-green-700">
              {formatTime(metrics.firstResultTime)}
            </div>
            <Badge variant={metrics.firstResultTime > 0 ? "default" : "secondary"} className="text-xs">
              {metrics.firstResultTime > 0 ? "Received" : "Waiting"}
            </Badge>
          </div>

          <div className="bg-purple-50 p-3 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <Activity className="h-4 w-4 text-purple-600" />
              <span className="text-sm font-medium">Total Time</span>
            </div>
            <div className="text-lg font-bold text-purple-700">
              {formatTime(metrics.totalAnalysisTime)}
            </div>
            <Badge variant={metrics.totalAnalysisTime > 0 ? "default" : "secondary"} className="text-xs">
              {analysis.isAnalyzing ? "Running" : "Complete"}
            </Badge>
          </div>
        </div>

        <div className="space-y-2">
          <Button onClick={runPerformanceTest} className="w-full" disabled={analysis.isAnalyzing}>
            {analysis.isAnalyzing ? 'Running Test...' : 'Run Performance Test'}
          </Button>
          
          {analysis.isAnalyzing && (
            <div className="text-center text-sm text-gray-600">
              Depth: {analysis.depth} | Evaluation: {analysis.evaluation}cp
            </div>
          )}
        </div>

        <div className="text-xs text-gray-500 space-y-1">
          <div><strong>Engine Init:</strong> Time to initialize Stockfish engine</div>
          <div><strong>First Result:</strong> Time to receive first analysis result</div>
          <div><strong>Total Time:</strong> Complete analysis duration</div>
        </div>
      </CardContent>
    </Card>
  )
}
