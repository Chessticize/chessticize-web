"use client"

import { useState, useEffect, useRef, useCallback } from 'react'
import { Chess } from 'chess.js'

interface AnalysisLine {
  moves: string[] // SAN moves for display
  uciMoves: string[] // UCI moves for engine commands
  evaluation: number
  depth: number
  pv: string // Principal variation
  multipv: number // MultiPV line number (1, 2, 3)
  isMate?: boolean // Whether this is a mate score
  mateIn?: number // Mate in N moves (positive for white, negative for black)
}

interface AnalysisResult {
  evaluation: number // In centipawns
  bestMove: string
  depth: number
  isAnalyzing: boolean
  error?: string
  topLines: AnalysisLine[] // Top 3 engine lines
  currentPosition: string // Current FEN being analyzed
  isMate?: boolean // Whether the main evaluation is a mate score
  mateIn?: number // Mate in N moves for main evaluation
}

interface StockfishEngine {
  uci: (command: string) => void
  listen?: (line: string) => void
  terminate?: () => void
}

interface StockfishWrapper {
  init: () => Promise<StockfishEngine>
}

// Helper function to convert UCI moves to standard algebraic notation
function convertUciMovesToSan(fen: string, uciMoves: string[]): string[] {
  try {
    const game = new Chess(fen)
    const sanMoves: string[] = []

    for (const uciMove of uciMoves) {
      if (!uciMove) break
      const move = game.move(uciMove)
      if (move) {
        sanMoves.push(move.san)
      } else {
        break // Invalid move, stop processing
      }
    }

    return sanMoves
  } catch (error) {
    // Failed to convert UCI moves to SAN
    return uciMoves // Fallback to UCI notation
  }
}

// Global Stockfish engine singleton to ensure only one instance across the app
let globalStockfishEngine: StockfishEngine | null = null
let globalEnginePromise: Promise<StockfishEngine> | null = null
let isEngineInitialized = false

// Import the Stockfish wrapper
let createStockfish: (() => StockfishWrapper) | null = null

// Dynamically import Stockfish wrapper to avoid SSR issues
if (typeof window !== 'undefined') {
  import('../components/stockfish/stockfish-wrapper.js').then((module) => {
    createStockfish = module.default
    // Stockfish wrapper loaded successfully

    // Pre-initialize the engine for faster first analysis
    getGlobalStockfishEngine().then(() => {
      // Stockfish engine pre-initialized for faster analysis
    }).catch((error) => {
      // Failed to pre-initialize Stockfish
    })
  }).catch((error) => {
    // Stockfish wrapper not available
  })

  // Global cleanup on page unload
  window.addEventListener('beforeunload', () => {
    if (globalStockfishEngine && globalStockfishEngine.terminate) {
      globalStockfishEngine.terminate()
    }
  })
}

// Global function to get or create the Stockfish engine
export async function getGlobalStockfishEngine(): Promise<StockfishEngine> {
  // If we already have a working engine, return it
  if (globalStockfishEngine) {
    // Reusing existing global Stockfish engine
    return globalStockfishEngine
  }

  // If we're already initializing, wait for that promise
  if (globalEnginePromise) {
    // Waiting for existing Stockfish initialization...
    return globalEnginePromise
  }

  // Create new engine
  // Creating new global Stockfish engine...
  globalEnginePromise = (async () => {
    if (!createStockfish) {
      throw new Error('Stockfish wrapper not loaded yet')
    }

    const wrapper = createStockfish()
    const engine = await wrapper.init()
    globalStockfishEngine = engine

    // Warm up the engine with basic UCI commands for faster first analysis
    engine.uci('uci')
    engine.uci('isready')
    engine.uci('setoption name MultiPV value 3')
    isEngineInitialized = true

    // Global Stockfish engine created and warmed up successfully
    return engine
  })()

  try {
    return await globalEnginePromise
  } catch (error) {
    // Reset on failure so we can try again
    globalEnginePromise = null
    globalStockfishEngine = null
    throw error
  }
}

export function useStockfish() {
  const [analysis, setAnalysis] = useState<AnalysisResult>({
    evaluation: 0,
    bestMove: '',
    depth: 0,
    isAnalyzing: false,
    topLines: [],
    currentPosition: ''
  })

  const engineRef = useRef<StockfishEngine | null>(null)
  const isAnalyzingRef = useRef(false)
  const currentPositionRef = useRef<string>('')

  // Initialize Stockfish engine using global singleton
  const initEngine = useCallback(async () => {
    try {
      // Get or create the global engine instance
      const engine = await getGlobalStockfishEngine()

      // Store reference to the global engine
      engineRef.current = engine

      // Stockfish engine ready (using global instance)
      return true
    } catch (error) {
      console.error('✗ Failed to initialize Stockfish:', error)
      console.error('Please ensure Stockfish files are available in /public/stockfish/ or via CDN')
      return false
    }
  }, [])

  // Analyze position with real-time Stockfish analysis
  const analyzePosition = useCallback(async (fen: string, maxDepth: number = 20) => {
    if (!fen) return

    // If we're already analyzing the same position, don't restart
    if (isAnalyzingRef.current && currentPositionRef.current === fen) {
      // Already analyzing this position, skipping duplicate request
      return
    }

    // Stop any existing analysis only if it's a different position
    if (currentPositionRef.current !== fen) {
      // Stopping analysis for different position
      stopAnalysis()
    }

    // Set analyzing state immediately with loading feedback
    isAnalyzingRef.current = true
    currentPositionRef.current = fen
    // Setting analysis refs for position tracking

    // Provide immediate feedback that analysis is starting
    setAnalysis(prev => ({
      ...prev,
      isAnalyzing: true,
      error: undefined,
      currentPosition: fen,
      topLines: [], // Clear previous lines
      depth: 0,
      evaluation: 0,
      bestMove: ''
    }))

    try {
      if (!engineRef.current) {
        // Initializing Stockfish engine...
        await initEngine()
      }

      if (engineRef.current) {
        // Engine ready, starting analysis...

        // Start analysis asynchronously - don't await
        // This allows immediate return while analysis runs in background
        performRealTimeAnalysis(fen, maxDepth).catch(error => {
          console.error('Real-time analysis error:', error)
          setAnalysis(prev => ({
            ...prev,
            isAnalyzing: false,
            error: error.message || 'Analysis failed'
          }))
          isAnalyzingRef.current = false
        })

        // Return immediately - analysis will update state in real-time
        // Analysis started, will update in real-time

      } else {
        throw new Error('Failed to initialize Stockfish engine')
      }
    } catch (error) {
      console.error('Analysis initialization error:', error)
      setAnalysis(prev => ({
        ...prev,
        isAnalyzing: false,
        error: error instanceof Error ? error.message : 'Failed to initialize analysis'
      }))
      isAnalyzingRef.current = false
    }
  }, [initEngine])

  // Perform real-time Stockfish analysis with MultiPV using legacy site's API
  const performRealTimeAnalysis = useCallback(async (fen: string, maxDepth: number) => {
    if (!engineRef.current) return

    const engine = engineRef.current!
    const topLinesMap = new Map<number, AnalysisLine>()
    let currentDepth = 0
    let bestMove = ''
    let mainEvaluation = 0
    let mainIsMate = false
    let mainMateIn = 0
    let hasReceivedFirstEval = false
    let expectingDeeperAnalysis = maxDepth > 8 // Track if we're doing shallow then deep analysis

    // Store the FEN being analyzed to avoid race conditions
    const analyzingFen = fen

    const handleMessage = (line: string) => {
      // Minimal logging disabled for cleaner output

      // Only process if we're still analyzing the same position
      // Check position match first, then check if we should still be analyzing
      if (currentPositionRef.current !== analyzingFen) {
        // Ignoring message - position changed
        return
      }

      // For 'info' messages, we should process them even if isAnalyzing becomes false
      // because the engine might still be sending results from the current analysis
      if (!line.startsWith('info') && !isAnalyzingRef.current) {
        // Ignoring non-info message - not analyzing
        return
      }

      if (line.startsWith('info')) {
        // Parse depth
        const depthMatch = line.match(/depth (\d+)/)
        if (depthMatch) {
          currentDepth = parseInt(depthMatch[1])
        }

        // Parse MultiPV line number
        const multipvMatch = line.match(/multipv (\d+)/)
        const multipv = multipvMatch ? parseInt(multipvMatch[1]) : 1

        // Parse evaluation and normalize to White's perspective
        const scoreMatch = line.match(/score (cp|mate) (-?\d+)/)
        let evaluation = 0
        let isMate = false
        let mateIn = 0

        if (scoreMatch) {
          const scoreType = scoreMatch[1]
          let rawScore = parseFloat(scoreMatch[2])
          
          // Determine whose turn it is from the FEN being analyzed
          const activeColor = analyzingFen.split(' ')[1]
          const isBlackToMove = activeColor === 'b'
          
          // Stockfish gives evaluations from the perspective of the side to move
          // If it's Black to move, flip the sign to get White's perspective
          if (isBlackToMove) {
            rawScore = -rawScore
          }

          if (scoreType === 'cp') {
            evaluation = rawScore // Keep in centipawns, now from White's perspective
          } else if (scoreType === 'mate') {
            isMate = true
            mateIn = rawScore
            // Use a large number but keep the mate distance for formatting
            evaluation = rawScore > 0 ? 9999 - Math.abs(rawScore) : -9999 + Math.abs(rawScore)
          }
        }

        // Parse principal variation - match "pv" as whole word
        const pvMatch = line.match(/\bpv (.+)/)
        if (pvMatch && currentDepth > 0) {
          const uciMoves = pvMatch[1].split(' ').slice(0, 6) // Take first 6 moves
          const sanMoves = convertUciMovesToSan(analyzingFen, uciMoves) // Convert to standard notation using the original FEN
          const pv = pvMatch[1]

          // Store this line with mate information
          topLinesMap.set(multipv, {
            moves: sanMoves, // Use SAN moves for display
            uciMoves: uciMoves, // Keep UCI moves for engine commands
            evaluation,
            depth: currentDepth,
            pv: pv.substring(0, 80) + (pv.length > 80 ? '...' : ''),
            multipv,
            isMate,
            mateIn
          })

          // If this is the main line, update main evaluation and best move
          if (multipv === 1) {
            mainEvaluation = evaluation
            mainIsMate = isMate
            mainMateIn = mateIn
            bestMove = uciMoves[0] || '' // Use UCI move for engine commands
            hasReceivedFirstEval = true
          }

          // Update analysis with real-time results (immediate updates)
          const sortedLines = Array.from(topLinesMap.values())
            .sort((a, b) => a.multipv - b.multipv)
            .slice(0, 3) // Top 3 lines

          setAnalysis(prev => ({
            ...prev,
            evaluation: mainEvaluation,
            bestMove,
            depth: currentDepth,
            isAnalyzing: true,
            topLines: sortedLines,
            currentPosition: fen,
            isMate: mainIsMate,
            mateIn: mainMateIn
          }))
        }
      } else if (line.startsWith('bestmove')) {
        // Received bestmove, checking if analysis should continue
        const bestMoveMatch = line.match(/bestmove (\S+)/)
        if (bestMoveMatch && !bestMove) {
          bestMove = bestMoveMatch[1]
        }

        // Check if this is from a shallow analysis that will be followed by deeper analysis
        const isShallowAnalysisComplete = expectingDeeperAnalysis && currentDepth <= 8

        if (isShallowAnalysisComplete) {
          // Shallow analysis complete, waiting for deeper analysis...
          // Update best move but keep analyzing state true
          setAnalysis(prev => ({
            ...prev,
            bestMove: bestMove || bestMoveMatch?.[1] || prev.bestMove,
            isAnalyzing: true // Keep analyzing for deeper analysis
          }))
          // Mark that we're no longer expecting deeper analysis after this transition
          expectingDeeperAnalysis = false
          // Don't set isAnalyzingRef.current = false yet
        } else {
          // Analysis completed, isAnalyzing set to false
          setAnalysis(prev => ({
            ...prev,
            bestMove: bestMove || bestMoveMatch?.[1] || prev.bestMove,
            isAnalyzing: false
          }))
          isAnalyzingRef.current = false
        }
      }
    }

    // Set up message listener using legacy site's API
    engine.listen = handleMessage

    // Initialize engine and start analysis using legacy site's API
    // Starting Stockfish analysis for position

    // Only send UCI initialization commands if this is a fresh engine
    // Most engines stay initialized, so we can skip redundant commands
    if (!isEngineInitialized) {
      // Sending UCI initialization commands
      engine.uci('uci')
      engine.uci('isready')
      engine.uci('setoption name MultiPV value 3')
      isEngineInitialized = true
    }

    // Stop any previous analysis first for faster position switching
    // Stopping previous analysis
    engine.uci('stop')

    // Set position and start analysis
    // Setting position for analysis
    engine.uci(`position fen ${analyzingFen}`)

    // Start with a quick shallow analysis for immediate feedback
    if (maxDepth > 8) {
      // Starting shallow analysis: go depth 8
      engine.uci('go depth 8')
      // After a short delay, start the full depth analysis
      setTimeout(() => {
        if (isAnalyzingRef.current && currentPositionRef.current === analyzingFen) {
          // Stopping shallow analysis
          engine.uci('stop')
          // Starting full depth analysis
          engine.uci(`go depth ${maxDepth}`)
        }
      }, 500) // 500ms delay for quick initial results
    } else {
      // Starting analysis at full depth
      engine.uci(`go depth ${maxDepth}`)
    }

    // Provide immediate feedback that analysis has started
    setAnalysis(prev => ({
      ...prev,
      isAnalyzing: true,
      currentPosition: analyzingFen,
      depth: 0,
      topLines: [],
      error: undefined
    }))

    // Set timeout to prevent hanging - but don't reject, just stop analysis
    setTimeout(() => {
      if (isAnalyzingRef.current && currentPositionRef.current === analyzingFen) {
        // Analysis timeout, stopping...
        engine.uci('stop')
        isAnalyzingRef.current = false

        setAnalysis(prev => ({
          ...prev,
          isAnalyzing: false,
          error: hasReceivedFirstEval ? undefined : 'Analysis timeout - no evaluation received'
        }))
      }
    }, 30000) // 30 second timeout
  }, [])

  // Stop analysis (but keep engine alive for reuse)
  const stopAnalysis = useCallback(() => {
    // stopAnalysis called - setting isAnalyzing to false
    isAnalyzingRef.current = false

    setAnalysis(prev => ({
      ...prev,
      isAnalyzing: false
    }))

    if (engineRef.current) {
      try {
        // Only stop the current analysis, don't quit the engine
        engineRef.current.uci('stop')
        // Analysis stopped, engine remains active for reuse
      } catch (error) {
        console.error('Error stopping analysis:', error)
      }
    }
  }, [])

  // Cleanup on unmount - only stop analysis, don't terminate global engine
  useEffect(() => {
    return () => {
      stopAnalysis()
      // Don't terminate the global engine - other components might be using it
      // Just clear our reference to it
      engineRef.current = null
      // Component unmounted, stopped analysis and cleared engine reference
    }
  }, [stopAnalysis])

  return {
    analysis,
    analyzePosition,
    stopAnalysis,
    initEngine,
    isEngineReady: !!engineRef.current
  }
}

// Global cleanup function for app shutdown
export function terminateGlobalStockfishEngine() {
  if (globalStockfishEngine && globalStockfishEngine.terminate) {
    try {
      globalStockfishEngine.terminate()
      // Global Stockfish engine terminated
    } catch (error) {
      console.error('Error terminating global engine:', error)
    }
  }
  globalStockfishEngine = null
  globalEnginePromise = null
}
