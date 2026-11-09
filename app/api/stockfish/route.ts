import { NextRequest, NextResponse } from 'next/server'

// This would be the server-side Stockfish integration
// For now, we'll return mock data that matches the expected format

export async function POST(request: NextRequest) {
  try {
    const { fen, depth = 15, multiPV = 3 } = await request.json()

    if (!fen) {
      return NextResponse.json({ error: 'FEN position is required' }, { status: 400 })
    }

    // Mock analysis results that match the expected format
    const mockAnalysis = {
      evaluation: 25, // centipawns
      bestMove: 'e2e4',
      depth: depth,
      topLines: [
        {
          moves: ['e2e4', 'e7e5', 'g1f3', 'b8c6', 'f1c4'],
          evaluation: 25,
          depth: depth,
          pv: 'e2e4 e7e5 g1f3 b8c6 f1c4 f8c5 d2d3 d7d6',
          multipv: 1
        },
        {
          moves: ['d2d4', 'd7d5', 'c2c4', 'e7e6', 'b1c3'],
          evaluation: 20,
          depth: depth,
          pv: 'd2d4 d7d5 c2c4 e7e6 b1c3 g8f6 g1f3',
          multipv: 2
        },
        {
          moves: ['g1f3', 'd7d5', 'd2d4', 'g8f6', 'c2c4'],
          evaluation: 15,
          depth: depth,
          pv: 'g1f3 d7d5 d2d4 g8f6 c2c4 c7c6 b1c3',
          multipv: 3
        }
      ],
      currentPosition: fen
    }

    // Simulate some processing time
    await new Promise(resolve => setTimeout(resolve, 500))

    return NextResponse.json(mockAnalysis)

  } catch (error) {
    console.error('Stockfish API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// For future implementation with real Stockfish:
/*
import Stockfish from 'stockfish'

export async function POST(request: NextRequest) {
  try {
    const { fen, depth = 15, multiPV = 3 } = await request.json()

    if (!fen) {
      return NextResponse.json({ error: 'FEN position is required' }, { status: 400 })
    }

    // Create Stockfish engine
    const engine = new Stockfish()
    
    return new Promise((resolve) => {
      const topLinesMap = new Map()
      let currentDepth = 0
      let bestMove = ''
      let mainEvaluation = 0

      engine.onmessage = (event) => {
        const line = event.data || event

        if (line.startsWith('info')) {
          // Parse depth
          const depthMatch = line.match(/depth (\d+)/)
          if (depthMatch) {
            currentDepth = parseInt(depthMatch[1])
          }

          // Parse MultiPV line number
          const multipvMatch = line.match(/multipv (\d+)/)
          const multipv = multipvMatch ? parseInt(multipvMatch[1]) : 1

          // Parse evaluation
          const scoreMatch = line.match(/score (cp|mate) (-?\d+)/)
          let evaluation = 0
          if (scoreMatch) {
            const scoreType = scoreMatch[1]
            const rawScore = parseFloat(scoreMatch[2])

            if (scoreType === 'cp') {
              evaluation = rawScore
            } else if (scoreType === 'mate') {
              evaluation = rawScore > 0 ? 10000 : -10000
            }
          }

          // Parse principal variation
          const pvMatch = line.match(/pv (.+)/)
          if (pvMatch && currentDepth > 0) {
            const moves = pvMatch[1].split(' ').slice(0, 6)
            const pv = pvMatch[1]

            topLinesMap.set(multipv, {
              moves,
              evaluation,
              depth: currentDepth,
              pv: pv.substring(0, 80) + (pv.length > 80 ? '...' : ''),
              multipv
            })

            if (multipv === 1) {
              mainEvaluation = evaluation
              bestMove = moves[0] || ''
            }
          }
        } else if (line.startsWith('bestmove')) {
          const bestMoveMatch = line.match(/bestmove (\S+)/)
          if (bestMoveMatch) {
            bestMove = bestMoveMatch[1]
          }

          const sortedLines = Array.from(topLinesMap.values())
            .sort((a, b) => a.multipv - b.multipv)
            .slice(0, 3)

          const result = {
            evaluation: mainEvaluation,
            bestMove,
            depth: currentDepth,
            topLines: sortedLines,
            currentPosition: fen
          }

          engine.terminate()
          resolve(NextResponse.json(result))
        }
      }

      // Initialize engine and start analysis
      engine.postMessage('uci')
      engine.postMessage('isready')
      engine.postMessage(`setoption name MultiPV value ${multiPV}`)
      engine.postMessage(`position fen ${fen}`)
      engine.postMessage(`go depth ${depth}`)

      // Timeout after 30 seconds
      setTimeout(() => {
        engine.postMessage('stop')
        setTimeout(() => {
          engine.terminate()
          resolve(NextResponse.json({ error: 'Analysis timeout' }, { status: 408 }))
        }, 1000)
      }, 30000)
    })

  } catch (error) {
    console.error('Stockfish API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
*/
