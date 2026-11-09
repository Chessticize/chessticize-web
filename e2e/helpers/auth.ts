import type { Page } from '@playwright/test'

export async function signInWithTestToken(page: Page) {
  const port = process.env.PLAYWRIGHT_PORT || '3000'
  const baseURL = `http://127.0.0.1:${port}`
  const expires = new Date(Date.now() + 60 * 60 * 1000).toISOString()

  await page.context().addCookies([
    {
      name: 'auth_token',
      value: 'playwright-token',
      url: baseURL,
      sameSite: 'Strict',
    },
    {
      name: 'token_expiry',
      value: expires,
      url: baseURL,
      sameSite: 'Strict',
    },
  ])
}
