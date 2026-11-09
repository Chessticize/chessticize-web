// Stockfish wrapper that mimics the legacy site's Sf167Web interface
class StockfishWrapper {
  constructor() {
    this.engine = null
    this.listeners = []
    this.isReady = false
  }

  async init() {
    if (this.engine) return this.engine

    try {
      if (typeof window !== 'undefined') {
        // Try to load the local Stockfish file first (like legacy site)
        try {
          console.log('Trying to load local Stockfish from /stockfish/sf16-7.js...')

          // Load the script dynamically to avoid build-time resolution issues
          const script = document.createElement('script')
          script.src = '/stockfish/sf16-7.js'

          await new Promise((resolve, reject) => {
            script.onload = () => {
              console.log('Stockfish script loaded successfully')
              // Check immediately if Sf167Web is available
              if (window.Sf167Web) {
                console.log('✓ Sf167Web immediately available after script load')
                resolve()
              } else {
                console.log('Sf167Web not immediately available, waiting briefly...')
                // Reduced delay for faster initialization
                setTimeout(() => {
                  if (window.Sf167Web) {
                    console.log('✓ Sf167Web available after brief delay')
                    resolve()
                  } else {
                    console.log('Sf167Web still not available, continuing to polling check')
                    resolve() // Continue to the polling mechanism
                  }
                }, 100) // Reduced from 300ms to 100ms
              }
            }
            script.onerror = (error) => {
              console.error('Failed to load Stockfish script:', error)
              reject(error)
            }

            // Add script with higher priority
            script.async = false // Load synchronously for faster execution
            document.head.appendChild(script)
          })

          // Wait for Sf167Web to be available on window with optimized timing
          await new Promise((resolve, reject) => {
            let attempts = 0
            const maxAttempts = 20 // Reduced from 50 to 20 (2 seconds max)

            const checkSf167Web = () => {
              attempts++

              if (window.Sf167Web) {
                console.log('✓ Sf167Web found on window object')
                resolve()
              } else if (attempts >= maxAttempts) {
                console.error('Sf167Web not available after timeout. Available properties:',
                  Object.keys(window).filter(k => k.toLowerCase().includes('sf') || k.toLowerCase().includes('stock')))
                reject(new Error('Sf167Web not available after timeout'))
              } else {
                // Use shorter intervals for faster detection
                setTimeout(checkSf167Web, attempts < 5 ? 50 : 100) // 50ms for first 5 attempts, then 100ms
              }
            }
            checkSf167Web()
          })

          // Create engine instance like legacy site: await Sf167Web()
          console.log('Creating Stockfish engine instance...')
          this.engine = await window.Sf167Web()
          console.log('✓ Engine instance created:', this.engine)
          this.isReady = true

          // Set up any stored listeners
          if (this.listeners.length > 0) {
            const callback = this.listeners[this.listeners.length - 1] // Use the latest listener
            this.engine.listen = callback
            console.log('✓ Listener attached to engine')
          }

          console.log('✓ Local Stockfish loaded successfully')
          return this.engine

        } catch (localError) {
          console.error('Local Stockfish loading failed:', localError.message)

          // Try CDN approach as fallback
          try {
            console.log('Trying CDN fallback...')

            const script = document.createElement('script')
            script.src = 'https://cdn.jsdelivr.net/npm/stockfish@16.0.0/src/stockfish.js'

            await new Promise((resolve, reject) => {
              script.onload = resolve
              script.onerror = reject
              document.head.appendChild(script)
            })

            // Wait for Stockfish to be available
            await new Promise((resolve, reject) => {
              let attempts = 0
              const maxAttempts = 50 // 5 seconds

              const checkStockfish = () => {
                attempts++
                if (window.Stockfish) {
                  resolve()
                } else if (attempts >= maxAttempts) {
                  reject(new Error('Stockfish not available after timeout'))
                } else {
                  setTimeout(checkStockfish, 100)
                }
              }
              checkStockfish()
            })

            // Create engine instance
            this.engine = new window.Stockfish()
            this.isReady = true

            // Set up message handling for any stored listeners
            if (this.listeners.length > 0) {
              const callback = this.listeners[this.listeners.length - 1] // Use the latest listener
              this.engine.onmessage = (event) => {
                const message = event.data || event
                callback(message)
              }
            }

            console.log('✓ CDN Stockfish loaded successfully')
            return this.engine

          } catch (cdnError) {
            console.error('CDN loading also failed:', cdnError.message)
            throw new Error('Failed to load Stockfish from both local files and CDN. Please ensure Stockfish files are available.')
          }
        }
      }
    } catch (error) {
      console.error('Failed to initialize Stockfish:', error)
      throw error
    }
  }

  // Legacy site interface: engine.uci(command)
  uci(command) {
    if (this.engine) {
      if (this.engine.uci) {
        // Real Stockfish engine (like legacy site)
        this.engine.uci(command)
      } else if (this.engine.postMessage) {
        // Web Worker style
        this.engine.postMessage(command)
      } else {
        console.warn('Engine does not support UCI commands')
      }
    }
  }

  // Legacy site interface: engine.listen = callback
  set listen(callback) {
    if (this.engine) {
      if (this.engine.listen !== undefined) {
        // Real Stockfish engine (like legacy site)
        this.engine.listen = callback
      } else if (this.engine.onmessage !== undefined) {
        // Web Worker style - set up message handler
        this.engine.onmessage = (event) => {
          const message = event.data || event
          callback(message)
        }
      } else {
        console.warn('Engine does not support message listening')
      }
    } else {
      // Store for later when engine is ready
      this.listeners = [callback]
    }
  }

  // Additional method for adding listeners
  addListener(callback) {
    this.listeners.push(callback)
    if (this.engine) {
      this.listen = callback
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

// Export as default
const createStockfish = () => new StockfishWrapper()
export default createStockfish

// Also make it available globally for compatibility
if (typeof window !== 'undefined') {
  window.StockfishWrapper = StockfishWrapper
  window.Stockfish = window.Stockfish || null
  window.Sf167Web = window.Sf167Web || null
}
