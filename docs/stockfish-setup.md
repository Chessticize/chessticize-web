# Stockfish Integration Setup

This document explains how Stockfish is integrated into the Chessticize application and how to resolve common issues.

## Overview

Stockfish is integrated using the local implementation from the legacy site, located in `components/stockfish/`. The engine is used for:

- Interactive analysis in mistake review screens
- Real-time position evaluation
- Multi-PV (Principal Variation) analysis

## Cross-Origin Isolation Requirements

Stockfish uses `SharedArrayBuffer` for performance, which requires cross-origin isolation to be enabled in modern browsers.

### Required Headers

The following headers must be set by the server:

```
Cross-Origin-Embedder-Policy: require-corp
Cross-Origin-Opener-Policy: same-origin
```

These headers are configured in `next.config.mjs`:

```javascript
async headers() {
  return [
    {
      source: '/(.*)',
      headers: [
        {
          key: 'Cross-Origin-Embedder-Policy',
          value: 'require-corp',
        },
        {
          key: 'Cross-Origin-Opener-Policy',
          value: 'same-origin',
        },
      ],
    },
  ]
},
```

### Verification

You can verify that cross-origin isolation is working by checking:

```javascript
console.log('Cross-origin isolated:', window.crossOriginIsolated)
```

This should return `true` when the headers are properly configured.

## Common Issues and Solutions

### DataCloneError: SharedArrayBuffer transfer requires self.crossOriginIsolated

**Error:**
```
Uncaught (in promise) DataCloneError: Failed to execute 'postMessage' on 'Worker': SharedArrayBuffer transfer requires self.crossOriginIsolated.
```

**Solution:**
Ensure the cross-origin isolation headers are properly configured in `next.config.mjs` as shown above.

### Circular Dependency Warnings

**Warning:**
```
⚠ Circular dependency between chunks with runtime (em-pthread, webpack)
```

**Solution:**
These warnings are suppressed in the webpack configuration:

```javascript
webpack: (config, { isServer }) => {
  config.ignoreWarnings = [
    ...(config.ignoreWarnings || []),
    {
      module: /sf16-7\.js/,
      message: /Circular dependency/,
    },
    {
      module: /em-pthread/,
      message: /Circular dependency/,
    },
  ]
  return config
}
```

### WASM Loading Issues

**Solution:**
WebAssembly support is enabled in the webpack configuration:

```javascript
config.experiments = {
  ...config.experiments,
  asyncWebAssembly: true,
}

config.module.rules.push({
  test: /\.wasm$/,
  type: 'webassembly/async',
})
```

## File Structure

```
components/stockfish/
├── sf16-7.js      # Stockfish engine JavaScript
└── sf16-7.wasm    # Stockfish WebAssembly binary
```

## Usage

The Stockfish engine is accessed through the `useStockfish` hook:

```typescript
import { useStockfish } from '@/hooks/useStockfish'

function MyComponent() {
  const { analysis, analyzePosition, stopAnalysis } = useStockfish()
  
  // Analyze a position
  analyzePosition('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', 20)
  
  // Access analysis results
  console.log('Evaluation:', analysis.evaluation)
  console.log('Best move:', analysis.bestMove)
  console.log('Top lines:', analysis.topLines)
}
```

## Components Using Stockfish

- `MistakeReview`: Interactive mistake review with analysis
- `InteractiveAnalysis`: Real-time Stockfish analysis component
- `ChessBoard`: Unified chess board component with both puzzle solving and analysis modes

## Development Notes

- Stockfish is dynamically imported to avoid SSR issues
- The engine initialization is handled asynchronously
- Analysis is performed with configurable depth limits
- Multi-PV analysis provides top 3 engine lines
- Proper cleanup is implemented to prevent memory leaks
