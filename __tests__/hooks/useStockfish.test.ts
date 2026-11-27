import { act, renderHook, waitFor } from '@testing-library/react'
import { useStockfish, terminateGlobalStockfishEngine } from '@/hooks/useStockfish'
import { vi } from 'vitest'

interface FakeWorkerInstance {
  url: string
  commands: string[]
  onmessage: ((event: { data: string }) => void) | null
  onerror: ((event: { message: string }) => void) | null
  postMessage: ReturnType<typeof vi.fn>
  terminate: ReturnType<typeof vi.fn>
  emit: (line: string) => void
}

function createFakeWorkerClass(options?: { autoRespond?: boolean }) {
  const autoRespond = options?.autoRespond ?? true
  const instances: FakeWorkerInstance[] = []

  class FakeWorker implements FakeWorkerInstance {
    url: string
    commands: string[] = []
    onmessage: ((event: { data: string }) => void) | null = null
    onerror: ((event: { message: string }) => void) | null = null
    postMessage = vi.fn((command: string) => {
      this.commands.push(command)
      if (!autoRespond) return
      if (command === 'uci') {
        setTimeout(() => this.emit('uciok'), 0)
      } else if (command === 'isready') {
        setTimeout(() => this.emit('readyok'), 0)
      } else if (command.startsWith('go depth')) {
        setTimeout(() => {
          this.emit(
            'info depth 10 seldepth 12 multipv 1 score cp 35 nodes 10000 nps 500000 pv e2e4 e7e5 g1f3'
          )
          this.emit('bestmove e2e4 ponder e7e5')
        }, 0)
      }
    })
    terminate = vi.fn()

    constructor(url: string) {
      this.url = url
      instances.push(this)
    }

    emit(line: string) {
      this.onmessage?.({ data: line })
    }
  }

  return { FakeWorker, instances }
}

describe('useStockfish', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    terminateGlobalStockfishEngine()
    Object.defineProperty(window, 'crossOriginIsolated', {
      configurable: true,
      value: false,
    })
    ;(window as unknown as { Sf167Web?: unknown }).Sf167Web = undefined
    const { FakeWorker } = createFakeWorkerClass()
    global.Worker = FakeWorker as unknown as typeof Worker
  })

  afterEach(() => {
    terminateGlobalStockfishEngine()
  })

  it('should initialize with default analysis state', () => {
    const { result } = renderHook(() => useStockfish())

    expect(result.current.analysis).toEqual({
      evaluation: 0,
      bestMove: '',
      depth: 0,
      isAnalyzing: false,
      topLines: [],
      currentPosition: ''
    })
  })

  it('should provide analysis functions', () => {
    const { result } = renderHook(() => useStockfish())

    expect(typeof result.current.analyzePosition).toBe('function')
    expect(typeof result.current.stopAnalysis).toBe('function')
    expect(typeof result.current.initEngine).toBe('function')
    expect(typeof result.current.isEngineReady).toBe('boolean')
  })

  it('should handle stop analysis call', () => {
    const { result } = renderHook(() => useStockfish())

    expect(() => {
      act(() => {
        result.current.stopAnalysis()
      })
    }).not.toThrow()

    expect(result.current.analysis.isAnalyzing).toBe(false)
  })

  it('should fall back to single-threaded local worker when crossOriginIsolated is false', async () => {
    const { FakeWorker, instances } = createFakeWorkerClass()
    global.Worker = FakeWorker as unknown as typeof Worker

    const { result } = renderHook(() => useStockfish())
    const startFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

    await act(async () => {
      await result.current.analyzePosition(startFen, 10)
    })

    await waitFor(() => {
      expect(result.current.analysis.depth).toBe(10)
      expect(result.current.analysis.isAnalyzing).toBe(false)
    })

    expect(instances).toHaveLength(1)
    expect(instances[0].url).toBe('/stockfish/stockfish-nnue-16-single.js')
    expect(instances[0].commands).toContain('setoption name Use NNUE value false')
    expect(result.current.analysis.bestMove).toBe('e2e4')
    expect(result.current.analysis.topLines[0].moves).toEqual(['e4', 'e5', 'Nf3'])
    expect(result.current.analysis.evaluation).toBe(35)
  })

  it('should fall back to single-threaded worker if threaded Sf167Web initialization fails', async () => {
    Object.defineProperty(window, 'crossOriginIsolated', {
      configurable: true,
      value: true,
    })
    ;(window as unknown as { Sf167Web?: unknown }).Sf167Web = vi.fn().mockRejectedValue(
      new Error('SharedArrayBuffer allocation failed')
    )

    const { FakeWorker, instances } = createFakeWorkerClass()
    global.Worker = FakeWorker as unknown as typeof Worker

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { result } = renderHook(() => useStockfish())
    const startFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

    await act(async () => {
      await result.current.analyzePosition(startFen, 10)
    })

    await waitFor(() => {
      expect(result.current.analysis.depth).toBe(10)
      expect(result.current.analysis.isAnalyzing).toBe(false)
    })

    expect(instances).toHaveLength(1)
    expect(instances[0].url).toBe('/stockfish/stockfish-nnue-16-single.js')
    expect(result.current.analysis.error).toBeUndefined()
    warnSpy.mockRestore()
  })

  it('should ignore stale engine output before readyok when switching positions', async () => {
    const { FakeWorker, instances } = createFakeWorkerClass({ autoRespond: false })
    global.Worker = FakeWorker as unknown as typeof Worker

    const { result } = renderHook(() => useStockfish())
    const fen = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1'

    let analyzePromise: Promise<void>
    act(() => {
      analyzePromise = result.current.analyzePosition(fen, 12)
    })

    // Boot handshake
    await waitFor(() => expect(instances).toHaveLength(1))
    const worker = instances[0]
    await waitFor(() => expect(worker.commands).toContain('uci'))
    act(() => worker.emit('uciok'))
    await waitFor(() => expect(worker.commands).toContain('isready'))
    act(() => worker.emit('readyok'))

    await act(async () => {
      await analyzePromise!
    })

    // Stale output from an earlier search arrives BEFORE the search-sync readyok
    act(() => {
      worker.emit('info depth 14 multipv 1 score cp 999 pv d2d4 d7d5')
      worker.emit('bestmove d2d4')
    })

    // Stale output must be ignored and analysis must still be waiting
    expect(result.current.analysis.depth).toBe(0)
    expect(result.current.analysis.isAnalyzing).toBe(true)

    // Now the engine acknowledges readyok and emits real output for `fen` (black to move)
    act(() => {
      worker.emit('readyok')
      worker.emit('info depth 12 multipv 1 score cp -20 pv e7e5 g1f3')
      worker.emit('bestmove e7e5')
    })

    expect(result.current.analysis.depth).toBe(12)
    expect(result.current.analysis.bestMove).toBe('e7e5')
    // Black-to-move -20cp flips to +20cp from White's perspective
    expect(result.current.analysis.evaluation).toBe(20)
    expect(result.current.analysis.isAnalyzing).toBe(false)
  })

  it('should handle race condition gracefully', () => {
    const { result } = renderHook(() => useStockfish())

    expect(() => {
      act(() => {
        result.current.analyzePosition('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', 10)
        result.current.analyzePosition('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1', 10)
        result.current.analyzePosition('rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 2', 10)
      })
    }).not.toThrow()

    expect(result.current.analysis).toBeDefined()
    expect(typeof result.current.analysis.isAnalyzing).toBe('boolean')
  })
})
