import React from 'react'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { Chess } from 'chess.js'
import { ChessBoard } from '@/components/puzzle-sprint/ChessBoard'
import { isStagingHostname } from '@/lib/staging'
import { STAGING_REGRESSION_PUZZLES } from '@/lib/regression-puzzles'

let capturedChessboardProps: Record<string, any> = {}

vi.mock('react-chessboard', () => ({
  Chessboard: (props: Record<string, any>) => {
    capturedChessboardProps = props
    return <div data-testid="mock-react-chessboard" data-position={props.position} />
  },
}))

vi.mock('@/hooks/useBoardTheme', () => ({
  useBoardTheme: () => ({
    boardTheme: {
      id: 'classic',
      name: 'Classic',
      lightSquare: '#F0D9B5',
      darkSquare: '#B58863',
    },
  }),
}))

describe('isStagingHostname', () => {
  it('enables regression suite on staging, preview, and localhost only', () => {
    expect(isStagingHostname('staging.chessticize.com')).toBe(true)
    expect(isStagingHostname('localhost')).toBe(true)
    expect(isStagingHostname('127.0.0.1')).toBe(true)
    expect(isStagingHostname('chessticize-preview.vercel.app')).toBe(true)
  })

  it('strictly disables regression suite on production hosts', () => {
    expect(isStagingHostname('chessticize.com')).toBe(false)
    expect(isStagingHostname('www.chessticize.com')).toBe(false)
    expect(isStagingHostname('')).toBe(false)
  })
})

describe('STAGING_REGRESSION_PUZZLES', () => {
  it('contains only legal chess positions and move lines', () => {
    for (const sample of STAGING_REGRESSION_PUZZLES) {
      if (sample.mode === 'regular') {
        const chess = new Chess(sample.fen)
        for (const uci of sample.solutionMoves) {
          const move = chess.move({
            from: uci.slice(0, 2),
            to: uci.slice(2, 4),
            ...(uci[4] ? { promotion: uci[4] } : {}),
          })
          expect(move, `Expected ${uci} to be legal in ${sample.id}`).toBeTruthy()
        }
      } else {
        expect(sample.candidateMoves?.length).toBe(2)
        for (const uci of sample.candidateMoves ?? []) {
          const chess = new Chess(sample.fen)
          const move = chess.move({
            from: uci.slice(0, 2),
            to: uci.slice(2, 4),
            ...(uci[4] ? { promotion: uci[4] } : {}),
          })
          expect(move, `Expected candidate ${uci} to be legal in ${sample.id}`).toBeTruthy()
        }
      }
    }
  })
})

describe('ChessBoard Promotion Support', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    capturedChessboardProps = {}
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('opens 4-piece promotion picker on click-to-move and validates Knight underpromotion', async () => {
    const onMoveAttempt = vi.fn()
    const onPuzzleComplete = vi.fn()

    // White pawn on d7 ready to promote to Knight after Black's auto-move e3d2
    render(
      <ChessBoard
        fen="8/2KP4/4k3/4p1p1/4P1P1/4bP2/8/8 b - - 0 69"
        solutionMoves={['e3d2', 'd7d8n']}
        mode="puzzle"
        onMoveAttempt={onMoveAttempt}
        onPuzzleComplete={onPuzzleComplete}
      />,
    )

    // Advance past opponent's first move (e3d2) and flush async microtask
    await act(async () => {
      await vi.advanceTimersByTimeAsync(600)
    })

    // Click d7 then d8
    act(() => {
      capturedChessboardProps.onSquareClick('d7')
    })
    act(() => {
      capturedChessboardProps.onSquareClick('d8')
    })

    expect(screen.getByTestId('promotion-picker')).toBeInTheDocument()
    expect(screen.getByTestId('promotion-option-q')).toBeInTheDocument()
    expect(screen.getByTestId('promotion-option-r')).toBeInTheDocument()
    expect(screen.getByTestId('promotion-option-b')).toBeInTheDocument()
    expect(screen.getByTestId('promotion-option-n')).toBeInTheDocument()

    // Choose Knight underpromotion
    fireEvent.click(screen.getByTestId('promotion-option-n'))

    expect(screen.queryByTestId('promotion-picker')).not.toBeInTheDocument()
    expect(onMoveAttempt).toHaveBeenCalledWith('d8=N+', true, ['d8=N+'])

    await act(async () => {
      await vi.advanceTimersByTimeAsync(600)
    })
    expect(onPuzzleComplete).toHaveBeenCalledWith(true, ['d8=N+'])
  })

  it('rejects Queen when Knight underpromotion is required', async () => {
    const onMoveAttempt = vi.fn()

    render(
      <ChessBoard
        fen="8/2KP4/4k3/4p1p1/4P1P1/4bP2/8/8 b - - 0 69"
        solutionMoves={['e3d2', 'd7d8n']}
        mode="puzzle"
        onMoveAttempt={onMoveAttempt}
      />,
    )

    await act(async () => {
      await vi.advanceTimersByTimeAsync(600)
    })

    // Drag d7 -> d8
    act(() => {
      capturedChessboardProps.onPieceDrop('d7', 'd8')
    })

    expect(screen.getByTestId('promotion-picker')).toBeInTheDocument()
    fireEvent.click(screen.getByTestId('promotion-option-q'))

    expect(onMoveAttempt).toHaveBeenCalledWith('d8=Q', false, ['d8=Q'])
  })

  it('handles Arrow Duel same-square Q vs N promotion with badge and 2-piece picker', () => {
    const onMoveChosen = vi.fn()

    render(
      <ChessBoard
        fen="4r3/7R/k1p5/p7/1pP3P1/1Pb5/P3pBKP/8 b - - 0 1"
        mode="arrowduel"
        candidateMoves={['e2e1q', 'e2e1n']}
        bestMove="e2e1n"
        blunderMove="e2e1q"
        onMoveChosen={onMoveChosen}
      />,
    )

    // Badge shows Q/N on target square e1
    expect(screen.getByTestId('arrow-promotion-badge-e1')).toHaveTextContent('Q/N')

    // Tap target square e1 -> opens 2-piece picker (Queen vs Knight)
    act(() => {
      capturedChessboardProps.onSquareClick('e1')
    })

    expect(screen.getByTestId('promotion-picker')).toBeInTheDocument()
    expect(screen.getByTestId('promotion-option-q')).toBeInTheDocument()
    expect(screen.getByTestId('promotion-option-n')).toBeInTheDocument()
    expect(screen.queryByTestId('promotion-option-r')).not.toBeInTheDocument()
    expect(screen.queryByTestId('promotion-option-b')).not.toBeInTheDocument()

    // Select Knight
    fireEvent.click(screen.getByTestId('promotion-option-n'))

    expect(onMoveChosen).toHaveBeenCalledWith('e2e1n', true)
  })

  it('handles Arrow Duel single promotion arrow with =R badge and direct tap selection', () => {
    const onMoveChosen = vi.fn()

    render(
      <ChessBoard
        fen="4k3/R3P3/1p3Kpp/2p5/2P5/1r6/4p1P1/8 b - - 0 1"
        mode="arrowduel"
        candidateMoves={['b3e3', 'e2e1r']}
        bestMove="e2e1r"
        blunderMove="b3e3"
        onMoveChosen={onMoveChosen}
      />,
    )

    expect(screen.getByTestId('arrow-promotion-badge-e1')).toHaveTextContent('=R')

    act(() => {
      capturedChessboardProps.onSquareClick('e1')
    })

    expect(onMoveChosen).toHaveBeenCalledWith('e2e1r', true)
  })
})
