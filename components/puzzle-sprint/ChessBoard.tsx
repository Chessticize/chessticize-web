"use client"

import { Chess, Square } from 'chess.js'
import { HTML5toTouch } from 'rdndmb-html5-to-touch'
import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'
import { Chessboard } from 'react-chessboard'
import { MultiBackend } from 'react-dnd-multi-backend'

// Multi-backend configuration for hybrid touch/mouse support
const HYBRID_BACKEND_OPTIONS = HTML5toTouch

// Global piece animation duration (ms) used to align board animations and highlights
const PIECE_ANIMATION_MS = 150
const FIRST_MOVE_DELAY_MS = 500

// Analysis line interface for arrows
interface AnalysisLine {
  moves: string[] // SAN moves for display
  evaluation: number
  depth: number
  pv: string // Principal variation
  multipv?: number // MultiPV line number (1, 2, 3)
  isMate?: boolean // Whether this is a mate score
  mateIn?: number // Mate in N moves (positive for white, negative for black)
  uciMoves?: string[] // UCI moves for drawing arrows (first move used)
}

interface ChessBoardProps {
  fen: string
  solutionMoves?: string[] // Optional for analysis mode
  onMoveAttempt?: (move: string, isCorrect: boolean, userMoves: string[]) => void
  onPuzzleComplete?: (success: boolean, userMoves: string[]) => void
  onPositionChange?: (newFen: string, lastMove?: string) => void // For analysis mode
  onMoveAnalysis?: (move: string) => void // For analysis mode
  disabled?: boolean
  showHints?: boolean
  orientation?: 'white' | 'black' // Optional - will auto-detect from FEN if not provided
  undoWrongMoves?: boolean // If true, undo wrong moves instead of failing the puzzle
  mode?: 'puzzle' | 'analysis' | 'arrowduel' // Add arrow duel mode
  analysisLines?: AnalysisLine[] // For showing analysis arrows
  showAnalysisArrows?: boolean // Whether to show analysis arrows
  candidateMoves?: [string, string] // [blunder, correct] for arrow duel
  onMoveChosen?: (chosenMove: string, isCorrect: boolean) => void // Arrow duel callback
  bestMove?: string // Best move (for Arrow Duel)
  blunderMove?: string // Blunder move (for Arrow Duel)
  disableMoveHighlighting?: boolean // If true, do not color squares on moves
  showExpectedMoveArrow?: boolean // In puzzle mode, show an arrow for the next expected player move
}

export interface ChessBoardRef {
  getCurrentFen: () => string
  makeMove: (move: string) => void // For analysis mode
  resetPosition: () => void // For analysis mode
  setPosition: (fen: string) => void // For analysis mode - set position directly
  highlightMove: (move: string, isCorrect: boolean) => void // For color-coding move feedback
}

export const ChessBoard = forwardRef<ChessBoardRef, ChessBoardProps>(({
  fen,
  solutionMoves = [],
  onMoveAttempt,
  onPuzzleComplete,
  onPositionChange,
  onMoveAnalysis,
  disabled = false,
  showHints = false,
  orientation,
  undoWrongMoves = false,
  mode = 'puzzle',
  analysisLines = [],
  showAnalysisArrows = false,
  candidateMoves,
  onMoveChosen,
  bestMove, // Add bestMove prop to determine correctness
  blunderMove, // Add blunderMove prop
  disableMoveHighlighting = false,
  showExpectedMoveArrow = false
}, ref) => {
  const [game, setGame] = useState<Chess>(new Chess(fen))
  const [userMoves, setUserMoves] = useState<string[]>([])
  const [currentMoveIndex, setCurrentMoveIndex] = useState(0)
  const [isThinking] = useState(false)
  const [highlightedSquares, setHighlightedSquares] = useState<Record<string, any>>({})
  const [boardSize, setBoardSize] = useState(400)
  const [originalFen] = useState(fen) // Store the original FEN for reset functionality
  const [selectedArrowMove, setSelectedArrowMove] = useState<string | null>(null) // For Arrow Duel mode
  const [arrowDuelCompleted, setArrowDuelCompleted] = useState(false) // Track if Arrow Duel is completed
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null)
  const [validMoves, setValidMoves] = useState<Square[]>([])
  const [premove, setPremove] = useState<{ from: Square; to: Square } | null>(null)
  const [fixedOrientation] = useState<'white' | 'black'>(() => {
    // Set orientation once when component mounts and never change it
    if (orientation) return orientation

    try {
      const chess = new Chess(fen)
      const turn = chess.turn()
      
      // For arrow duel, the player making the move should be at the bottom
      // For regular puzzles, the opposite logic applies (player plays the opposite color)
      if (mode === 'arrowduel') {
        // Arrow duel: whoever's turn it is should be at bottom
        return turn === 'w' ? 'white' : 'black'
      } else {
        // Regular puzzles: player plays opposite color, so flip perspective
        // If it's black's turn in FEN, black should be at bottom (white orientation)
        // If it's white's turn in FEN, white should be at bottom (black orientation)  
        return turn === 'b' ? 'white' : 'black'
      }
    } catch {
      return 'white'
    }
  })

  const containerRef = useRef<HTMLDivElement>(null)

  // Determine if we're in puzzle mode or Arrow Duel mode
  const isPuzzleMode = mode === 'puzzle' && solutionMoves.length > 0
  const isArrowDuelMode = mode === 'arrowduel' && candidateMoves && candidateMoves.length === 2

  // Use the fixed orientation that was set during component initialization
  const currentOrientation = fixedOrientation

  // Convert analysis lines to arrows with different widths based on evaluation
  const customArrows = useMemo(() => {
    // Arrow Duel mode: show candidate move arrows only at initial position; hide after a move
    if (isArrowDuelMode && candidateMoves) {
      // Compare only first 4 FEN fields (ignore halfmove/fullmove counters)
      const getPos = (f: string) => f.split(' ').slice(0, 4).join(' ')
      const atInitial = getPos(game.fen()) === getPos(originalFen)
      if (!atInitial || arrowDuelCompleted) {
        return []
      }
      const arrows: [Square, Square, string][] = []

      candidateMoves.forEach((move) => {
        try {
          if (move.length >= 4) {
            const fromSquare = move.substring(0, 2) as Square
            const toSquare = move.substring(2, 4) as Square

            // Server provides validated candidate moves, no need for client-side validation
            // Use blue arrows for both candidates (no color hints)
            const arrowColor = selectedArrowMove === move
              ? 'rgba(59, 130, 246, 0.9)' // Selected blue (darker)
              : 'rgba(59, 130, 246, 0.6)' // Unselected blue (lighter)

            arrows.push([fromSquare, toSquare, arrowColor])
          }
        } catch (error) {
          console.error('Error parsing candidate move for arrow:', move, error)
        }
      })

      return arrows
    }

    // Puzzle mode: show arrow for expected player move (no colored squares)
    if (isPuzzleMode && showExpectedMoveArrow && solutionMoves.length > currentMoveIndex) {
      const uci = solutionMoves[currentMoveIndex]
      if (uci && uci.length >= 4) {
        const fromSquare = uci.substring(0, 2) as Square
        const toSquare = uci.substring(2, 4) as Square
        // Use a neutral blue hint arrow
        const arrows: [Square, Square, string][] = [[fromSquare, toSquare, 'rgba(59, 130, 246, 0.6)']]
        return arrows
      }
    }

    // Analysis mode: show analysis arrows
    if (!showAnalysisArrows || analysisLines.length === 0) {
      return []
    }

    // Separate blunder arrows (multipv: 99) from regular analysis arrows
    const blunderLines = analysisLines.filter(line => line.multipv === 99)
    const regularLines = analysisLines.filter(line => line.multipv !== 99).slice(0, 3)
    
    const arrows: [Square, Square, string][] = []
    const usedSquares = new Set<string>() // Track used square combinations

    // Process blunder arrows first (highest priority)
    blunderLines.forEach((line) => {
      if (line.uciMoves && line.uciMoves.length > 0) {
        try {
          const uciMove = line.uciMoves[0]
          if (uciMove.length >= 4) {
            const fromSquare = uciMove.substring(0, 2) as Square
            const toSquare = uciMove.substring(2, 4) as Square
            const squareKey = `${fromSquare}-${toSquare}`
            
            if (!usedSquares.has(squareKey)) {
              const arrowColor = 'rgba(239, 68, 68, 0.8)' // Strong red for blunder
              arrows.push([fromSquare, toSquare, arrowColor])
              usedSquares.add(squareKey)
            }
          }
        } catch (error) {
          console.error('Error parsing blunder move for arrow:', line.uciMoves[0], error)
        }
      }
    })

    // Get the best evaluation to compare against for regular arrows
    const bestEval = regularLines[0]?.evaluation || 0

    // Process regular analysis arrows (lower priority)
    regularLines.forEach((line, index) => {
      if (line.uciMoves && line.uciMoves.length > 0) {
        try {
          // Parse the UCI move to get from/to squares
          const uciMove = line.uciMoves[0]
          if (uciMove.length >= 4) {
            const fromSquare = uciMove.substring(0, 2) as Square
            const toSquare = uciMove.substring(2, 4) as Square
            const squareKey = `${fromSquare}-${toSquare}`

            // Skip if this square combination is already used by a blunder arrow
            if (usedSquares.has(squareKey)) {
              return // Skip this arrow to avoid overlap
            }

            // Calculate evaluation difference from the best move
            const evalDiff = Math.abs((line.evaluation || 0) - bestEval)

            // Only show arrows for moves that are reasonably good
            // Skip moves that are significantly worse (more than 100 centipawns worse)
            if (index > 0 && evalDiff > 100) {
              return // Skip this arrow
            }

            // Determine arrow color based on line ranking
            let arrowColor: string
            if (index === 0) {
              // Best move
              arrowColor = 'rgba(59, 130, 246, 0.9)' // Strong blue, high opacity
            } else if (index === 1) {
              // Second best
              arrowColor = 'rgba(59, 130, 246, 0.4)' // Medium blue, medium opacity
            } else {
              // Third best
              arrowColor = 'rgba(59, 130, 246, 0.2)' // Light blue, lower opacity
            }

            arrows.push([fromSquare, toSquare, arrowColor])
            usedSquares.add(squareKey)
          }
        } catch (error) {
          console.error('Error parsing UCI move for arrow:', line.uciMoves[0], error)
        }
      }
    })

    return arrows
  }, [showAnalysisArrows, analysisLines, isArrowDuelMode, candidateMoves, selectedArrowMove, arrowDuelCompleted, originalFen, game])



  // Handle responsive board sizing - optimized for mobile-first approach
  useEffect(() => {
    const updateBoardSize = () => {
      if (containerRef.current) {
        const container = containerRef.current
        const containerWidth = container.clientWidth
        const containerHeight = container.clientHeight
        const viewportWidth = window.innerWidth

        // Calculate optimal size based on available space with mobile-optimized margins
        const horizontalPadding = viewportWidth < 640 ? 16 : 32 // Smaller padding on mobile
        const verticalPadding = viewportWidth < 640 ? 16 : 32

        const maxWidth = containerWidth - horizontalPadding
        const maxHeight = containerHeight - verticalPadding

        // Use the smaller dimension to maintain square aspect ratio
        const optimalSize = Math.min(maxWidth, maxHeight)

        // Mobile-first responsive size limits
        let minSize = 240 // Smaller minimum for very small screens
        let maxSize = 800

        if (viewportWidth < 375) { // Very small mobile (iPhone SE)
          minSize = 240
          maxSize = Math.min(viewportWidth - 32, 320)
        } else if (viewportWidth < 640) { // Mobile
          minSize = 280
          maxSize = Math.min(viewportWidth - 32, 380)
        } else if (viewportWidth < 768) { // Large mobile/small tablet
          minSize = 320
          maxSize = Math.min(viewportWidth - 48, 450)
        } else if (viewportWidth < 1024) { // Tablet
          minSize = 350
          maxSize = 600
        } else { // Desktop
          minSize = 400
          maxSize = 800
        }

        // Ensure size is within reasonable bounds
        const finalSize = Math.max(minSize, Math.min(maxSize, optimalSize))

        // Only update if the size has changed significantly to avoid constant re-renders
        if (Math.abs(finalSize - boardSize) > 10) {
          setBoardSize(finalSize)
        }
      }
    }

    // Initial calculation
    updateBoardSize()

    // Add resize listener with debouncing
    let resizeTimeout: ReturnType<typeof setTimeout>
    const debouncedResize = () => {
      clearTimeout(resizeTimeout)
      resizeTimeout = setTimeout(updateBoardSize, 100)
    }

    window.addEventListener('resize', debouncedResize)

    return () => {
      window.removeEventListener('resize', debouncedResize)
      clearTimeout(resizeTimeout)
    }
  }, [])

  // Create a stable puzzle identifier to prevent unnecessary resets
  const puzzleId = useMemo(() => {
    return `${fen}-${solutionMoves.join(',')}-${mode}`
  }, [fen, solutionMoves, mode])

  // Track previous puzzle ID to detect actual changes
  const prevPuzzleIdRef = useRef<string | undefined>(undefined)
  const isNewPuzzle = prevPuzzleIdRef.current !== puzzleId

  // Debug: Log component mount/unmount
  useEffect(() => {
    console.log('🏁 ChessBoard component mounted/re-mounted')
    return () => {
      console.log('🧹 ChessBoard component unmounting')
    }
  }, [])

  // Reset game when puzzle actually changes (not just reference changes)
  useEffect(() => {
    // Only initialize if this is actually a new puzzle
    if (!isNewPuzzle) {
      console.log('🔄 BOARD INITIALIZATION SKIPPED (same puzzle):', {
        puzzleId,
        prevPuzzleId: prevPuzzleIdRef.current
      })
      return
    }

    const initializeBoard = async () => {
      console.log('🔄 BOARD INITIALIZATION TRIGGERED:', {
        puzzleId,
        prevPuzzleId: prevPuzzleIdRef.current,
        fen,
        mode,
        solutionMovesLength: solutionMoves.length,
        solutionMoves: solutionMoves,
        timestamp: new Date().toISOString()
      })

      // Update the ref to track this puzzle
      prevPuzzleIdRef.current = puzzleId

      const newGame = new Chess(fen)
      setGame(newGame)
      setUserMoves([])
      setCurrentMoveIndex(0)
      setHighlightedSquares({})

      // Only make the first move in puzzle mode (not Arrow Duel mode)
      if (isPuzzleMode && solutionMoves.length > 0) {
        // Log puzzle type based on move count
        const puzzleType = solutionMoves.length === 2 ? '2-move puzzle' : `${solutionMoves.length}-move puzzle`
        console.log(`📋 Starting ${puzzleType}:`, {
          totalMoves: solutionMoves.length,
          playerMoves: Math.ceil(solutionMoves.length / 2),
          opponentMoves: Math.floor(solutionMoves.length / 2)
        })

        // Wait a moment to show the initial position
        await new Promise(resolve => setTimeout(resolve, FIRST_MOVE_DELAY_MS))

        try {
          const firstMove = solutionMoves[0]
          const moveResult = newGame.move(firstMove)

          if (moveResult) {
            // Update game state with the opponent's move - use the instance directly
            setGame(newGame)  // Use the instance directly, same as player moves
            setCurrentMoveIndex(1) // Player should make the second move (index 1)

            // Highlight the opponent's move (unless disabled)
            if (!disableMoveHighlighting) {
              setHighlightedSquares({
                [moveResult.from]: { backgroundColor: 'rgba(59, 130, 246, 0.4)' },
                [moveResult.to]: { backgroundColor: 'rgba(59, 130, 246, 0.4)' }
              })

              // Clear highlights after a moment
              setTimeout(() => {
                setHighlightedSquares({})
              }, 1500)
            }
          } else {
            console.error('Initial opponent move failed (returned null):', solutionMoves[0])
          }
        } catch (error) {
          console.error('Error making initial opponent move:', error)
        }
      }
    }

    initializeBoard()
  }, [puzzleId, isPuzzleMode])

  // Reset game when FEN changes (for analysis mode)
  useEffect(() => {
    if (!isPuzzleMode) {
      try {
        const newGame = new Chess(fen)
        setGame(newGame)
        setHighlightedSquares({})
        // Clear selection when game state changes
        setSelectedSquare(null)
        setValidMoves([])
      } catch (error) {
        console.error('Invalid FEN provided:', fen, error)
      }
    }
  }, [fen, isPuzzleMode])

  // Clear selection when game state changes (for puzzle mode)
  useEffect(() => {
    setSelectedSquare(null)
    setValidMoves([])
  }, [game.fen()])

  // Validate move against solution
  const validateMove = useCallback((move: string, moveObj: any): boolean => {
    if (currentMoveIndex >= solutionMoves.length) {
      return false
    }

    // First, check if the move results in checkmate - if so, it's always valid
    // Checkmate is objectively the best possible move regardless of the official solution
    try {
      const tempGame = new Chess(game.fen())
      tempGame.move(moveObj)
      if (tempGame.isCheckmate()) {
        console.log('✅ Checkmate found! Move accepted regardless of solution:', {
          userMove: move,
          expectedMove: solutionMoves[currentMoveIndex],
          currentMoveIndex: currentMoveIndex,
          reason: 'checkmate_override'
        })
        return true
      }
    } catch (error) {
      // Continue with normal validation if checkmate check fails
      console.log('Checkmate validation failed, continuing with normal validation:', error)
    }

    const expectedMove = solutionMoves[currentMoveIndex]

    // Try exact SAN match first
    if (move === expectedMove) {
      return true
    }

    // Try UCI comparison using the move object (from/to/promotion)
    try {
      if (moveObj && moveObj.from && moveObj.to) {
        const ourUci = `${moveObj.from}${moveObj.to}${moveObj.promotion || ''}`
        if (ourUci === expectedMove) {
          return true
        }
        // Compare by components if expected looks like UCI
        const uciRegex = /^[a-h][1-8][a-h][1-8][nbrq]?$/
        if (typeof expectedMove === 'string' && uciRegex.test(expectedMove)) {
          const expFrom = expectedMove.slice(0, 2)
          const expTo = expectedMove.slice(2, 4)
          const expPromo = expectedMove.length > 4 ? expectedMove.slice(4, 5) : undefined
          if (moveObj.from === expFrom && moveObj.to === expTo && (!expPromo || expPromo === moveObj.promotion)) {
            return true
          }
        }
      }
    } catch {}


    // Try alternative notations - sometimes puzzles use different notation
    // Check if the move object matches the expected move when parsed
    try {
      const tempGame = new Chess(game.fen())
      const expectedMoveObj = tempGame.move(expectedMove)

      if (expectedMoveObj && moveObj) {
        // Compare the actual squares moved
        const sameFromTo = moveObj.from === expectedMoveObj.from && moveObj.to === expectedMoveObj.to
        const samePromotion = moveObj.promotion === expectedMoveObj.promotion

        if (sameFromTo && (moveObj.promotion === undefined || samePromotion)) {
          console.log('Move accepted via alternative validation:', {
            userMove: move,
            expectedMove: expectedMove,
            currentMoveIndex: currentMoveIndex,
            userMoveObj: moveObj,
            expectedMoveObj: expectedMoveObj
          })
          return true
        }
      }
    } catch (error) {
      // If parsing fails, fall back to string comparison
    }

    // Debug logging for move validation issues
    console.log('Move validation failed:', {
      userMove: move,
      expectedMove: expectedMove,
      currentMoveIndex: currentMoveIndex,
      allSolutionMoves: solutionMoves,
      moveObj: moveObj
    })

    return false
  }, [currentMoveIndex, solutionMoves, game])

  // Get valid moves for a piece on a square (for the side to move)
  const getValidMovesForSquare = useCallback((square: Square): Square[] => {
    try {
      const moves = game.moves({ square, verbose: true })
      return moves.map(move => move.to)
    } catch (error) {
      console.error('Error getting valid moves:', error)
      return []
    }
  }, [game])

  // Get premove destinations for a player's piece when it's NOT their turn
  const getValidPremoveMovesForSquare = useCallback((square: Square): Square[] => {
    try {
      const playerColor = currentOrientation === 'white' ? 'w' : 'b'
      const parts = game.fen().split(' ')
      if (parts.length < 2) return []
      const premoveFen = [parts[0], playerColor, ...parts.slice(2)].join(' ')
      const temp = new Chess(premoveFen)
      const piece = temp.get(square)
      if (!piece || piece.color !== playerColor) return []
      const moves = temp.moves({ square, verbose: true })
      return moves.map(m => m.to)
    } catch (error) {
      console.error('Error getting premove moves:', error)
      return []
    }
  }, [game, currentOrientation])

  // Check if a piece can be dragged (only allow dragging pieces of the active color)
  const isDraggable = useCallback(({ sourceSquare }: { piece: string, sourceSquare: Square }) => {
    if (disabled || isThinking) {
      return false
    }

    const pieceOnSquare = game.get(sourceSquare)
    if (!pieceOnSquare) {
      return false
    }

    // Determine player's color from fixed board orientation
    const playerColor = currentOrientation === 'white' ? 'w' : 'b'

    if (isArrowDuelMode) {
      // Arrow Duel: only allow dragging the side to move; premoves disabled separately
      return pieceOnSquare.color === game.turn()
    }

    if (isPuzzleMode) {
      // Puzzle: allow dragging your own pieces even when it's not your turn (to set premoves)
      return pieceOnSquare.color === playerColor
    }

    // Analysis or other modes: default to side to move
    return pieceOnSquare.color === game.turn()
  }, [game, disabled, isThinking, currentOrientation, isArrowDuelMode, isPuzzleMode])

  // Handle piece drop
  const onDrop = useCallback((sourceSquare: Square, targetSquare: Square) => {
    if (disabled || isThinking) {
      return false
    }

    // Double-check that the piece being moved is the correct color
    const pieceOnSquare = game.get(sourceSquare)
    if (!pieceOnSquare || pieceOnSquare.color !== game.turn()) {
      return false // Don't allow moving opponent's pieces
    }

    const gameCopy = new Chess(game.fen())

    try {
      // Attempt the move
      const move = gameCopy.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: 'q' // Always promote to queen for simplicity
      })

      if (!move) {
        // This shouldn't happen since chess.js throws on invalid moves,
        // but keeping for safety
        console.log('Invalid move attempted:', { from: sourceSquare, to: targetSquare })
        return false
      }

      const moveString = move.san
      const uciMove = sourceSquare + targetSquare + (move.promotion || '')

      // Arrow Duel mode: before completion, restrict to candidate moves.
      // After completion, allow free-play (fall through to analysis-like logic below).
      if (isArrowDuelMode) {
        if (!arrowDuelCompleted) {
          const handled = handleArrowDuelMove(uciMove)
          return handled // handled=true if candidate move executed; false otherwise blocks
        }
        // If arrow duel is completed, we do NOT early-return; continue to free-play logic below
      }

      if (isPuzzleMode) {
        // Puzzle mode logic
        const newUserMoves = [...userMoves, moveString]
        const isCorrect = validateMove(moveString, move)

        // Update state
        setGame(gameCopy)
        setUserMoves(newUserMoves)
        setCurrentMoveIndex(currentMoveIndex + 1)

        // Clear highlights
        setHighlightedSquares({})

        // Notify parent (if callback is provided)
        onMoveAttempt?.(moveString, isCorrect, newUserMoves)

        if (isCorrect) {
          if (!disableMoveHighlighting) {
            // Highlight correct move
            setHighlightedSquares({
              [sourceSquare]: { backgroundColor: 'rgba(34, 197, 94, 0.4)' },
              [targetSquare]: { backgroundColor: 'rgba(34, 197, 94, 0.4)' }
            })
          }

          // Check if puzzle is complete after player's move
          const movesRemaining = solutionMoves.length - (currentMoveIndex + 1)
          console.log('✅ Correct move! Puzzle status:', {
            currentMoveIndex: currentMoveIndex + 1,
            totalMoves: solutionMoves.length,
            movesRemaining,
            isComplete: currentMoveIndex + 1 >= solutionMoves.length
          })

          if (currentMoveIndex + 1 >= solutionMoves.length) {
            console.log('✅ Puzzle completed after player move! Calling onPuzzleComplete(true)')
            setTimeout(() => {
              onPuzzleComplete?.(true, newUserMoves)
            }, 500)
          } else {
            // Make opponent's response move if available
            console.log('🤖 Making opponent response move...')
            setTimeout(() => {
              makeOpponentMove(gameCopy)
            }, PIECE_ANIMATION_MS + 50)
          }
        } else {
          // Highlight incorrect move unless disabled
          if (!disableMoveHighlighting) {
            setHighlightedSquares({
              [sourceSquare]: { backgroundColor: 'rgba(239, 68, 68, 0.6)' },
              [targetSquare]: { backgroundColor: 'rgba(239, 68, 68, 0.6)' }
            })
          }

          console.log('❌ Incorrect move!')

          if (undoWrongMoves) {
            // In mistake review mode, undo the wrong move after showing the error
            setTimeout(() => {
              // Undo the move by reverting to the previous game state
              setGame(new Chess(game.fen()))
              setUserMoves(userMoves) // Keep original user moves
              setCurrentMoveIndex(currentMoveIndex) // Keep original move index
              setHighlightedSquares({}) // Clear highlights
            }, 800)
          } else {
            // In normal mode, fail the puzzle
            setTimeout(() => {
              onPuzzleComplete?.(false, newUserMoves)
            }, 1000)
          }
        }
      } else {
        // Analysis mode logic
        setGame(gameCopy)

        // Highlight the move
        setHighlightedSquares({
          [sourceSquare]: { backgroundColor: 'rgba(59, 130, 246, 0.4)' },
          [targetSquare]: { backgroundColor: 'rgba(59, 130, 246, 0.4)' }
        })

        // Clear highlights after a moment
        setTimeout(() => {
          setHighlightedSquares({})
        }, 1000)

        // Notify parent components
        onPositionChange?.(gameCopy.fen(), moveString)
        onMoveAnalysis?.(moveString)
      }

      return true
    } catch (error) {
      // Handle illegal moves gracefully
      if (error instanceof Error && error.message.includes('Invalid move')) {
        console.log('Illegal move attempted:', {
          from: sourceSquare,
          to: targetSquare,
          error: error.message
        })
        return false
      } else {
        console.error('Unexpected move error:', error)
        return false
      }
    }
  }, [game, disabled, isThinking, userMoves, currentMoveIndex, validateMove, onMoveAttempt, onPuzzleComplete, onPositionChange, onMoveAnalysis, isPuzzleMode, undoWrongMoves, solutionMoves.length])

  // Handle piece moves in Arrow Duel mode - validate against candidate moves
  const handleArrowDuelMove = useCallback((move: string) => {
    if (!isArrowDuelMode || !candidateMoves || arrowDuelCompleted) {
      return false
    }

    // Check if the move matches one of the candidate moves
    const matchingCandidate = candidateMoves.find(candidate => candidate === move)
    
    if (matchingCandidate) {
      setSelectedArrowMove(move)
      setArrowDuelCompleted(true)

      // Execute the move on the board first
      try {
        const gameCopy = new Chess(game.fen())
        const chessMoveObj = gameCopy.move(move)
        if (chessMoveObj) {
          setGame(gameCopy)
          // Inform parent that position changed (so it can clear banners, etc.)
          onPositionChange?.(gameCopy.fen(), move)
        }
      } catch (error) {
        console.error('Failed to execute arrow duel move:', move, error)
      }

      // Determine if the chosen move is correct by comparing to bestMove
      const isCorrect = bestMove ? move === bestMove : false

      // Locally highlight the chosen move green/red for feedback
      try {
        const fromSquare = move.substring(0, 2) as Square
        const toSquare = move.substring(2, 4) as Square
        if (isCorrect) {
          setHighlightedSquares({
            [fromSquare]: { backgroundColor: 'rgba(34, 197, 94, 0.4)' },
            [toSquare]: { backgroundColor: 'rgba(34, 197, 94, 0.4)' }
          })
        } else {
          setHighlightedSquares({
            [fromSquare]: { backgroundColor: 'rgba(239, 68, 68, 0.6)' },
            [toSquare]: { backgroundColor: 'rgba(239, 68, 68, 0.6)' }
          })
        }
        setTimeout(() => setHighlightedSquares({}), 1000)
      } catch {}

      console.log('Arrow Duel Move Analysis:', {
        chosenMove: move,
        bestMove,
        blunderMove,
        isCorrect
      })

      if (onMoveChosen) {
        onMoveChosen(move, isCorrect)
      }

      return true // Handled by Arrow Duel
    }

    return false // Move not in candidates, reject it
  }, [isArrowDuelMode, candidateMoves, arrowDuelCompleted, onMoveChosen, bestMove, setHighlightedSquares])

  // Handle square click for click-to-move functionality
  const onSquareClick = useCallback((square: Square) => {
    if (disabled || isThinking) {
      return
    }

    // Arrow Duel mode: check if clicking on target square of a candidate move
    if (isArrowDuelMode && candidateMoves) {
      const matchingMove = candidateMoves.find(move => move.length >= 4 && move.substring(2, 4) === square)
      if (matchingMove) {
        handleArrowDuelMove(matchingMove)
        return
      }
    }

    const playerColor = currentOrientation === 'white' ? 'w' : 'b'
    const isPlayersTurn = game.turn() === playerColor

    // Regular puzzle/analysis mode
    if (!selectedSquare) {
      const pieceOnSquare = game.get(square)
      if (!pieceOnSquare) return

      // Select own piece always in puzzle mode (even if not your turn) to allow premove
      const canSelectOwnPiece = isPuzzleMode ? pieceOnSquare.color === playerColor : pieceOnSquare.color === game.turn()
      if (canSelectOwnPiece) {
        setSelectedSquare(square)
        const moves = isPlayersTurn ? getValidMovesForSquare(square) : getValidPremoveMovesForSquare(square)
        setValidMoves(moves)
      }
    } else {
      if (square === selectedSquare) {
        setSelectedSquare(null)
        setValidMoves([])
        return
      }

      if (validMoves.includes(square)) {
        if (isPlayersTurn) {
          // Execute normal move
          const success = onDrop(selectedSquare, square)
          if (success) {
            setSelectedSquare(null)
            setValidMoves([])
          }
        } else if (isPuzzleMode) {
          // Set a premove in puzzle mode when it's not the player's turn
          setPremove({ from: selectedSquare, to: square })
          // Subtle highlight handled below via customSquareStyles
          setSelectedSquare(null)
          setValidMoves([])
        }
        return
      }

      // Selecting a different piece
      const pieceOnSquare = game.get(square)
      const canSelectOwnPiece = isPuzzleMode ? pieceOnSquare && pieceOnSquare.color === playerColor : pieceOnSquare && pieceOnSquare.color === game.turn()
      if (canSelectOwnPiece) {
        setSelectedSquare(square)
        const moves = isPlayersTurn ? getValidMovesForSquare(square) : getValidPremoveMovesForSquare(square)
        setValidMoves(moves)
      } else {
        setSelectedSquare(null)
        setValidMoves([])
      }
    }
  }, [disabled, isThinking, selectedSquare, validMoves, game, getValidMovesForSquare, getValidPremoveMovesForSquare, onDrop, isArrowDuelMode, candidateMoves, currentOrientation, isPuzzleMode])

  // Make opponent's response move
  const makeOpponentMove = useCallback((updatedGame: Chess) => {
    const nextMoveIndex = currentMoveIndex + 1

    if (nextMoveIndex >= solutionMoves.length) {
      return
    }

    const opponentMove = solutionMoves[nextMoveIndex]

    try {
      // Create a new game instance from the updated position and make the move
      const gameForMove = new Chess(updatedGame.fen())
      const move = gameForMove.move(opponentMove)
      if (move) {
        setGame(gameForMove)  // Use the instance with the move
        setCurrentMoveIndex(nextMoveIndex + 1)

        // Delay highlighting to not interfere with animation
        setTimeout(() => {
          setHighlightedSquares({
            [move.from]: { backgroundColor: 'rgba(59, 130, 246, 0.4)' },
            [move.to]: { backgroundColor: 'rgba(59, 130, 246, 0.4)' }
          })

          // Clear highlights after a moment
          setTimeout(() => {
            setHighlightedSquares({})
          }, 1000)
        }, PIECE_ANIMATION_MS)

        // Auto-execute premove after opponent move (puzzle mode only)
        setTimeout(() => {
          try {
            if (premove && isPuzzleMode) {
              const pmGame = new Chess(gameForMove.fen())
              const pmMove = pmGame.move({ from: premove.from, to: premove.to, promotion: 'q' })
              if (pmMove) {
                setGame(pmGame)
                setPremove(null)
                // Also advance currentMoveIndex if our premove corresponds to solution step
                setCurrentMoveIndex(prev => prev + 1)
                // Highlight premove briefly
                setHighlightedSquares({
                  [pmMove.from]: { backgroundColor: 'rgba(34, 197, 94, 0.4)' },
                  [pmMove.to]: { backgroundColor: 'rgba(34, 197, 94, 0.4)' }
                })
                setTimeout(() => setHighlightedSquares({}), 1000)
                // If puzzle expects an immediate opponent reply, schedule it
                setTimeout(() => {
                  makeOpponentMove(pmGame)
                }, PIECE_ANIMATION_MS + 50)
              }
            }
          } catch (e) {
            console.error('Failed to apply premove:', e)
          }
        }, PIECE_ANIMATION_MS + 60)

        // Note: Puzzle completion is only checked after player moves, not opponent moves
        // This prevents double-calling onPuzzleComplete
      } else {
        console.error('Opponent move failed (returned null):', opponentMove)
      }
    } catch (error) {
      console.error('Opponent move error:', error)
    }
  }, [currentMoveIndex, solutionMoves, premove, isPuzzleMode])

  // Get legal moves for hints (unused for now)
  // const getLegalMoves = useCallback((): string[] => {
  //   return game.moves()
  // }, [game])

  // Show hint if enabled
  const showHint = useCallback(() => {
    if (!showHints || currentMoveIndex >= solutionMoves.length) {
      return
    }

    const hintMove = solutionMoves[currentMoveIndex]
    try {
      const move = game.move(hintMove)
      if (move) {
        // Highlight hint squares
        setHighlightedSquares({
          [move.from]: { backgroundColor: 'rgba(251, 191, 36, 0.4)' },
          [move.to]: { backgroundColor: 'rgba(251, 191, 36, 0.4)' }
        })

        // Undo the move
        game.undo()

        // Clear hint after 2 seconds
        setTimeout(() => {
          setHighlightedSquares({})
        }, 2000)
      }
    } catch (error) {
      console.error('Hint error:', error)
    }
  }, [game, showHints, currentMoveIndex, solutionMoves])

  // Make a move programmatically (for analysis mode)
  const makeMove = useCallback((moveString: string) => {
    try {
      const gameCopy = new Chess(game.fen())
      const move = gameCopy.move(moveString)

      if (move) {
        setGame(gameCopy)

        // Highlight the move
        setHighlightedSquares({
          [move.from]: { backgroundColor: 'rgba(34, 197, 94, 0.4)' },
          [move.to]: { backgroundColor: 'rgba(34, 197, 94, 0.4)' }
        })

        // Clear highlights after a moment
        setTimeout(() => {
          setHighlightedSquares({})
        }, 1000)

        // Notify parent components
        onPositionChange?.(gameCopy.fen(), move.san)
        // Don't call onMoveAnalysis here to avoid circular calls when making moves programmatically
      }
    } catch (error) {
      console.error('Failed to make move:', moveString, error)
    }
  }, [game, onPositionChange])

  // Reset to original position (for analysis mode)
  const resetPosition = useCallback(() => {
    try {
      const newGame = new Chess(originalFen)
      setGame(newGame)
      setHighlightedSquares({})
      onPositionChange?.(originalFen)
    } catch (error) {
      console.error('Failed to reset position:', error)
    }
  }, [originalFen, onPositionChange])

  // Get current FEN position
  const getCurrentFen = useCallback(() => {
    return game.fen()
  }, [game])

  // Set position directly (for analysis mode move back)
  const setPosition = useCallback((fen: string) => {
    try {
      const newGame = new Chess(fen)
      setGame(newGame)
      setHighlightedSquares({})
      // Don't call onPositionChange here to avoid adding to move history
    } catch (error) {
      console.error('Failed to set position:', fen, error)
    }
  }, [])

  // Highlight move with color coding (for external calls like button clicks)
  const highlightMove = useCallback((move: string, isCorrect: boolean) => {
    if (move.length >= 4) {
      const fromSquare = move.substring(0, 2) as Square
      const toSquare = move.substring(2, 4) as Square
      
      if (isCorrect) {
        // Green highlighting for correct move
        setHighlightedSquares({
          [fromSquare]: { backgroundColor: 'rgba(34, 197, 94, 0.4)' },
          [toSquare]: { backgroundColor: 'rgba(34, 197, 94, 0.4)' }
        })
      } else {
        // Red highlighting for incorrect move
        setHighlightedSquares({
          [fromSquare]: { backgroundColor: 'rgba(239, 68, 68, 0.6)' },
          [toSquare]: { backgroundColor: 'rgba(239, 68, 68, 0.6)' }
        })
      }
      
      // Clear highlights after 1 second
      setTimeout(() => {
        setHighlightedSquares({})
      }, 1000)
    }
  }, [])

  // Expose methods to parent component through ref
  useImperativeHandle(ref, () => ({
    getCurrentFen,
    makeMove,
    resetPosition,
    setPosition,
    highlightMove
  }), [getCurrentFen, makeMove, resetPosition, setPosition, highlightMove])

  // Custom square styles - merge selection highlights with other highlights
  const customSquareStyles = useMemo(() => {
    const styles: Record<string, any> = { ...highlightedSquares }

    // Visualize premove (subtle blue outline)
    if (premove) {
      styles[premove.from] = {
        boxShadow: 'inset 0 0 0 2px rgba(59, 130, 246, 0.6)',
        ...styles[premove.from]
      }
      styles[premove.to] = {
        boxShadow: 'inset 0 0 0 2px rgba(59, 130, 246, 0.6)',
        ...styles[premove.to]
      }
    }

    // Add selection highlights if a square is selected
    if (selectedSquare) {
      styles[selectedSquare] = {
        backgroundColor: 'rgba(59, 130, 246, 0.6)',
        ...styles[selectedSquare] // Preserve any existing styles
      }

      // Add valid move dots (Lichess-style)
      validMoves.forEach(moveSquare => {
        if (!styles[moveSquare]) {
          const pieceOnSquare = game.get(moveSquare as any)
          if (pieceOnSquare) {
            styles[moveSquare] = {
              boxShadow: 'inset 0 0 0 3px rgba(71, 85, 105, 0.7)'
            }
          } else {
            styles[moveSquare] = {
              background: `radial-gradient(circle, rgba(71, 85, 105, 0.7) 15%, transparent 18%)`
            }
          }
        }
      })
    }

    return styles
  }, [highlightedSquares, selectedSquare, validMoves, game, premove])

  return (
    <div ref={containerRef} className="relative w-full h-full flex justify-center items-center">
      <div
        className="relative chessboard-container"
        style={{
          touchAction: 'none',
          // Ensure the board container doesn't exceed viewport bounds
          maxWidth: '100vw',
          maxHeight: '100vh'
        }}
      >
        <Chessboard
          position={game.fen()}
          onPieceDrop={(from, to) => {
            // Clear premove if user makes a direct move
            if (premove && premove.from === from && premove.to === to) setPremove(null)
            return onDrop(from, to)
          }}
          onSquareClick={onSquareClick}
          boardOrientation={currentOrientation}
          customSquareStyles={customSquareStyles}
          customArrows={customArrows}
          arePiecesDraggable={!disabled && !isThinking}
          isDraggablePiece={isDraggable}
          boardWidth={boardSize}
          animationDuration={PIECE_ANIMATION_MS}
          // Enable built-in premoves for drag, but we also handle click-to-move premoves
          arePremovesAllowed={!isArrowDuelMode}
          clearPremovesOnRightClick={true}
          customBoardStyle={{
            borderRadius: typeof window !== 'undefined' && window.innerWidth < 640 ? '8px' : '12px', // Smaller radius on mobile
            boxShadow: typeof window !== 'undefined' && window.innerWidth < 640
              ? '0 4px 12px -2px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
              : '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            border: typeof window !== 'undefined' && window.innerWidth < 640 ? '1px solid rgba(0, 0, 0, 0.1)' : '2px solid rgba(0, 0, 0, 0.1)'
          }}
          customDndBackend={MultiBackend}
          customDndBackendOptions={HYBRID_BACKEND_OPTIONS}
        />
      
      {isThinking && (
        <div className="absolute inset-0 bg-black bg-opacity-20 flex items-center justify-center rounded-lg">
          <div className="bg-white px-4 py-2 rounded-lg shadow-lg">
            <span className="text-sm font-medium">Thinking...</span>
          </div>
        </div>
      )}

        {showHints && (
          <button
            onClick={showHint}
            className="absolute top-2 right-2 bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded text-sm font-medium"
            disabled={disabled || currentMoveIndex >= solutionMoves.length}
          >
            Hint
          </button>
        )}
      </div>
    </div>
  )
})

ChessBoard.displayName = 'ChessBoard'
