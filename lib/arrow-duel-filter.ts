/**
 * Arrow Duel Puzzle Filtering System
 * 
 * This module handles filtering regular puzzles to find suitable Arrow Duel candidates
 * by using Stockfish to evaluate positions and compare move quality.
 */

import { Chess } from 'chess.js'

// Re-export SprintPuzzle interface from useSprintApi
export interface SprintPuzzle {
  puzzle_id: string
  fen: string
  solution_moves: string[]
  rating: number
  themes: string[]
  sequence_in_sprint: number
}

export interface ArrowDuelPuzzle extends SprintPuzzle {
  bestMove: string        // Stockfish best move
  blunderMove: string     // Puzzle solution move (the "blunder")
  evaluationDiff: number  // Difference in centipawns
  candidateMoves: [string, string] // [blunder, correct]
  // Debugging info
  bestMoveEval: number    // Evaluation of position after best move
  blunderMoveEval: number // Evaluation of position after blunder move
  initialEval: number     // Evaluation of initial position
  analysisDepth: number   // Depth used for analysis
}

export interface AnalysisResult {
  evaluation: number // In centipawns
  bestMove: string
  depth: number
}

// Configuration constants
export const EVALUATION_THRESHOLD = 200 // 2.0 pawns in centipawns (updated requirement)
export const ARROW_DUEL_ANALYSIS_DEPTH = 12 // Balanced depth for speed vs accuracy
const ANALYSIS_TIMEOUT = 5000 // 5 second timeout per puzzle with graceful fallback
const MAX_ACCEPTABLE_EVAL = 60 // 0.6 pawns - best move should leave player no worse than slightly worse

/**
 * Arrow Duel Filter Class
 * Handles puzzle filtering with Stockfish evaluation and caching
 */
export class ArrowDuelFilter {
  private evaluationCache = new Map<string, AnalysisResult>()
  private stockfishEngine: any = null

  constructor() {
    this.initializeStockfish()
  }

  /**
   * Initialize Stockfish engine (lazy loading)
   */
  private async initializeStockfish() {
    try {
      // Import the global Stockfish engine getter
      const { getGlobalStockfishEngine } = await import('@/hooks/useStockfish')
      this.stockfishEngine = await getGlobalStockfishEngine()
      console.log('✅ Arrow Duel Filter: Stockfish engine initialized')
    } catch (error) {
      console.error('❌ Arrow Duel Filter: Failed to initialize Stockfish:', error)
    }
  }

  /**
   * Analyze a chess position with caching
   */
  private async analyzePosition(fen: string): Promise<AnalysisResult> {
    // Check cache first
    if (this.evaluationCache.has(fen)) {
      return this.evaluationCache.get(fen)!
    }

    // Ensure Stockfish is initialized
    if (!this.stockfishEngine) {
      await this.initializeStockfish()
      if (!this.stockfishEngine) {
        throw new Error('Stockfish engine not available')
      }
    }

    return new Promise((resolve, reject) => {
      const engine = this.stockfishEngine
      
      let bestMove = ''
      let evaluation = 0
      let depth = 0
      let hasResult = false
      
      const timeout = setTimeout(() => {
        // Graceful fallback: use best result so far instead of rejecting
        if (hasResult && bestMove) {
          console.log(`⏱️ Analysis timeout for ${fen.substring(0, 20)}... - using partial result: ${bestMove} (${evaluation}cp, d:${depth})`)
          
          const result: AnalysisResult = {
            evaluation,
            bestMove,
            depth
          }
          
          // Cache the partial result
          this.evaluationCache.set(fen, result)
          
          // Restore MultiPV setting and resolve with partial result
          engine.uci('setoption name MultiPV value 3')
          engine.listen = originalListen
          resolve(result)
        } else {
          // No usable result - reject
          engine.uci('setoption name MultiPV value 3')
          engine.listen = originalListen
          reject(new Error('Analysis timeout with no usable result'))
        }
      }, ANALYSIS_TIMEOUT)

      // Set up message listener
      const originalListen = engine.listen
      engine.listen = (line: string) => {
        if (originalListen) originalListen(line)

        // Minimal debug output - only log final results
        if (line.startsWith('bestmove')) {
          console.log(`🔍 Stockfish: ${line}`)
        }

        if (line.startsWith('info')) {
          // Parse depth
          const depthMatch = line.match(/depth (\d+)/)
          if (depthMatch) {
            depth = parseInt(depthMatch[1], 10)
          }

          // Parse evaluation
          const scoreMatch = line.match(/score (cp|mate) (-?\d+)/)
          if (scoreMatch) {
            const scoreType = scoreMatch[1]
            const rawScore = parseInt(scoreMatch[2], 10)
            
            if (scoreType === 'cp') {
              evaluation = rawScore // Already in centipawns
            } else if (scoreType === 'mate') {
              // Convert mate scores to large centipawn values
              evaluation = rawScore > 0 ? 10000 : -10000
            }
          }

          // Parse best move from PV (match whole word "pv" not "multipv")
          const pvMatch = line.match(/\bpv\s+(\S+)/)
          if (pvMatch) {
            bestMove = pvMatch[1]
            hasResult = true // Mark that we have a usable result
            // Removed verbose PV logging
          }
        } else if (line.startsWith('bestmove')) {
          clearTimeout(timeout)
          
          // Final best move
          const bestMoveMatch = line.match(/bestmove (\S+)/)
          if (bestMoveMatch && !bestMove) {
            bestMove = bestMoveMatch[1]
          }

          // Reduced final analysis logging (only for debugging)
          if (process.env.NODE_ENV === 'development') {
            console.log(`🎯 Analysis: ${bestMove} (${evaluation}cp, d:${depth})`)
          }

          // Validate bestMove format
          if (bestMove && bestMove.length < 4) {
            console.warn(`⚠️ Invalid bestMove format: "${bestMove}" - should be UCI format like "e2e4"`)
          }

          const result: AnalysisResult = {
            evaluation,
            bestMove,
            depth
          }

          // Cache the result
          this.evaluationCache.set(fen, result)
          
          // Restore MultiPV setting for normal analysis (3 lines)
          engine.uci('setoption name MultiPV value 3')
          
          // Restore original listener
          engine.listen = originalListen
          
          resolve(result)
        }
      }

      // Start analysis
      try {
        engine.uci('ucinewgame') // Reset engine state
        engine.uci(`position fen ${fen}`)
        engine.uci('setoption name MultiPV value 1') // Only get the best move for arrow duel
        engine.uci(`go depth ${ARROW_DUEL_ANALYSIS_DEPTH}`)
      } catch (error) {
        clearTimeout(timeout)
        // Restore MultiPV setting for normal analysis (3 lines)
        engine.uci('setoption name MultiPV value 3')
        engine.listen = originalListen
        reject(error)
      }
    })
  }

  /**
   * Filter a single puzzle to determine if it's suitable for Arrow Duel
   * 
   * ASSUMPTIONS:
   * 1. puzzle.fen is the starting position for analysis
   * 2. puzzle.solution_moves[0] is a blunder/mistake move (one candidate)
   * 3. Stockfish analysis of puzzle.fen gives the best move (other candidate)
   * 4. Analysis depth is configurable via ARROW_DUEL_ANALYSIS_DEPTH
   * 5. Generated puzzle includes debugging eval info
   */
  async filterPuzzle(puzzle: SprintPuzzle): Promise<ArrowDuelPuzzle | null> {
    try {
      // Create chess game from puzzle FEN
      const game = new Chess(puzzle.fen)
      
      // Validate puzzle has moves
      const puzzleMove = puzzle.solution_moves[0]
      if (!puzzleMove) {
        console.warn(`Puzzle ${puzzle.puzzle_id} has no solution moves`)
        return null
      }

      // Validate the puzzle move is legal BEFORE doing expensive Stockfish analysis
      try {
        game.move(puzzleMove)
        game.undo() // Undo to restore original position
      } catch (error) {
        console.warn(`Puzzle ${puzzle.puzzle_id} has illegal move: ${puzzleMove}`)
        return null
      }
      
      // Now do the expensive Stockfish analysis
      const initialAnalysis = await this.analyzePosition(puzzle.fen)
      
      // Check whose turn it is BEFORE making the move
      const isWhiteToMove = game.turn() === 'w'
      
      // Make the puzzle move for analysis
      game.move(puzzleMove)

      // Analyze position after puzzle move
      const afterPuzzleMoveAnalysis = await this.analyzePosition(game.fen())

      // Calculate evaluation difference
      // IMPORTANT: Stockfish gives eval from CURRENT PLAYER's perspective
      // So positive = good for current player, negative = bad for current player
      const stockfishEval = initialAnalysis.evaluation
      const puzzleMoveEval = -afterPuzzleMoveAnalysis.evaluation // Flip because turn changed
      
      const evalDiff = stockfishEval - puzzleMoveEval
      
      // Check if the best move evaluation is acceptable for the player
      // Since eval is from current player's perspective:
      // We want eval > -60 (not worse than slightly worse) for ANY player
      const evalAcceptable = stockfishEval > -MAX_ACCEPTABLE_EVAL
      const evalExplanation = `eval ${stockfishEval} > -${MAX_ACCEPTABLE_EVAL}`
      
      // Single comprehensive log message
      console.log(`🎯 Puzzle ${puzzle.puzzle_id}: ${isWhiteToMove ? 'WHITE' : 'BLACK'} to move | Best: ${stockfishEval}cp | Blunder: ${puzzleMoveEval}cp | Acceptable: ${evalAcceptable} (${evalExplanation}) | Diff: ${evalDiff}cp | Accept: ${Math.abs(evalDiff) >= EVALUATION_THRESHOLD && evalAcceptable}`)
      
      if (Math.abs(evalDiff) >= EVALUATION_THRESHOLD && evalAcceptable) {
        // Validate both moves are legal from the current position
        const testGame = new Chess(puzzle.fen)
        let isBlunderLegal = false
        let isBestLegal = false
        
        try {
          testGame.move(puzzleMove)
          isBlunderLegal = true
          testGame.undo()
        } catch (e) {
          console.warn(`Puzzle ${puzzle.puzzle_id}: Blunder move ${puzzleMove} is not legal`)
        }
        
        try {
          testGame.move(initialAnalysis.bestMove)
          isBestLegal = true
        } catch (e) {
          console.warn(`Puzzle ${puzzle.puzzle_id}: Best move ${initialAnalysis.bestMove} is not legal`)
        }
        
        // Only create Arrow Duel puzzle if both moves are legal
        if (!isBlunderLegal || !isBestLegal) {
          console.warn(`Puzzle ${puzzle.puzzle_id}: Skipping - invalid candidate moves`)
          return null
        }
        
        // Randomize the order of candidate moves
        const candidates: [string, string] = Math.random() < 0.5 
          ? [puzzleMove, initialAnalysis.bestMove]  // blunder first
          : [initialAnalysis.bestMove, puzzleMove]  // best first
        
        const arrowDuelPuzzle: ArrowDuelPuzzle = {
          ...puzzle,
          bestMove: initialAnalysis.bestMove,
          blunderMove: puzzleMove,
          evaluationDiff: evalDiff,
          candidateMoves: candidates,
          // Debugging info
          bestMoveEval: stockfishEval, // Evaluation from initial position (Stockfish's perspective)
          blunderMoveEval: puzzleMoveEval, // Evaluation after puzzle move (flipped perspective)
          initialEval: stockfishEval, // Initial position evaluation
          analysisDepth: initialAnalysis.depth
        }

        console.log(`✅ Arrow Duel candidate found: ${puzzle.puzzle_id}`, {
          fen: puzzle.fen,
          stockfishBestMove: initialAnalysis.bestMove,
          puzzleBlunderMove: puzzleMove,
          initialEval: stockfishEval,
          bestMoveEval: stockfishEval, // Same as initial (best move from this position)
          blunderMoveEval: puzzleMoveEval,
          evalDiff: evalDiff,
          analysisDepth: initialAnalysis.depth,
          candidateOrder: candidates
        })

        return arrowDuelPuzzle
      }

      if (Math.abs(evalDiff) < EVALUATION_THRESHOLD) {
        console.log(`❌ Puzzle ${puzzle.puzzle_id}: Rejected - evalDiff=${evalDiff} below threshold=${EVALUATION_THRESHOLD}`)
      } else {
        console.log(`❌ Puzzle ${puzzle.puzzle_id}: Rejected - best move eval not acceptable. stockfishEval=${stockfishEval}, isWhiteToMove=${isWhiteToMove}, maxAcceptable=${MAX_ACCEPTABLE_EVAL}`)
      }
      return null
    } catch (error) {
      console.error(`❌ Puzzle ${puzzle.puzzle_id}: Error during filtering:`, error)
      return null
    }
  }

  /**
   * Filter puzzles sequentially (more efficient than parallel analysis)
   */
  async filterPuzzles(puzzles: SprintPuzzle[]): Promise<ArrowDuelPuzzle[]> {
    console.log(`🔍 Arrow Duel Filter: Processing ${puzzles.length} puzzles sequentially...`)
    
    const startTime = Date.now()
    const results: ArrowDuelPuzzle[] = []
    
    for (let i = 0; i < puzzles.length; i++) {
      const puzzle = puzzles[i]
      console.log(`🧩 Analyzing puzzle ${i + 1}/${puzzles.length}: ${puzzle.puzzle_id}`)
      
      try {
        const result = await this.filterPuzzle(puzzle)
        if (result) {
          results.push(result)
          console.log(`✅ Accepted puzzle ${puzzle.puzzle_id} (${results.length} total accepted)`)
        } else {
          console.log(`❌ Rejected puzzle ${puzzle.puzzle_id}`)
        }
      } catch (error) {
        console.warn(`⚠️ Error analyzing puzzle ${puzzle.puzzle_id}:`, error)
        // Continue with next puzzle instead of failing entire batch
      }
    }
    
    return this.processResults(results, puzzles, startTime)
  }


  /**
   * Process filtering results and log statistics
   */
  private processResults(results: ArrowDuelPuzzle[], puzzles: SprintPuzzle[], startTime: number): ArrowDuelPuzzle[] {
    const endTime = Date.now()
    const processingTime = endTime - startTime
    const failed = puzzles.length - results.length
    
    console.log(`📊 Arrow Duel Filter Results:`, {
      totalPuzzles: puzzles.length,
      successfulPuzzles: results.length,
      failedPuzzles: failed,
      filterRate: ((results.length / puzzles.length) * 100).toFixed(1) + '%',
      processingTime: processingTime + 'ms',
      averageTimePerPuzzle: (processingTime / puzzles.length).toFixed(0) + 'ms',
      cacheSize: this.evaluationCache.size
    })

    if (results.length === 0) {
      console.warn(`⚠️ Arrow Duel Filter: No puzzles passed filtering out of ${puzzles.length} attempts`)
      console.warn(`   Common causes:`)
      console.warn(`   - Evaluation differences too small (< ${EVALUATION_THRESHOLD} centipawns)`)
      console.warn(`   - Analysis timeouts (${ANALYSIS_TIMEOUT}ms limit)`)
      console.warn(`   - Illegal move suggestions from engine`)
    }

    return results
  }

  /**
   * Clear the evaluation cache
   */
  clearCache(): void {
    this.evaluationCache.clear()
    console.log('🗑️ Arrow Duel Filter: Cache cleared')
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; hitRate?: number } {
    return {
      size: this.evaluationCache.size
    }
  }
}

// Export a singleton instance for use across the application
export const arrowDuelFilter = new ArrowDuelFilter()
