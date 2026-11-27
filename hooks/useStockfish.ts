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
  listen?: ((line: string) => void) | null
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
  } catch {
    return uciMoves // Fallback to UCI notation
  }
}

// Global Stockfish engine singleton to ensure only one instance across the app
let globalStockfishEngine: StockfishEngine | null = null
let globalEnginePromise: Promise<StockfishEngine> | null = null
let wrapperFactoryPromise: Promise<() => StockfishWrapper> | null = null
let isBeforeUnloadBound = false

async function loadStockfishWrapper(): Promise<() => StockfishWrapper> {
  if (!wrapperFactoryPromise) {
    wrapperFactoryPromise = import('../components/stockfish/stockfish-wrapper.js')
      .then((module) => module.default as () => StockfishWrapper)
      .catch((error) => {
        wrapperFactoryPromise = null
        throw error
      })
  }
  return wrapperFactoryPromise
}

function waitForReady(engine: StockfishEngine, timeoutMs = 4000): Promise<void> {
  return new Promise((resolve) => {
    const prevListen = engine.listen
    let settled = false
    const finish = () => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      engine.listen = prevListen ?? null
      resolve()
    }
    const timer = setTimeout(finish, timeoutMs)
    engine.listen = (line: string) => {
      if (typeof prevListen === 'function') {
        prevListen(line)
      }
      if (line === 'readyok' || line.startsWith('readyok')) {
        finish()
      }
    }
    engine.uci('isready')
  })
}

// Global function to get or create the Stockfish engine
export async function getGlobalStockfishEngine(): Promise<StockfishEngine> {
  if (globalStockfishEngine) {
    return globalStockfishEngine
  }

  if (globalEnginePromise) {
    return globalEnginePromise
  }

  if (typeof window !== 'undefined' && !isBeforeUnloadBound) {
    isBeforeUnloadBound = true
    window.addEventListener('beforeunload', () => {
      if (globalStockfishEngine && globalStockfishEngine.terminate) {
        globalStockfishEngine.terminate()
      }
    })
  }

  globalEnginePromise = (async () => {
    const createStockfish = await loadStockfishWrapper()
    const wrapper = createStockfish()
    const engine = await wrapper.init()
    engine.uci('setoption name MultiPV value 3')
    await waitForReady(engine)
    globalStockfishEngine = engine
    return engine
  })()

  try {
    return await globalEnginePromise
  } catch (error) {
    globalEnginePromise = null
    globalStockfishEngine = null
    throw error
  }
}

let preloadScheduled = false

/**
 * Silently warm up the browser Stockfish engine during idle time so the first
 * click on "Analyze" returns engine evaluations immediately.
 */
export function preloadStockfishEngine(): void {
  if (typeof window === 'undefined') return
  if (globalStockfishEngine || globalEnginePromise || preloadScheduled) return
  preloadScheduled = true

  const startWarmup = () => {
    preloadScheduled = false
    if (globalStockfishEngine || globalEnginePromise) return
    void getGlobalStockfishEngine().catch(() => {
      // Ignore background preload errors; explicit Analyze will retry and surface errors if needed.
    })
  }

  if (typeof window.requestIdleCallback === 'function') {
    window.requestIdleCallback(startWarmup, { timeout: 1500 })
  } else {
    setTimeout(startWarmup, 400)
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
  const requestIdRef = useRef(0)
  const analysisTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearAnalysisTimeout = useCallback(() => {
    if (analysisTimeoutRef.current) {
      clearTimeout(analysisTimeoutRef.current)
      analysisTimeoutRef.current = null
    }
  }, [])

  // Initialize Stockfish engine using global singleton
  const initEngine = useCallback(async () => {
    try {
      const engine = await getGlobalStockfishEngine()
      engineRef.current = engine
      return true
    } catch (error) {
      console.error('✗ Failed to initialize Stockfish:', error)
      return false
    }
  }, [])

  // Stop analysis (but keep engine alive for reuse)
  const stopAnalysis = useCallback(() => {
    requestIdRef.current += 1
    isAnalyzingRef.current = false
    clearAnalysisTimeout()

    setAnalysis(prev => ({
      ...prev,
      isAnalyzing: false
    }))

    if (engineRef.current) {
      try {
        engineRef.current.uci('stop')
      } catch (error) {
        console.error('Error stopping analysis:', error)
      }
    }
  }, [clearAnalysisTimeout])

  // Perform real-time Stockfish analysis with MultiPV
  const performRealTimeAnalysis = useCallback(
    async (fen: string, maxDepth: number, requestId: number) => {
      const engine = engineRef.current
      if (!engine || requestIdRef.current !== requestId) return

      const topLinesMap = new Map<number, AnalysisLine>()
      let currentDepth = 0
      let bestMove = ''
      let mainEvaluation = 0
      let mainIsMate = false
      let mainMateIn = 0
      let hasReceivedFirstEval = false
      let readyForSearch = false

      const analyzingFen = fen

      const isCurrentRequest = () =>
        requestIdRef.current === requestId && currentPositionRef.current === analyzingFen

      const handleMessage = (line: string) => {
        if (!isCurrentRequest()) {
          return
        }

        // Wait until the engine acknowledges `stop` + `isready` before accepting search output
        // so stale `info` / `bestmove` lines from a prior position never pollute this search.
        if (!readyForSearch) {
          if (line === 'readyok' || line.startsWith('readyok')) {
            readyForSearch = true
            engine.uci(`position fen ${analyzingFen}`)
            engine.uci(`go depth ${maxDepth}`)
          }
          return
        }

        if (!line.startsWith('info') && !isAnalyzingRef.current) {
          return
        }

        if (line.startsWith('info')) {
          const depthMatch = line.match(/depth (\d+)/)
          if (depthMatch) {
            currentDepth = parseInt(depthMatch[1], 10)
          }

          const multipvMatch = line.match(/multipv (\d+)/)
          const multipv = multipvMatch ? parseInt(multipvMatch[1], 10) : 1

          const scoreMatch = line.match(/score (cp|mate) (-?\d+)/)
          let evaluation = 0
          let isMate = false
          let mateIn = 0

          if (scoreMatch) {
            const scoreType = scoreMatch[1]
            let rawScore = parseFloat(scoreMatch[2])

            const activeColor = analyzingFen.split(' ')[1]
            const isBlackToMove = activeColor === 'b'

            // Stockfish reports scores from the side-to-move perspective; normalize to White.
            if (isBlackToMove) {
              rawScore = -rawScore
            }

            if (scoreType === 'cp') {
              evaluation = rawScore
            } else if (scoreType === 'mate') {
              isMate = true
              mateIn = rawScore
              evaluation = rawScore > 0 ? 9999 - Math.abs(rawScore) : -9999 + Math.abs(rawScore)
            }
          }

          const pvMatch = line.match(/\bpv (.+)/)
          if (pvMatch && currentDepth > 0) {
            const uciMoves = pvMatch[1].split(' ').slice(0, 6)
            const sanMoves = convertUciMovesToSan(analyzingFen, uciMoves)
            const pv = pvMatch[1]

            topLinesMap.set(multipv, {
              moves: sanMoves,
              uciMoves,
              evaluation,
              depth: currentDepth,
              pv: pv.substring(0, 80) + (pv.length > 80 ? '...' : ''),
              multipv,
              isMate,
              mateIn
            })

            if (multipv === 1) {
              mainEvaluation = evaluation
              mainIsMate = isMate
              mainMateIn = mateIn
              bestMove = uciMoves[0] || ''
              hasReceivedFirstEval = true
            }

            const sortedLines = Array.from(topLinesMap.values())
              .sort((a, b) => a.multipv - b.multipv)
              .slice(0, 3)

            setAnalysis(prev => ({
              ...prev,
              evaluation: mainEvaluation,
              bestMove,
              depth: currentDepth,
              isAnalyzing: true,
              topLines: sortedLines,
              currentPosition: analyzingFen,
              isMate: mainIsMate,
              mateIn: mainMateIn
            }))
          }
        } else if (line.startsWith('bestmove')) {
          clearAnalysisTimeout()
          const bestMoveMatch = line.match(/bestmove (\S+)/)
          const parsedBestMove =
            bestMoveMatch && bestMoveMatch[1] !== '(none)' ? bestMoveMatch[1] : ''
          if (parsedBestMove && !bestMove) {
            bestMove = parsedBestMove
          }

          isAnalyzingRef.current = false
          setAnalysis(prev => ({
            ...prev,
            bestMove: bestMove || parsedBestMove || prev.bestMove,
            isAnalyzing: false
          }))
        }
      }

      engine.listen = handleMessage

      // Stop any previous search and synchronize with `isready` -> `readyok`
      engine.uci('stop')
      engine.uci('setoption name MultiPV value 3')
      engine.uci('isready')

      clearAnalysisTimeout()
      analysisTimeoutRef.current = setTimeout(() => {
        if (isCurrentRequest() && isAnalyzingRef.current) {
          engine.uci('stop')
          isAnalyzingRef.current = false
          setAnalysis(prev => ({
            ...prev,
            isAnalyzing: false,
            error: hasReceivedFirstEval ? undefined : 'Analysis timeout - no evaluation received'
          }))
        }
      }, 30000)
    },
    [clearAnalysisTimeout]
  )

  // Analyze position with real-time Stockfish analysis
  const analyzePosition = useCallback(
    async (fen: string, maxDepth: number = 20) => {
      if (!fen) return

      if (isAnalyzingRef.current && currentPositionRef.current === fen) {
        return
      }

      if (currentPositionRef.current !== fen && isAnalyzingRef.current) {
        stopAnalysis()
      }

      const requestId = ++requestIdRef.current
      isAnalyzingRef.current = true
      currentPositionRef.current = fen

      setAnalysis(prev => ({
        ...prev,
        isAnalyzing: true,
        error: undefined,
        currentPosition: fen,
        topLines: [],
        depth: 0,
        evaluation: 0,
        bestMove: '',
        isMate: false,
        mateIn: undefined
      }))

      try {
        if (!engineRef.current) {
          const ok = await initEngine()
          if (!ok) {
            throw new Error('Failed to initialize Stockfish engine')
          }
        }

        if (requestIdRef.current !== requestId) {
          return
        }

        if (engineRef.current) {
          performRealTimeAnalysis(fen, maxDepth, requestId).catch(error => {
            if (requestIdRef.current !== requestId) return
            console.error('Real-time analysis error:', error)
            isAnalyzingRef.current = false
            setAnalysis(prev => ({
              ...prev,
              isAnalyzing: false,
              error: error instanceof Error ? error.message : 'Analysis failed'
            }))
          })
        } else {
          throw new Error('Failed to initialize Stockfish engine')
        }
      } catch (error) {
        if (requestIdRef.current !== requestId) return
        console.error('Analysis initialization error:', error)
        isAnalyzingRef.current = false
        currentPositionRef.current = ''
        setAnalysis(prev => ({
          ...prev,
          isAnalyzing: false,
          error: error instanceof Error ? error.message : 'Failed to initialize analysis'
        }))
      }
    },
    [initEngine, performRealTimeAnalysis, stopAnalysis]
  )

  // Cleanup on unmount - only stop analysis, don't terminate global engine
  useEffect(() => {
    return () => {
      stopAnalysis()
      engineRef.current = null
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
    } catch (error) {
      console.error('Error terminating global engine:', error)
    }
  }
  globalStockfishEngine = null
  globalEnginePromise = null
}
