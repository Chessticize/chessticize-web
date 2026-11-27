import { APP_CONFIG } from '@/lib/config'

interface RouterLike {
  push: (href: string) => void
}

/**
 * Navigate to the auth page.
 * When the current document is cross-origin isolated (COOP: same-origin + COEP: require-corp
 * for Stockfish), a soft Next.js SPA transition would keep those headers active on /auth
 * and block Firebase OAuth popups/iframes. Force a full document load in that case.
 */
export function navigateToAuth(router: RouterLike): void {
  if (typeof window !== 'undefined' && window.crossOriginIsolated) {
    window.location.assign(APP_CONFIG.DEFAULT_LOGOUT_REDIRECT)
    return
  }
  router.push(APP_CONFIG.DEFAULT_LOGOUT_REDIRECT)
}
