import { expect, test, type Page } from '@playwright/test'
import { signInWithTestToken } from './helpers/auth'

const now = '2026-06-20T00:00:00Z'

const bootstrapResponse = {
  user: {
    id: 'user-e2e',
    email: 'e2e@example.com',
    registered_at: now,
    updated_at: now,
    last_sign_in_at: now,
  },
  profiles: [],
  elos: [
    { elo_type: 'mixed 5/20', rating: 1320, rating_deviation: 60, updated_at: now },
    { elo_type: 'arrowduel 5/30', rating: 1410, rating_deviation: 55, updated_at: now },
    { elo_type: 'fork 5/20', rating: 1290, rating_deviation: 70, updated_at: now },
  ],
}

test.describe('Multi-locale switching and layout integrity', () => {
  test('switches landing page between English, Simplified Chinese, and German with persistence and zero overflow', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('button', { name: /Get Started/ })).toBeVisible()
    await expectNoHorizontalOverflow(page)

    // Switch to Simplified Chinese
    await page.getByRole('combobox', { name: 'Language' }).click()
    await page.getByRole('option', { name: '简体中文' }).click()

    await expect(page.getByRole('button', { name: /开始使用/ })).toBeVisible()
    await expect(page.getByRole('heading', { name: '战术冲刺' })).toBeVisible()
    await expect(page.getByRole('heading', { name: '箭头对决' })).toBeVisible()
    await expect(page.locator('html')).toHaveAttribute('lang', 'zh-Hans')
    await expectNoHorizontalOverflow(page)

    // Reload to verify SSR + cookie persistence
    await page.reload()
    await expect(page.getByRole('button', { name: /开始使用/ })).toBeVisible()
    await expect(page.locator('html')).toHaveAttribute('lang', 'zh-Hans')

    // Switch to German (verbose European locale stress check)
    await page.getByRole('combobox', { name: '语言' }).click()
    await page.getByRole('option', { name: 'Deutsch' }).click()

    await expect(page.getByRole('button', { name: /Jetzt starten/ })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Aufgaben-Sprint' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Pfeilduell' })).toBeVisible()
    await expect(page.locator('html')).toHaveAttribute('lang', 'de')
    await expectNoHorizontalOverflow(page)
  })

  test('switches language in Settings and reflects localized chess themes on Puzzle Sprint', async ({ page }) => {
    await signInWithTestToken(page)
    await page.route('**/api/v2/me/bootstrap', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(bootstrapResponse),
      })
    })
    await page.route('**/api/v2/me/chess-profiles', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ profiles: [] }),
      })
    })
    await page.route('**/api/v2/me/stats/sprints**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          range: { from: '2025-06-20T00:00:00Z', to: now },
          group_by: 'day',
          group_length: 1,
          summary: {
            started_count: 2,
            completed_count: 2,
            won_count: 2,
            failed_time_count: 0,
            failed_mistakes_count: 0,
            abandoned_count: 0,
            puzzles_solved: 10,
            puzzles_failed: 0,
            sprint_total_duration_seconds: 300,
          },
          series: [],
        }),
      })
    })

    await page.goto('/settings')
    await expect(page.getByRole('heading', { name: 'Settings', exact: true })).toBeVisible()

    // Use the Settings language selector (last combobox on desktop or first on mobile)
    await page.getByRole('combobox', { name: 'Language' }).last().click()
    await page.getByRole('option', { name: '简体中文' }).click()

    await expect(page.getByRole('heading', { name: '设置' })).toBeVisible()
    await expectNoHorizontalOverflow(page)

    await page.goto('/puzzle-sprint')
    await expect(page.getByRole('heading', { name: '战术冲刺' })).toBeVisible()
    await expect(page.getByText('捉双').first()).toBeVisible()
    await expectNoHorizontalOverflow(page)
  })
})

async function expectNoHorizontalOverflow(page: Page) {
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth))
    .toBe(true)
}
