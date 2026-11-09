"use client"

import React from 'react'
import { Chess } from 'chess.js'
import { Button } from '@/components/ui/button'
import { Crown, Target } from 'lucide-react'

interface ArrowDuelMoveSelectorProps {
  candidateMoves: [string, string] // [move1, move2] in randomized order
  onMoveChosen: (move: string, isCorrect: boolean) => void
  disabled?: boolean
  selectedMove?: string
  bestMove?: string // To determine which move is correct
  blunderMove?: string // To determine which move is incorrect
}

// Helper function to convert UCI move to readable notation
function convertUciToSan(uciMove: string, fen: string): string {
  try {
    const game = new Chess(fen)
    const move = game.move(uciMove)
    return move ? move.san : uciMove
  } catch {
    // Fallback: format UCI move in a readable way
    if (uciMove.length >= 4) {
      const from = uciMove.substring(0, 2)
      const to = uciMove.substring(2, 4)
      const promotion = uciMove.length > 4 ? `=${uciMove[4].toUpperCase()}` : ''
      return `${from}-${to}${promotion}`
    }
    return uciMove
  }
}

export function ArrowDuelMoveSelector({ 
  candidateMoves, 
  onMoveChosen, 
  disabled = false,
  selectedMove,
  bestMove,
  blunderMove
}: ArrowDuelMoveSelectorProps) {
  if (!candidateMoves || candidateMoves.length !== 2) {
    return (
      <div className="mx-2 sm:mx-4 p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-700 text-sm text-center">
          Error: Invalid candidate moves data
        </p>
        <p className="text-red-600 text-xs text-center mt-1">
          Expected 2 moves, got {candidateMoves?.length || 0}
        </p>
      </div>
    )
  }

  const [move1, move2] = candidateMoves

  return (
    <div className="mx-2 sm:mx-4">
      <div className="bg-white/95 backdrop-blur rounded-lg p-2 sm:p-3 shadow-lg border">
        <div className="grid grid-cols-2 gap-2 sm:gap-3">
          {/* Option A */}
          <Button
            onClick={() => {
              const isCorrect = bestMove ? move1 === bestMove : false
              onMoveChosen(move1, isCorrect)
            }}
            disabled={disabled || !!selectedMove}
            variant={selectedMove === move1 ? "default" : "outline"}
            size="sm"
            className={`h-auto p-1.5 sm:p-2 flex flex-col items-center space-y-0.5 transition-all ${
              selectedMove === move1
                ? (bestMove && move1 === bestMove ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600') + ' text-white'
                : selectedMove
                ? 'opacity-50 cursor-not-allowed'
                : 'hover:bg-blue-50 hover:border-blue-300 border-blue-200'
            }`}
          >
            <div className="flex items-center space-x-1">
              <Target className="h-3 w-3" />
              <span className="font-bold text-xs">A</span>
            </div>
            <div className="text-center">
              <div className="font-mono text-xs sm:text-sm font-semibold">
                {convertUciToSan(move1, '')}
              </div>
              <div className="text-xs opacity-75">
                {selectedMove === move1 ? 'Selected' : 'Choose'}
              </div>
            </div>
          </Button>

          {/* Option B */}
          <Button
            onClick={() => {
              const isCorrect = bestMove ? move2 === bestMove : false
              onMoveChosen(move2, isCorrect)
            }}
            disabled={disabled || !!selectedMove}
            variant={selectedMove === move2 ? "default" : "outline"}
            size="sm"
            className={`h-auto p-1.5 sm:p-2 flex flex-col items-center space-y-0.5 transition-all ${
              selectedMove === move2
                ? (bestMove && move2 === bestMove ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600') + ' text-white'
                : selectedMove
                ? 'opacity-50 cursor-not-allowed'
                : 'hover:bg-blue-50 hover:border-blue-300 border-blue-200'
            }`}
          >
            <div className="flex items-center space-x-1">
              <Crown className="h-3 w-3" />
              <span className="font-bold text-xs">B</span>
            </div>
            <div className="text-center">
              <div className="font-mono text-xs sm:text-sm font-semibold">
                {convertUciToSan(move2, '')}
              </div>
              <div className="text-xs opacity-75">
                {selectedMove === move2 ? 'Selected' : 'Choose'}
              </div>
            </div>
          </Button>
        </div>

        {/* Feedback after selection */}
        {selectedMove && bestMove && (
          <div className="mt-2 text-center text-xs">
            {selectedMove === bestMove ? (
              <div className="text-green-700 bg-green-50 p-1 rounded">
                ✅ Correct!
              </div>
            ) : (
              <div className="text-red-700 bg-red-50 p-1 rounded">
                ❌ Not quite
              </div>
            )}
          </div>
        )}
      </div>

    </div>
  )
}