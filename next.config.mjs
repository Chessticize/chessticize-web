/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Headers configuration
  async headers() {
    return [
      {
        // Cross-origin isolation is required for the browser Stockfish worker.
        // Auth routes keep a popup-friendly policy for OAuth/Firebase flows.
        source: '/((?!login|register|auth).*)',
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
