import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

const emulatorHost = '127.0.0.1:9099'
const projectID = 'chessticize-e2e'

function createMemoryStorage(): Storage {
  const values = new Map<string, string>()
  return {
    get length() {
      return values.size
    },
    clear() {
      values.clear()
    },
    getItem(key: string) {
      return values.get(key) ?? null
    },
    key(index: number) {
      return Array.from(values.keys())[index] ?? null
    },
    removeItem(key: string) {
      values.delete(key)
    },
    setItem(key: string, value: string) {
      values.set(key, String(value))
    },
  }
}

describe('Firebase Auth emulator integration', () => {
  beforeAll(() => {
    vi.resetModules()
    const localStorage = createMemoryStorage()
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: localStorage,
    })
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: localStorage,
    })
    process.env.FIREBASE_AUTH_EMULATOR_HOST = emulatorHost
    process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR = 'true'
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY = 'demo-api-key'
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN = `${projectID}.firebaseapp.com`
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = projectID
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET = `${projectID}.appspot.com`
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID = '123456789'
    process.env.NEXT_PUBLIC_FIREBASE_APP_ID = '1:123456789:web:firebase-emulator'
  })

  afterAll(() => {
    delete process.env.FIREBASE_AUTH_EMULATOR_HOST
    delete process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR
    delete process.env.NEXT_PUBLIC_FIREBASE_API_KEY
    delete process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
    delete process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
    delete process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
    delete process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
    delete process.env.NEXT_PUBLIC_FIREBASE_APP_ID
  })

  it('creates, signs out, signs in, and exchanges an emulator ID token through the v2 auth contract', async () => {
    const {
      EMULATOR_CONFIG,
      getFirebaseAuth,
      isFirebaseAvailable,
    } = await import('@/lib/firebase/config')
    const {
      getCurrentUserIdToken,
      signInWithEmail,
      signOutUser,
      signUpWithEmail,
    } = await import('@/lib/firebase/auth')
    const {
      exchangeAndStoreTokens,
    } = await import('@/lib/firebase/token-exchange')
    const {
      clearTokens,
      getAuthToken,
      getTokenExpiry,
    } = await import('@/lib/auth/tokens')

    const email = `firebase-emulator-${Date.now()}@example.test`
    const password = 'correct horse battery staple'
    const tokenExchangeRequests: Array<{ url: string; body: unknown }> = []
    const realFetch = globalThis.fetch.bind(globalThis)
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url
      const requestURL = new URL(url)

      if (
        requestURL.origin === 'http://localhost:8080' &&
        requestURL.pathname === '/api/v2/auth/firebase-exchange' &&
        init?.method === 'POST'
      ) {
        const body = init?.body ? JSON.parse(init.body.toString()) : null
        tokenExchangeRequests.push({ url, body })
        return new Response(JSON.stringify({
          token: 'custom-api-token-from-emulator-test',
          user_id: 'user-from-emulator-test',
          email,
          is_new_user: false,
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      }

      return realFetch(input, init)
    })

    expect(EMULATOR_CONFIG.useEmulator).toBe(true)
    expect(isFirebaseAvailable()).toBe(true)

    const auth = getFirebaseAuth()
    expect(auth).not.toBeNull()
    expect((auth as any).emulatorConfig).toMatchObject({
      host: 'localhost',
      port: 9099,
    })

    const signUpResult = await signUpWithEmail(email, password)
    expect(signUpResult.provider).toBe('email')
    expect(signUpResult.user.email).toBe(email)

    const idToken = await getCurrentUserIdToken(true)
    expect(idToken).toEqual(expect.any(String))
    expect(idToken?.length).toBeGreaterThan(20)

    await signOutUser()
    expect(getFirebaseAuth()?.currentUser).toBeNull()

    const signInResult = await signInWithEmail(email, password)
    expect(signInResult.provider).toBe('email')
    expect(signInResult.user.uid).toBe(signUpResult.user.uid)

    try {
      const tokenExchange = await exchangeAndStoreTokens(signInResult.user, 'email')
      expect(tokenExchange).toEqual({
        customApiToken: 'custom-api-token-from-emulator-test',
        isNewUser: false,
      })
      expect(tokenExchangeRequests).toHaveLength(1)
      expect(tokenExchangeRequests[0].url).toBe('http://localhost:8080/api/v2/auth/firebase-exchange')
      expect(tokenExchangeRequests[0].body).toEqual({
        firebase_token: expect.any(String),
      })
      expect((tokenExchangeRequests[0].body as { firebase_token: string }).firebase_token.length).toBeGreaterThan(20)
      expect(getAuthToken()).toBe('custom-api-token-from-emulator-test')
      expect(getTokenExpiry()).toBeInstanceOf(Date)
      expect(getTokenExpiry()!.getTime()).toBeGreaterThan(Date.now())
    } finally {
      clearTokens()
      fetchSpy.mockRestore()
    }
  })
})
