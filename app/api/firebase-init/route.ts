import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * Serves Firebase Web SDK init configuration for the same-origin /__/auth proxy
 * (exposed at /__/firebase/init.json via next.config.mjs rewrite).
 */
export function GET(request: NextRequest) {
  const useSameOrigin =
    process.env.NEXT_PUBLIC_FIREBASE_USE_SAME_ORIGIN_AUTH_DOMAIN === 'true'
  const forwardedHost = request.headers.get('x-forwarded-host')
  const host = forwardedHost || request.headers.get('host')
  const isLocalHost =
    !host || host.startsWith('localhost') || host.startsWith('127.0.0.1')

  const authDomain =
    useSameOrigin && !isLocalHost
      ? host
      : process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || ''

  const payload: Record<string, string> = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '',
    authDomain,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '',
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '',
  }

  if (process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID) {
    payload.measurementId = process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
  }

  return NextResponse.json(payload, {
    headers: {
      'Cache-Control': 'no-store, max-age=0',
    },
  })
}
