/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
  },
  // Proxy Firebase Auth handler paths on the same origin so iOS Safari / Chrome
  // (WebKit storage partitioning) can complete OAuth without cross-site state loss.
  async rewrites() {
    const firebaseProjectId =
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'chessticize'
    return [
      {
        source: '/__/auth/:path*',
        destination: `https://${firebaseProjectId}.firebaseapp.com/__/auth/:path*`,
      },
      {
        source: '/__/firebase/init.json',
        destination: '/api/firebase-init',
      },
    ]
  },
  // Headers configuration
  async headers() {
    return [
      {
        // Immutable cache for content-hashed Next.js build assets
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
          {
            key: 'Cross-Origin-Resource-Policy',
            value: 'same-origin',
          },
        ],
      },
      {
        // Static Stockfish engine & worker assets must send COEP + CORP so dedicated
        // workers spawned from cross-origin-isolated pages are not blocked by COEP.
        source: '/stockfish/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400, stale-while-revalidate=604800',
          },
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: 'require-corp',
          },
          {
            key: 'Cross-Origin-Resource-Policy',
            value: 'same-origin',
          },
        ],
      },
      {
        // Cache app icons while preserving COEP compatibility
        source: '/icons/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400, stale-while-revalidate=604800',
          },
          {
            key: 'Cross-Origin-Resource-Policy',
            value: 'same-origin',
          },
        ],
      },
      {
        // Cross-origin isolation is required for the browser Stockfish worker.
        // Exclude landing (/), auth, Firebase proxy (/__/*), API, and legal routes
        // so OAuth popups/iframes and redirects are never blocked by inherited COOP/COEP.
        source: '/((?!$|login|register|auth|terms|privacy|__|api|_next/static|stockfish|icons).*)',
        headers: [
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: 'require-corp',
          },
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin',
          },
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
          {
            key: 'Pragma',
            value: 'no-cache',
          },
          {
            key: 'Expires',
            value: '0',
          },
        ],
      },
      {
        // More permissive headers for auth routes to allow OAuth popups
        source: '/(login|register|auth)/:path*',
        headers: [
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin-allow-popups',
          },
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
          {
            key: 'Pragma',
            value: 'no-cache',
          },
          {
            key: 'Expires',
            value: '0',
          },
        ],
      },
    ]
  },
  webpack: (config) => {
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
    }

    config.module.rules.push({
      test: /\.wasm$/,
      type: 'webassembly/async',
    })

    config.module.rules.push({
      test: /sf16-7\.wasm$/,
      type: 'asset/resource',
      generator: {
        filename: 'static/wasm/[name][ext]',
      },
    })

    config.module.rules.push({
      test: /sf16-7\.js$/,
      type: 'asset/resource',
      generator: {
        filename: 'static/js/[name][ext]',
      },
    })

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
      {
        module: /sf16-7\.js/,
        message: /Can't resolve 'a'/,
      },
    ]

    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
      crypto: false,
    }

    return config
  },

}

export default nextConfig
