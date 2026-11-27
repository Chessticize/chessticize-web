// Stockfish wrapper providing a consistent { uci, listen, terminate } engine interface.
// Prefers multi-threaded sf16-7.js when cross-origin isolation (SharedArrayBuffer) is active,
// and falls back to the bundled single-threaded stockfish-nnue-16-single.js Web Worker
// whenever cross-origin isolation is unavailable (e.g. SPA navigation from / or /auth)
// or multi-threaded pthread initialization fails/times out (e.g. mobile Safari memory limits).

const SF16_THREADED_SCRIPT = '/stockfish/sf16-7.js'
const SF16_SINGLE_WORKER = '/stockfish/stockfish-nnue-16-single.js'
const THREADED_INIT_TIMEOUT_MS = 2000
const WORKER_INIT_TIMEOUT_MS = 6000

let threadedScriptLoadPromise = null

function canUseThreadedEngine() {
  return (
    typeof window !== 'undefined' &&
    window.crossOriginIsolated === true &&
    typeof SharedArrayBuffer !== 'undefined'
  )
}

function withTimeout(promise, timeoutMs, message) {
  let timer = null
  const timeoutPromise = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(message)), timeoutMs)
  })
  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timer) clearTimeout(timer)
  })
}

function loadThreadedScript() {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Stockfish requires a browser environment'))
  }

  if (typeof window.Sf167Web === 'function') {
    return Promise.resolve(window.Sf167Web)
  }

  if (threadedScriptLoadPromise) {
    return threadedScriptLoadPromise
  }

  threadedScriptLoadPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${SF16_THREADED_SCRIPT}"]`)

    const waitForGlobal = () => {
      let attempts = 0
      const maxAttempts = 20
      const check = () => {
        attempts++
        if (typeof window.Sf167Web === 'function') {
          resolve(window.Sf167Web)
        } else if (attempts >= maxAttempts) {
          threadedScriptLoadPromise = null
          reject(new Error('Sf167Web not available after script load'))
        } else {
          setTimeout(check, attempts < 5 ? 50 : 100)
        }
      }
      check()
    }

    if (existing) {
      waitForGlobal()
      return
    }

    const script = document.createElement('script')
    script.src = SF16_THREADED_SCRIPT
    script.async = true
    script.onload = waitForGlobal
    script.onerror = () => {
      script.remove()
      threadedScriptLoadPromise = null
      reject(new Error(`Failed to load ${SF16_THREADED_SCRIPT}`))
    }
    document.head.appendChild(script)
  })

  return threadedScriptLoadPromise
}

function normalizeEngine(rawEngine, onTerminate) {
  let currentListener = null

  const dispatch = (raw) => {
    if (!currentListener) return
    const text = typeof raw === 'string' ? raw : raw?.data ?? String(raw ?? '')
    for (const line of text.split(/\r?\n/)) {
      if (line) currentListener(line)
    }
  }

  if (typeof rawEngine.uci === 'function') {
    rawEngine.listen = dispatch
    return {
      uci(command) {
        rawEngine.uci(command)
      },
      get listen() {
        return currentListener
      },
      set listen(callback) {
        currentListener = typeof callback === 'function' ? callback : null
        rawEngine.listen = dispatch
      },
      terminate() {
        currentListener = null
        rawEngine.listen = null
        if (typeof rawEngine.terminate === 'function') {
          rawEngine.terminate()
        }
        onTerminate?.()
      },
    }
  }

  if (typeof rawEngine.postMessage === 'function') {
    rawEngine.onmessage = (event) => dispatch(event?.data ?? event)
    return {
      uci(command) {
        rawEngine.postMessage(command)
      },
      get listen() {
        return currentListener
      },
      set listen(callback) {
        currentListener = typeof callback === 'function' ? callback : null
      },
      terminate() {
        currentListener = null
        rawEngine.onmessage = null
        if (typeof rawEngine.terminate === 'function') {
          rawEngine.terminate()
        }
        onTerminate?.()
      },
    }
  }

  throw new Error('Stockfish engine does not expose a supported UCI interface')
}

function waitForUciOk(engine, timeoutMs) {
  return withTimeout(
    new Promise((resolve) => {
      const prevListen = engine.listen
      engine.listen = (line) => {
        if (typeof prevListen === 'function') prevListen(line)
        if (line === 'uciok' || line.startsWith('uciok')) {
          engine.listen = prevListen
          resolve(engine)
        }
      }
      engine.uci('uci')
    }),
    timeoutMs,
    'Stockfish UCI handshake timed out'
  )
}

async function initThreadedEngine() {
  const Sf167Web = await withTimeout(
    loadThreadedScript(),
    THREADED_INIT_TIMEOUT_MS,
    'Timed out loading Stockfish threaded script'
  )

  const rawEngine = await withTimeout(
    Sf167Web(),
    THREADED_INIT_TIMEOUT_MS,
    'Timed out initializing Stockfish threaded WASM workers'
  )

  const adapter = normalizeEngine(rawEngine)
  try {
    await waitForUciOk(adapter, THREADED_INIT_TIMEOUT_MS)
    return adapter
  } catch (error) {
    adapter.terminate()
    throw error
  }
}

async function initSingleThreadedWorker() {
  if (typeof Worker === 'undefined') {
    throw new Error('Web Workers are not supported in this browser')
  }

  const worker = new Worker(SF16_SINGLE_WORKER)

  try {
    const adapter = normalizeEngine(worker)

    await withTimeout(
      new Promise((resolve, reject) => {
        const handleError = (event) => {
          const message = event?.message || 'Stockfish worker failed to load'
          reject(new Error(message))
        }
        worker.addEventListener?.('error', handleError, { once: true })
        worker.onerror = handleError

        adapter.listen = (line) => {
          if (line === 'uciok' || line.startsWith('uciok')) {
            worker.onerror = null
            adapter.listen = null
            resolve()
          }
        }

        adapter.uci('uci')
      }),
      WORKER_INIT_TIMEOUT_MS,
      'Timed out initializing single-threaded Stockfish worker'
    )

    // The bundled single-threaded build does not ship the 40MB NNUE weights file;
    // explicitly switch to Stockfish 16 classical eval for immediate, reliable analysis.
    adapter.uci('setoption name Use NNUE value false')
    return adapter
  } catch (error) {
    worker.terminate()
    throw error
  }
}

class StockfishWrapper {
  constructor() {
    this.engine = null
    this.listeners = []
    this.isReady = false
  }

  async init() {
    if (this.engine) return this.engine

    if (typeof window === 'undefined') {
      throw new Error('Stockfish can only be initialized in the browser')
    }

    let threadedError = null
    if (canUseThreadedEngine()) {
      try {
        this.engine = await initThreadedEngine()
      } catch (error) {
        threadedError = error
        console.warn(
          'Multi-threaded Stockfish unavailable, falling back to single-threaded worker:',
          error instanceof Error ? error.message : error
        )
      }
    }

    if (!this.engine) {
      try {
        this.engine = await initSingleThreadedWorker()
      } catch (workerError) {
        const detail = threadedError
          ? `threaded: ${threadedError.message}; single-threaded: ${workerError.message}`
          : workerError.message
        throw new Error(`Failed to initialize Stockfish engine (${detail})`)
      }
    }

    this.isReady = true

    if (this.listeners.length > 0) {
      this.engine.listen = this.listeners[this.listeners.length - 1]
    }

    return this.engine
  }

  uci(command) {
    if (this.engine) {
      this.engine.uci(command)
    }
  }

  set listen(callback) {
    if (this.engine) {
      this.engine.listen = callback
    } else {
      this.listeners = callback ? [callback] : []
    }
  }

  addListener(callback) {
    this.listeners.push(callback)
    if (this.engine) {
      this.engine.listen = callback
    }
  }

  terminate() {
    if (this.engine && this.engine.terminate) {
      this.engine.terminate()
    }
    this.listeners = []
    this.engine = null
    this.isReady = false
  }
}

const createStockfish = () => new StockfishWrapper()
export default createStockfish

if (typeof window !== 'undefined') {
  window.StockfishWrapper = StockfishWrapper
}
