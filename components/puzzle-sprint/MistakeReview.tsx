"use client"

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import { Chess } from 'chess.js'

import React, { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ChessBoard, ChessBoardRef } from './ChessBoard'
import { InteractiveAnalysis } from './InteractiveAnalysis'
import { useSprintPuzzles, SprintPuzzleAttempt, PuzzleAttemptRequest } from '@/hooks/useSprintApi'
import {
  ChevronLeft,
  ChevronRight,
  X,
  Copy as CopyIcon,
  Check as CheckIcon,
  ExternalLink,
  Clock,
  Target,
  AlertTriangle,
  RotateCcw,
  Undo2,
  Eye,
  Crown
} from 'lucide-react'

interface MistakeReviewProps {
  sessionId: string
  eloType?: string
  failedAttempts?: PuzzleAttemptRequest[]
  onClose: () => void
}

// Analysis line interface for arrows
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

export function MistakeReview({ sessionId, eloType, failedAttempts, onClose }: MistakeReviewProps) {
  const { getSprintPuzzles, isLoading, error } = useSprintPuzzles()
  const [mistakes, setMistakes] = useState<SprintPuzzleAttempt[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [analysisMode, setAnalysisMode] = useState<'retry' | 'analyze'>('retry')
  const [analysisFen, setAnalysisFen] = useState<string>('')
  const [puzzleSolved, setPuzzleSolved] = useState(false)
  const [wrongMoveSquares, setWrongMoveSquares] = useState<Record<string, any>>({})
  const [moveHistory, setMoveHistory] = useState<string[]>([]) // Track FEN history for move back
  const [analysisLines, setAnalysisLines] = useState<AnalysisLine[]>([]) // Store analysis data for arrows
  // Analysis move history (FEN snapshots)
  const [positionHistory, setPositionHistory] = useState<string[]>([])
  const [historyIndex, setHistoryIndex] = useState<number>(-1)

  const [blunderArrow, setBlunderArrow] = useState<AnalysisLine | null>(null) // Red arrow for blunder move in arrow duel

  // Blunder follow-up flow state (after choosing the wrong move in Arrow Duel)
  const [blunderFollowupActive, setBlunderFollowupActive] = useState(false)
  const [blunderFollowupFen, setBlunderFollowupFen] = useState<string>('')
  const [blunderFollowupMoves, setBlunderFollowupMoves] = useState<string[]>([])

  const analysisBoardRef = useRef<ChessBoardRef>(null)
  const chessBoardRef = useRef<ChessBoardRef>(null)

  // Load mistakes on component mount
  useEffect(() => {
    if (failedAttempts && failedAttempts.length > 0) {
      // Use client-side failed attempts if available

      // Convert PuzzleAttemptRequest to SprintPuzzleAttempt format
      // Note: We'll need to fetch puzzle data (FEN, solution_moves, etc.) from server
      // But we have the complete attempt data with Arrow Duel info
      const convertedMistakes: SprintPuzzleAttempt[] = failedAttempts.map(attempt => ({
        puzzle_id: attempt.puzzle_id,
        sequence_in_sprint: attempt.sequence_in_sprint,
        fen: '', // Will be populated from server data
        solution_moves: [], // Will be populated from server data
        rating: 0, // Will be populated from server data
        themes: [], // Will be populated from server data
        attempt_status: 'failed' as const,
        user_moves: attempt.user_moves,
        was_correct: attempt.was_correct,
        time_taken_ms: attempt.time_taken_ms,
        attempted_at: attempt.attempted_at,
        attempt_type: attempt.attempt_type,
        candidate_moves: attempt.candidate_moves,
        chosen_move: attempt.chosen_move,
        best_move: attempt.best_move,
        blunder_move: attempt.blunder_move
      }))

      setMistakes(convertedMistakes)
      // Still need to fetch puzzle details from server to get FEN, solution_moves, etc.
      loadPuzzleDetails(convertedMistakes)
    } else {
      // Fallback to server-side loading
      loadMistakes()
    }

    async function loadMistakes() {
      const response = await getSprintPuzzles(sessionId, { status: 'failed' })
      if (response && response.puzzles.length > 0) {
        setMistakes(response.puzzles)
      }
    }

    async function loadPuzzleDetails(convertedMistakes: SprintPuzzleAttempt[]) {
      // Fetch puzzle details to populate missing fields
      const response = await getSprintPuzzles(sessionId, { status: 'failed' })
      if (response && response.puzzles.length > 0) {
        // Merge server puzzle data with client attempt data
        const mergedMistakes = convertedMistakes.map(mistake => {
          const serverPuzzle = response.puzzles.find(p => p.puzzle_id === mistake.puzzle_id)
          if (serverPuzzle) {
            return {
              ...mistake,
              fen: serverPuzzle.fen,
              solution_moves: serverPuzzle.solution_moves,
              rating: serverPuzzle.rating,
              themes: serverPuzzle.themes
            }
          }
          return mistake
        })
        setMistakes(mergedMistakes)

      }
    }
  }, [sessionId, getSprintPuzzles, failedAttempts])

  const currentMistake = mistakes[currentIndex]

  // Determine if this is an Arrow Duel session from ELO type
  const isArrowDuelSession = eloType?.includes('arrowduel') ?? false

  // Helper function to check if we're at the initial position (for arrow visibility)
  const isAtInitialPosition = (currentFen: string, initialFen: string): boolean => {
    if (!currentFen) return true

    // Compare only the position part of FEN (first 4 parts: pieces, active color, castling, en passant)
    // Ignore halfmove and fullmove counters which can differ
    const getCurrentPositionPart = (fen: string) => {
      const parts = fen.split(' ')
      return parts.slice(0, 4).join(' ')
    }

    return getCurrentPositionPart(currentFen) === getCurrentPositionPart(initialFen)
  }


  // Calculate consistent board orientation for the current mistake
  const getBoardOrientation = (fenString: string, isArrowDuel: boolean): 'white' | 'black' => {
    const activeColor = fenString.split(' ')[1]

    if (isArrowDuel) {
      // For arrow duel, the player making the move should be at the bottom
      // If it's white's turn in FEN, white should be at bottom (black orientation)
      // If it's black's turn in FEN, black should be at bottom (white orientation)
      return activeColor === 'w' ? 'white' : 'black'
    } else {
      // For regular puzzles, we want the player (who needs to move) at the bottom
      // If it's black's turn in FEN, black should be at bottom (white orientation)
      // If it's white's turn in FEN, white should be at bottom (black orientation)
      return activeColor === 'b' ? 'white' : 'black'
    }
  }

  const currentOrientation = currentMistake ? getBoardOrientation(currentMistake.fen, isArrowDuelSession) : 'white'

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1)
      setAnalysisMode('retry')
      setPuzzleSolved(false)
      setWrongMoveSquares({})
      setAnalysisLines([]) // Clear analysis arrows
      setBlunderArrow(null) // Clear blunder arrow
      setBlunderFollowupActive(false)
      setBlunderFollowupFen('')
      setBlunderFollowupMoves([])
    }
  }

  const handleNext = () => {
    if (currentIndex < mistakes.length - 1) {
      setCurrentIndex(currentIndex + 1)
      setAnalysisMode('retry')
      setPuzzleSolved(false)
      setWrongMoveSquares({})
      setAnalysisLines([]) // Clear analysis arrows
      setBlunderArrow(null) // Clear blunder arrow
      setBlunderFollowupActive(false)
      setBlunderFollowupFen('')
      setBlunderFollowupMoves([])
    }
  }

  const handlePuzzleComplete = (success: boolean, userMoves: string[]) => {
    if (success) {
      setPuzzleSolved(true)
    }
  }

  const handleWrongMove = (fromSquare: string, toSquare: string) => {
    // Show red highlight on wrong move squares
    setWrongMoveSquares({
      [fromSquare]: { backgroundColor: 'rgba(239, 68, 68, 0.6)' },
      [toSquare]: { backgroundColor: 'rgba(239, 68, 68, 0.6)' }
    })

    // Clear the highlight after a delay
    setTimeout(() => {
      setWrongMoveSquares({})
    }, 800)
  }

  // Local copied state for the FEN copy button
  const [copied, setCopied] = useState(false)

  const handlePositionChange = (newFen: string, lastMove?: string) => {
    setAnalysisFen(newFen)
    // Keep legacy move history for potential future use
    setMoveHistory(prev => {
      if (prev.length === 0 || prev[prev.length - 1] !== newFen) {
        return [...prev, newFen]
      }
      return prev
    })
    // Track analysis position history for Back navigation
    setPositionHistory(prev => {
      const trimmed = prev.slice(0, historyIndex + 1)
      if (trimmed[trimmed.length - 1] !== newFen) {
        const next = [...trimmed, newFen]
        setHistoryIndex(next.length - 1)
        return next
      }
      return prev
    })
  }

  const handleMakeMove = (move: string) => {
    // Call the analysis board's makeMove method through the ref
    if (analysisBoardRef.current) {
      analysisBoardRef.current.makeMove(move)
    }
  }



  const formatTime = (ms?: number): string => {
    if (!ms) return 'N/A'
    const seconds = Math.round(ms / 1000)
    return `${seconds}s`
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center max-w-md mx-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your mistakes...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center max-w-md mx-4">
          <AlertTriangle className="h-8 w-8 text-red-600 mx-auto mb-4" />
          <p className="text-red-600 mb-4">Failed to load mistakes</p>
          <p className="text-gray-600 text-sm mb-4">{error}</p>
          <Button onClick={onClose} variant="outline">
            Close
          </Button>
        </div>
      </div>
    )
  }

  if (mistakes.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center max-w-md mx-4">
          <Target className="h-8 w-8 text-green-600 mx-auto mb-4" />
          <p className="text-gray-900 font-medium mb-2">No mistakes to review!</p>
          <p className="text-gray-600 text-sm mb-4">
            You didn't make any mistakes in this sprint.
          </p>
          <Button onClick={onClose} variant="outline">
            Close
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="flex items-center gap-2 text-lg sm:text-xl font-bold text-gray-900">
                <AlertTriangle className="h-5 w-5 sm:h-6 sm:w-6 text-orange-600" />
                Review Mistakes
              </h1>
              <p className="text-sm sm:text-base text-gray-600 mt-1">
                Puzzle {currentIndex + 1} of {mistakes.length}
              </p>
            </div>
            <Button onClick={onClose} variant="outline" size="sm">
              <X className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Close</span>
              <span className="sm:hidden">Exit</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col lg:flex-row max-w-7xl mx-auto w-full">
        {/* Mode controls moved to the right info panel to match design */}
        <div className="hidden" />
        {/* Chess Board Section */}
        <div className="flex-1 flex flex-col min-h-0 lg:min-w-0">
          <div className="flex-1 p-4 sm:p-6 flex flex-col justify-center bg-white" style={{ paddingTop: '2rem' }}>
            {currentMistake && (
              <div className="w-full h-full max-w-2xl max-h-full flex flex-col justify-center mx-auto">

                {/* Turn Indicator (shown in both retry and explore modes, positioned above chess board like SprintSession) */}
                {(
                  <div className="flex-shrink-0 mb-2 sm:mb-4">
                    <div className="flex items-center justify-center py-2 sm:py-3 px-3 sm:px-4 bg-white rounded-lg shadow-sm border mx-2 sm:mx-4">
                      <div className="flex items-center space-x-2 sm:space-x-3">
                        {(() => { const isWhite = currentMistake.fen.split(' ')[1] === 'w'; return (
                          <div className={`p-1.5 sm:p-2 rounded-full ${isWhite ? 'bg-gray-100' : 'bg-gray-800'}`}>
                            <Crown className={`h-4 w-4 sm:h-5 sm:w-5 ${isWhite ? 'text-gray-700' : 'text-white'}`} />
                          </div>
                        ); })()}
                        <div className="text-center">
                          <div className="font-semibold text-gray-900 text-sm sm:text-base">Your turn</div>
                          <div className="text-xs sm:text-sm text-gray-600">
                            {(() => { const isWhite = currentMistake.fen.split(' ')[1] === 'w'; return `Find the best move for ${isWhite ? 'white' : 'black'}.`; })()}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Chess Board */}
                <div className="flex-1 flex justify-center">
                {analysisMode === 'analyze' ? (
                  <ChessBoard
                    ref={analysisBoardRef}
                    key={`analysis-${currentMistake.puzzle_id}`}
                    fen={analysisFen || currentMistake.fen}
                    orientation={currentOrientation}
                    onPositionChange={handlePositionChange}
                    onMoveAnalysis={handleMakeMove}
                    mode="analysis"
                    disabled={false}
                    analysisLines={(() => {
                      // For Arrow Duel in explore mode, show colored arrows only at initial position
                      const atInitialPos = isAtInitialPosition(analysisFen, currentMistake.fen)
                      console.log('Arrow Duel Debug:', {
                        isArrowDuelSession,
                        atInitialPos,
                        analysisFen: analysisFen || 'empty',
                        initialFen: currentMistake.fen,
                        candidateMoves: currentMistake.candidate_moves
                      })

                      if (isArrowDuelSession && atInitialPos) {
                        const arrows = []
                        if (currentMistake.candidate_moves && currentMistake.candidate_moves.length >= 2) {
                          // Add blue arrow for best move (multipv: 1 = best move = blue)
                          if (currentMistake.best_move) {
                            arrows.push({
                              moves: [currentMistake.best_move],
                              evaluation: 100,
                              depth: 15,
                              pv: currentMistake.best_move,
                              multipv: 1,
                              uciMoves: [currentMistake.best_move]
                            })
                          }
                          // Add red arrow for blunder move (multipv: 99 = blunder = red)
                          if (currentMistake.blunder_move || currentMistake.solution_moves?.[0]) {
                            const blunderMove = currentMistake.blunder_move || currentMistake.solution_moves[0]
                            arrows.push({
                              moves: [blunderMove],
                              evaluation: -200,
                              depth: 15,
                              pv: blunderMove,
                              multipv: 99,
                              uciMoves: [blunderMove]
                            })
                          }
                        }
                        console.log('Arrow Duel Arrows Created:', arrows)
                        return arrows
                      }
                      // Regular analysis arrows only at original position
                      return blunderArrow && isAtInitialPosition(analysisFen, currentMistake.fen)
                        ? [blunderArrow, ...analysisLines]
                        : analysisLines
                    })()}
                    showAnalysisArrows={true}
                  />
                ) : isArrowDuelSession ? (
                  // Arrow Duel mode with candidate moves
                  currentMistake.candidate_moves && currentMistake.candidate_moves.length >= 2 ? (
                    blunderFollowupActive ? (
                      <ChessBoard
                        ref={chessBoardRef}
                        key={`arrowduel-followup-${currentMistake.puzzle_id}`}
                        fen={blunderFollowupFen || currentMistake.fen}
                        solutionMoves={blunderFollowupMoves}
                        onPuzzleComplete={handlePuzzleComplete}
                        disabled={false}
                        undoWrongMoves={true}
                        mode="puzzle"
                        orientation={currentOrientation}
                        disableMoveHighlighting={true}
                        showExpectedMoveArrow={true}
                      />
                    ) : (
                      <ChessBoard
                        ref={chessBoardRef}
                        key={`arrowduel-${currentMistake.puzzle_id}`}
                        fen={currentMistake.fen}
                        orientation={currentOrientation}
                        mode="arrowduel"
                        disabled={puzzleSolved}
                        candidateMoves={currentMistake.candidate_moves as [string, string]}
                        bestMove={currentMistake.best_move || (() => {
                          // Fallback: determine best move by excluding the puzzle solution (blunder)
                          if (currentMistake.candidate_moves && currentMistake.solution_moves?.[0]) {
                            const blunderMove = currentMistake.solution_moves[0]
                            return currentMistake.candidate_moves.find(move => move !== blunderMove)
                          }
                          return currentMistake.candidate_moves?.[1] // Last resort fallback
                        })()}
                        blunderMove={currentMistake.blunder_move || currentMistake.solution_moves?.[0]} // Blunder is always the puzzle solution
                        onPositionChange={handlePositionChange}
                        onMoveChosen={(chosenMove, isCorrect) => {
                          // Show immediate green/red feedback on the board
                          if (chessBoardRef.current) {
                            chessBoardRef.current.highlightMove(chosenMove, isCorrect)
                          }
                          if (isCorrect) {
                            // Correct choice ends this item
                            setPuzzleSolved(true)
                          } else {
                            // Start guided follow-up from position after blunder
                            try {
                              const c = new Chess(currentMistake.fen)
                              const res = c.move(chosenMove)
                              const followFen = res ? c.fen() : currentMistake.fen
                              // After applying the blunder on the board, hand the REMAINING solution moves to the puzzle board
                              const followMoves = currentMistake.solution_moves?.slice(1) || []
                              setBlunderFollowupFen(followFen)
                              setBlunderFollowupMoves(followMoves)
                              setBlunderFollowupActive(true)
                              setPuzzleSolved(false)
                            } catch (e) {
                              console.error('Failed to start blunder follow-up', e)
                            }
                          }
                        }}
                      />
                    )
                  ) : (
                    // Fallback when candidate moves are missing
                    <div className="space-y-4">
                      <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <AlertTriangle className="h-4 w-4 text-orange-600" />
                          <span className="text-sm font-medium text-orange-800">Arrow Duel Data Missing</span>
                        </div>
                        <p className="text-xs text-orange-700">
                          The candidate moves data for this Arrow Duel mistake is not available.
                          You can still analyze the position where the mistake was made.
                        </p>
                      </div>
                      <ChessBoard
                        ref={chessBoardRef}
                        key={`arrowduel-fallback-${currentMistake.puzzle_id}`}
                        fen={currentMistake.fen}
                        solutionMoves={currentMistake.solution_moves}
                        onPuzzleComplete={handlePuzzleComplete}
                        onMoveAttempt={(move, isCorrect) => {
                          if (!isCorrect) {
                            const fromSquare = move.slice(0, 2)
                            const toSquare = move.slice(2, 4)
                            handleWrongMove(fromSquare, toSquare)
                          }
                        }}
                        disabled={puzzleSolved}
                        undoWrongMoves={true}
                        mode="puzzle"
                        orientation={currentOrientation}
                      />
                    </div>
                  )
                ) : (
                  <ChessBoard
                    ref={chessBoardRef}
                    key={`puzzle-${currentMistake.puzzle_id}`}
                    fen={currentMistake.fen}
                    solutionMoves={currentMistake.solution_moves}
                    onPuzzleComplete={handlePuzzleComplete}
                    onMoveAttempt={(move, isCorrect) => {
                      if (!isCorrect) {
                        // Extract from/to squares from the move
                        const fromSquare = move.slice(0, 2)
                        const toSquare = move.slice(2, 4)
                        handleWrongMove(fromSquare, toSquare)
                      }
                    }}
                    disabled={puzzleSolved}
                    undoWrongMoves={true}
                    mode="puzzle"
                    orientation={currentOrientation}
                  />
                )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Info Panel */}
        <div className="w-full lg:w-96 xl:w-[28rem] flex-shrink-0 border-t lg:border-t-0 lg:border-l bg-white lg:bg-gray-50 overflow-y-auto">
          <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
            {/* Puzzle Info */}
            {currentMistake && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-3 xl:grid-cols-1 gap-2 sm:gap-3 xl:gap-2">
                  <div className="flex items-center justify-between sm:flex-col sm:items-start xl:flex-row xl:items-center">
                    <span className="text-xs sm:text-sm font-medium text-gray-700">Rating</span>
                    <Badge variant="secondary" className="text-xs sm:text-sm">{currentMistake.rating}</Badge>
                  </div>
                  <div className="flex items-center justify-between sm:flex-col sm:items-start xl:flex-row xl:items-center">
                    <span className="text-xs sm:text-sm font-medium text-gray-700">Time Taken</span>
                    <Badge variant="outline" className="flex items-center gap-1 text-xs sm:text-sm">
                      <Clock className="h-3 w-3" />
                      {formatTime(currentMistake.time_taken_ms)}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between sm:flex-col sm:items-start xl:flex-row xl:items-center">
                    <span className="text-xs sm:text-sm font-medium text-gray-700">Sequence</span>
                    <Badge variant="outline" className="text-xs sm:text-sm">#{currentMistake.sequence_in_sprint}</Badge>
                  </div>
                </div>

                {/* Arrow Duel Mode Info */}
                {isArrowDuelSession && analysisMode === 'retry' && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Target className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium text-blue-800">🏹 Arrow Duel Review</span>
                    </div>
                    <p className="text-xs text-blue-700">
                      Choose the better move between the two arrows.
                    </p>

                  </div>
                )}


                {/* Themes */}
                {currentMistake.themes.length > 0 && (

                  <div>
                    <p className="text-xs sm:text-sm font-medium text-gray-700 mb-2">Themes</p>
                    <div className="flex flex-wrap gap-1">
                      {currentMistake.themes.map((theme, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {theme}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Lichess + Copy FEN before Explore toggle */}
                {currentMistake && (
                  <div className="flex items-center gap-2">
                    <Button asChild variant="outline" className="flex-1 py-3 text-sm inline-flex items-center justify-center min-w-0">
                      <a
                        href={`https://lichess.org/analysis/standard/${(analysisFen || currentMistake.fen).trim().replace(/\s+/g, '_')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label="Analysis in Lichess"
                        title="Analysis in Lichess"
                        className="w-full flex items-center justify-center text-center whitespace-nowrap leading-snug overflow-hidden text-ellipsis min-w-0"
                      >
                        <ExternalLink className="h-4 w-4 mr-2 flex-shrink-0" />
                        <span className="truncate">Analysis in Lichess</span>
                      </a>
                    </Button>

                    <Button
                      variant="outline"
                      className="px-3 py-3 inline-flex items-center justify-center flex-shrink-0"
                      onClick={async () => {
                        const fen = (analysisFen || currentMistake.fen).trim()
                        try {
                          if (navigator.clipboard && navigator.clipboard.writeText) {
                            await navigator.clipboard.writeText(fen)
                          } else {
                            const ta = document.createElement('textarea')
                            ta.value = fen
                            document.body.appendChild(ta)
                            ta.select()
                            document.execCommand('copy')
                            document.body.removeChild(ta)
                          }
                          setCopied(true)
                          setTimeout(() => setCopied(false), 1200)
                        } catch (e) {
                          console.error('Copy failed', e)
                        }
                      }}
                      aria-label="Copy FEN"
                      title="Copy FEN"
                    >
                      {copied ? (
                        <CheckIcon className="h-4 w-4 text-green-600" />
                      ) : (
                        <CopyIcon className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                )}

                {/* Explore toggle button */}
                <div className="mt-3">
                  {analysisMode === 'analyze' ? (
                    <Button
                      className="w-full bg-black hover:bg-black/90 text-white py-3 text-sm"
                      onClick={() => {
                        setAnalysisMode('retry')
                        // Clear solved banner when exiting Explore and resetting position
                        setPuzzleSolved(false)
                      }}
                    >
                      <Eye className="h-5 w-5 mr-2" /> Exit Explore
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      className="w-full py-3 text-sm"
                      onClick={() => {
                        setAnalysisMode('analyze')
                        if (currentMistake) {
                          if (isArrowDuelSession) {
                            // Arrow Duel: start at the original position
                            const initialFen = currentMistake.fen
                            setAnalysisFen(initialFen)
                            setPositionHistory([initialFen])
                            setHistoryIndex(0)
                          } else {
                            // Regular puzzle: start with original position (index 0) and after opponent move (index 1)
                            const originalFen = currentMistake.fen
                            let afterOpponentFen = originalFen
                            try {
                              const chess = new Chess(currentMistake.fen)
                              if (currentMistake.solution_moves?.length) {
                                const res = chess.move(currentMistake.solution_moves[0])
                                if (res) afterOpponentFen = chess.fen()
                              }
                            } catch {}
                            setAnalysisFen(afterOpponentFen)
                            setPositionHistory([originalFen, afterOpponentFen])
                            setHistoryIndex(1)
                          }
                        }
                      }}
                    >
                      <Eye className="h-5 w-5 mr-2" /> Explore
                    </Button>
                  )}
                </div>

                {/* Explore tools card (Back/Reset) */}
                {analysisMode === 'analyze' && (
                  <div className="mt-3 bg-white border border-gray-200 rounded-lg p-3 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Eye className="h-4 w-4" />
                        <span className="font-semibold text-gray-900">Explore</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            if (historyIndex > 0 && positionHistory.length > 0) {
                              const prevFen = positionHistory[historyIndex - 1]
                              analysisBoardRef.current?.setPosition(prevFen)
                              setAnalysisFen(prevFen)
                              setHistoryIndex(historyIndex - 1)
                            }
                          }}
                          disabled={historyIndex <= 0}
                          title="Back one move"
                        >
                          <Undo2 className="h-4 w-4 mr-1" /> Back
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            if (analysisBoardRef.current && currentMistake) {
                              if (isArrowDuelSession) {
                                // Arrow Duel: reset to original position
                                const initialFen = currentMistake.fen
                                analysisBoardRef.current.setPosition(initialFen)
                                setAnalysisFen(initialFen)
                                setPositionHistory([initialFen])
                                setHistoryIndex(0)
                              } else {
                                // Regular puzzle: reset to after opponent move (index 1), but keep original position (index 0) accessible
                                const originalFen = currentMistake.fen
                                let afterOpponentFen = originalFen
                                try {
                                  const chess = new Chess(currentMistake.fen)
                                  if (currentMistake.solution_moves?.length) {
                                    const res = chess.move(currentMistake.solution_moves[0])
                                    if (res) afterOpponentFen = chess.fen()
                                  }
                                } catch {}
                                analysisBoardRef.current.setPosition(afterOpponentFen)
                                setAnalysisFen(afterOpponentFen)
                                setPositionHistory([originalFen, afterOpponentFen])
                                setHistoryIndex(1)
                              }
                            }
                          }}
                          title="Reset to initial position"
                        >
                          <RotateCcw className="h-4 w-4 mr-1" /> Reset
                        </Button>
                      </div>
                    </div>
                    <div className="mt-3">
                      <div className="text-xs text-blue-700 bg-blue-50 border border-blue-100 rounded px-3 py-2">
                        Click and drag pieces to explore different moves and variations.
                      </div>
                    </div>
                    <div className="mt-3">
                      <InteractiveAnalysis
                        fen={analysisFen || currentMistake.fen}
                        onMakeMove={handleMakeMove}
                        onAnalysisUpdate={setAnalysisLines}
                      />
                    </div>
                  </div>
                )}

              </>
            )}

            {/* Puzzle Status */}
            {puzzleSolved && analysisMode === 'retry' && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium text-green-800">
                    {isArrowDuelSession ? 'Correct Choice!' : 'Puzzle Solved!'}
                  </span>
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className="flex gap-2 pt-2 border-t">
              <Button
                onClick={handlePrevious}
                variant="outline"
                className="flex-1 text-xs sm:text-sm"
                disabled={currentIndex === 0}
                size="sm"
              >
                <ChevronLeft className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                <span className="hidden sm:inline">Previous</span>
                <span className="sm:hidden">Prev</span>
              </Button>
              <Button
                onClick={handleNext}
                variant="outline"
                className="flex-1 text-xs sm:text-sm"
                disabled={currentIndex === mistakes.length - 1}
                size="sm"
              >
                <span className="hidden sm:inline">Next</span>
                <span className="sm:hidden">Next</span>
                <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4 ml-1" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
