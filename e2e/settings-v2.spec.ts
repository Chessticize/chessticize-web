import { expect, test, type Page, type Route } from '@playwright/test'
import { signInWithTestToken } from './helpers/auth'

const bootstrapResponse = {
  user: {
    id: 'user-e2e',
    email: 'e2e@example.com',
    registered_at: '2026-06-20T00:00:00Z',
    updated_at: '2026-06-20T00:00:00Z',
    last_sign_in_at: '2026-06-20T00:00:00Z',
  },
  profiles: [
    {
      profile_id: 'profile-lichess',
      platform: 'lichess.org',
      username: 'e2e_lichess',
      games_fetched: 12,
      updated_at: '2026-06-20T00:00:00Z',
    },
  ],
  elos: [
    {
      elo_type: 'mixed 5/20',
      rating: 1200,
      rating_deviation: 80,
      is_provisional: false,
      updated_at: '2026-06-20T00:00:00Z',
    },
    {
      elo_type: 'mixed 5/10',
      rating: 900,
      rating_deviation: 90,
      is_provisional: false,
      updated_at: '2026-06-20T00:00:00Z',
    },
    {
      elo_type: 'arrowduel 5/30',
      rating: 1000,
      rating_deviation: 95,
      is_provisional: false,
      updated_at: '2026-06-20T00:00:00Z',
    },
  ],
}

test.describe('Settings v2 API migration', () => {
  test.describe.configure({ mode: 'serial' })

  test.beforeEach(async ({ page }) => {
    await signInWithTestToken(page)
  })

  test('saves edited ELO ratings through the v2 Settings endpoint', async ({ page }, testInfo) => {
    const legacyEloRequests: string[] = []
    let eloUpdateBody: unknown
    await stubSettingsApi(page)

    page.on('request', (request) => {
      const url = request.url()
      if (url.includes('/api/v1/users/me/elos')) {
        legacyEloRequests.push(url)
      }
    })

    await page.route('**/api/v2/me/elos', async (route) => {
      eloUpdateBody = route.request().postDataJSON()
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          updated: [
            {
              elo_type: 'mixed 5/20',
              rating: 1250,
              rating_deviation: 50,
              is_provisional: false,
              updated_at: '2026-06-20T00:05:00Z',
            },
          ],
        }),
      })
    })

    await page.goto('/settings')
    await expect(page.getByRole('heading', { name: 'Settings', exact: true })).toBeVisible()
    await expect(page.getByText('ELO Settings')).toBeVisible()

    await testInfo.attach('settings-loaded', {
      body: await page.screenshot({ fullPage: true }),
      contentType: 'image/png',
    })

    const standardInput = page.getByLabel(/Standard Sprint/)
    await expect(standardInput).toHaveValue('1200')
    await standardInput.fill('1250')
    await page.getByRole('button', { name: 'Save ELOs' }).click()

    await expect.poll(() => eloUpdateBody).toEqual({
      updates: [
        {
          elo_type: 'mixed 5/20',
          rating: 1250,
          rating_deviation: 50,
        },
      ],
    })
    expect(legacyEloRequests).toEqual([])
    await expect(page.getByRole('button', { name: 'Save ELOs' })).toBeDisabled()

    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth))
      .toBe(true)
  })

  test('creates and deletes chess profiles through the v2 Settings endpoint', async ({ page }, testInfo) => {
    const legacyRequests = collectLegacyRequests(page)
    const createBodies: unknown[] = []
    const deletedProfileIDs: string[] = []
    const initialProfiles = [...bootstrapResponse.profiles]
    const chessComProfile = {
      profile_id: 'profile-chesscom',
      platform: 'chess.com',
      username: 'e2e_chesscom',
      games_fetched: 0,
      updated_at: '2026-06-20T00:10:00Z',
    }

    await stubSettingsApi(page, {
      profiles: initialProfiles,
      onCreate: (body) => {
        createBodies.push(body)
        return chessComProfile
      },
      onDelete: (profileID) => {
        deletedProfileIDs.push(profileID)
      },
    })
    await page.route('https://api.chess.com/pub/player/**', async (route) => {
      await fulfillJSON(route, { player_id: 123456, username: 'e2e_chesscom' })
    })

    await page.goto('/settings')
    await expect(page.getByRole('heading', { name: 'Settings', exact: true })).toBeVisible()
    await expect(page.getByText('@e2e_lichess')).toBeVisible()

    await page.getByRole('button', { name: 'Add Profile' }).click()
    const chessComInput = page.getByLabel('Chess.com Username')
    await chessComInput.fill('e2e_chesscom')
    await page.getByRole('button', { name: 'Connect Profiles' }).click()

    await expect.poll(() => createBodies).toEqual([
      {
        platform: 'chess.com',
        username: 'e2e_chesscom',
      },
    ])
    await expect(page.getByText('@e2e_chesscom')).toBeVisible()

    await page.getByRole('button', { name: 'Delete chess.com profile e2e_chesscom' }).click()
    await page.getByRole('button', { name: 'Delete' }).click()

    await expect.poll(() => deletedProfileIDs).toEqual(['profile-chesscom'])
    await expect(page.locator('.rounded-lg.border.border-gray-200.bg-gray-50').filter({ hasText: '@e2e_chesscom' })).toHaveCount(0)
    expect(legacyRequests).toEqual([])

    await testInfo.attach('settings-profile-management', {
      body: await page.screenshot({ fullPage: true }),
      contentType: 'image/png',
    })

    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth))
      .toBe(true)
  })

})

test.describe('Settings route guard', () => {
  test('redirects unauthenticated visitors to auth', async ({ page }) => {
    await page.goto('/settings')

    await expect(page).toHaveURL(/\/auth$/)
    await expect(page.getByText('Welcome! Sign in or create your account')).toBeVisible()
  })
})

interface StubSettingsApiOptions {
  profiles?: typeof bootstrapResponse.profiles
  onCreate?: (body: unknown) => typeof bootstrapResponse.profiles[number]
  onDelete?: (profileID: string) => void
}

async function stubSettingsApi(page: Page, options: StubSettingsApiOptions = {}) {
  const profiles = options.profiles || bootstrapResponse.profiles
  await page.route('**/api/v2/me/bootstrap', async (route) => {
    await fulfillJSON(route, { ...bootstrapResponse, profiles })
  })
  await page.route('**/api/v2/me/chess-profiles**', async (route) => {
    const request = route.request()
    const requestURL = new URL(request.url())
    const method = request.method()

    if (method === 'GET' && requestURL.pathname === '/api/v2/me/chess-profiles') {
      await fulfillJSON(route, { profiles })
      return
    }

    if (method === 'POST' && requestURL.pathname === '/api/v2/me/chess-profiles') {
      const body = request.postDataJSON()
      const profile = options.onCreate?.(body) || {
        profile_id: 'created-profile',
        platform: 'chess.com',
        username: 'created_user',
        games_fetched: 0,
        updated_at: '2026-06-20T00:10:00Z',
      }
      await fulfillJSON(route, {
        profile,
        profile_id: profile.profile_id,
        created_import_job_id: 'job-e2e',
      })
      return
    }

    if (method === 'DELETE' && requestURL.pathname.startsWith('/api/v2/me/chess-profiles/')) {
      const profileID = decodeURIComponent(requestURL.pathname.replace('/api/v2/me/chess-profiles/', ''))
      options.onDelete?.(profileID)
      await route.fulfill({ status: 204, body: '' })
      return
    }

    await route.fulfill({ status: 405, body: 'method not allowed' })
  })
}

function collectLegacyRequests(page: Page): string[] {
  const legacyRequests: string[] = []
  page.on('request', (request) => {
    const url = request.url()
    if (url.includes('/api/v1/') || url.includes('/graphql')) {
      legacyRequests.push(url)
    }
  })
  return legacyRequests
}

async function fulfillJSON(route: Route, data: unknown) {
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(data),
  })
}
