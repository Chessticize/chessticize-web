import { expect, test, type Locator, type Page, type Route, type TestInfo } from '@playwright/test'
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
  profiles: [
    {
      profile_id: 'profile-lichess',
      platform: 'lichess.org',
      username: 'e2e_lichess',
      games_fetched: 18,
      last_game_fetched_at: now,
      last_game_played_at: now,
      updated_at: now,
    },
  ],
  elos: [],
}

test.describe('Migrated v2 signed-in read routes', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    await signInWithTestToken(page)
    await stubBootstrap(
      page,
      testInfo.title.includes('starts Game Review import refresh')
        ? pendingImportBootstrapResponse()
        : buildBootstrapResponse(),
    )
  })

  test('renders dashboard from v2 bootstrap without legacy reads', async ({ page }, testInfo) => {
    const legacyRequests = collectLegacyRequests(page)
    const bootstrapRequests: string[] = []
    const attemptStatsRequests: string[] = []

    await page.route('**/api/v2/me/bootstrap', async (route) => {
      bootstrapRequests.push(route.request().url())
      await fulfillJSON(route, buildBootstrapResponse())
    })
    await page.route('**/api/v2/me/stats/attempts**', async (route) => {
      attemptStatsRequests.push(route.request().url())
      await fulfillJSON(route, dashboardAttemptStatsResponse())
    })

    await page.goto('/dashboard')

    await expect(page.getByRole('heading', { name: 'Welcome back!' })).toBeVisible()
    await expect(page.getByText('Daily Streak: 4')).toBeVisible()
    await expect(page.getByRole('link', { name: /^Game Review Analyze your/ })).toBeVisible()
    await expect(page.getByRole('link', { name: /^Review Queue Practice due/ })).toBeVisible()
    await attachScreenshot(page, testInfo, 'dashboard-v2-loaded')
    expect(bootstrapRequests.length).toBeGreaterThan(0)
    expect(attemptStatsRequests).toHaveLength(1)
    const attemptStatsURL = new URL(attemptStatsRequests[0])
    expect(attemptStatsURL.pathname).toBe('/api/v2/me/stats/attempts')
    expect(attemptStatsURL.searchParams.get('from')).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(attemptStatsURL.searchParams.get('to')).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(attemptStatsURL.searchParams.get('group_by')).toBe('day')
    expect(attemptStatsURL.searchParams.get('group_length')).toBe('1')
    expect(attemptStatsURL.searchParams.has('days')).toBe(false)
    expect(legacyRequests).toEqual([])
    await expectNoHorizontalOverflow(page)
  })

  test('renders games and puzzles from v2 list endpoints', async ({ page }, testInfo) => {
    const legacyRequests = collectLegacyRequests(page)
    const gamesRequests: string[] = []
    const puzzlesRequests: string[] = []

    await page.route('**/api/v2/me/games**', async (route) => {
      gamesRequests.push(route.request().url())
      await fulfillJSON(route, gamesResponse())
    })
    await page.route('**/api/v2/me/puzzles**', async (route) => {
      puzzlesRequests.push(route.request().url())
      await fulfillJSON(route, puzzlesResponse())
    })

    await page.goto('/games')
    await expect(page.getByRole('heading', { name: 'My Games' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'lichess.org / e2e_lichess' })).toBeVisible()
    await expect(page.locator('table a[href="/games/game-1"]')).toBeVisible()
    await expect(page.getByText('Showing 1-1 of 1')).toBeVisible()
    await attachScreenshot(page, testInfo, 'games-v2-loaded')
    await expectNoHorizontalOverflow(page)

    await page.goto('/puzzles')
    await expect(page.getByRole('heading', { name: 'My Puzzles' })).toBeVisible()
    await expect(page.getByRole('cell', { name: /OPPONENT BLUNDER MISSED/ })).toBeVisible()
    await expect(page.locator('table a[href="/puzzles/puzzle-1"]')).toBeVisible()
    await expect(page.getByText('Showing 1-1 of 1')).toBeVisible()
    await attachScreenshot(page, testInfo, 'puzzles-v2-loaded')
    await expectNoHorizontalOverflow(page)

    expect(gamesRequests).toHaveLength(1)
    expect(new URL(gamesRequests[0]).pathname).toBe('/api/v2/me/games')
    expect(puzzlesRequests).toHaveLength(1)
    expect(new URL(puzzlesRequests[0]).pathname).toBe('/api/v2/me/puzzles')
    expect(legacyRequests).toEqual([])
  })

  test('renders Game Review from bundled v2 insights', async ({ page }, testInfo) => {
    const legacyRequests = collectLegacyRequests(page)
    const insightsRequests: string[] = []
    const standaloneStatsRequests: string[] = []

    await page.route('**/api/v2/me/insights/game-review**', async (route) => {
      insightsRequests.push(route.request().url())
      await fulfillJSON(route, gameReviewInsightsResponse())
    })
    await page.route('**/api/v2/me/stats/puzzles**', async (route) => {
      standaloneStatsRequests.push(route.request().url())
      await fulfillJSON(route, statsResponse())
    })

    await page.goto('/game-review')

    await expect(page.getByRole('heading', { name: 'Game Review & Analysis' })).toBeVisible()
    await expect(page.getByText('Analysis Ready')).toBeVisible()
    await expect(page.getByText('Opponent Mistake Recognition')).toBeVisible()
    const mistakesPerGameCard = page
      .locator('div.rounded-lg.border')
      .filter({ hasText: 'My Mistakes Per Game' })
    await expect(mistakesPerGameCard).toBeVisible()
    await expect(mistakesPerGameCard).toContainText('-1.0')
    await expect(mistakesPerGameCard).toContainText('Improving')
    await expect(page.getByRole('link', { name: /View My Games/ })).toBeVisible()
    await attachScreenshot(page, testInfo, 'game-review-v2-loaded')
    await expectNoHorizontalOverflow(page)

    expect(insightsRequests).toHaveLength(1)
    const requestedURL = new URL(insightsRequests[0])
    expect(requestedURL.pathname).toBe('/api/v2/me/insights/game-review')
    expect(requestedURL.searchParams.get('include_stats_bundle')).toBe('true')
    expect(requestedURL.searchParams.get('platform')).toBe('lichess.org')
    expect(requestedURL.searchParams.get('username')).toBe('e2e_lichess')
    expect(standaloneStatsRequests).toEqual([])
    expect(legacyRequests).toEqual([])
  })

  test('starts Game Review import refresh through v2 without legacy requests', async ({ page }, testInfo) => {
    const legacyRequests = collectLegacyRequests(page)
    const bootstrapRequests: string[] = []
    const importStatusRequests: string[] = []
    const importJobRequests: string[] = []
    const refreshRequests: Array<{ url: string; method: string }> = []

    page.on('request', (request) => {
      const url = new URL(request.url())
      if (url.pathname === '/api/v2/me/bootstrap') {
        bootstrapRequests.push(request.url())
      }
    })
    await page.route('**/api/v2/me/import-status', async (route) => {
      importStatusRequests.push(route.request().url())
      await fulfillJSON(route, importStatusResponse(importStatusRequests.length === 1 ? 'not_started' : 'queued'))
    })
    await page.route('**/api/v2/me/chess-profiles/*:refresh', async (route) => {
      refreshRequests.push({
        url: route.request().url(),
        method: route.request().method(),
      })
      await fulfillJSON(route, importRefreshResponse())
    })
    await page.route('**/api/v2/me/import-jobs/*', async (route) => {
      importJobRequests.push(route.request().url())
      await fulfillJSON(route, importJobResponse())
    })

    await page.goto('/game-review')

    await expect(page.getByRole('heading', { name: 'Game Review & Analysis' })).toBeVisible()
    await expect(page.getByText('Game Import Pending')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Start Import' })).toBeVisible()
    await attachScreenshot(page, testInfo, 'game-review-import-ready')
    await expectNoHorizontalOverflow(page)

    await page.getByRole('button', { name: 'Start Import' }).click()
    await expect(page.getByRole('button', { name: 'Import Queued' })).toBeVisible()
    await expect(page.getByRole('group', { name: 'Games imported: 12' })).toBeVisible()
    await expect(page.getByRole('group', { name: 'Games analyzed: 8' })).toBeVisible()
    await expect(page.getByRole('group', { name: 'Puzzles generated: 0' })).toBeVisible()
    await attachScreenshot(page, testInfo, 'game-review-import-queued')
    await expectNoHorizontalOverflow(page)
    await page.setViewportSize({ width: 390, height: 844 })
    const mobileImported = page.getByRole('group', { name: 'Games imported: 12' })
    const mobileAnalyzed = page.getByRole('group', { name: 'Games analyzed: 8' })
    const mobileGenerated = page.getByRole('group', { name: 'Puzzles generated: 0' })
    await mobileGenerated.evaluate(element => element.scrollIntoView({ block: 'center' }))
    await expect(mobileImported).toBeVisible()
    await expect(mobileAnalyzed).toBeVisible()
    await expect(mobileGenerated).toBeVisible()
    await expectNoMobileBottomNavOverlap(page, mobileGenerated)
    await attachScreenshot(page, testInfo, 'game-review-import-queued-mobile')
    await expectNoHorizontalOverflow(page)

    expect(importStatusRequests).toHaveLength(2)
    expect(importJobRequests).toEqual([
      expect.stringContaining('/api/v2/me/import-jobs/job-import-1'),
    ])
    expect(bootstrapRequests.length).toBeGreaterThanOrEqual(1)
    expect(importStatusRequests.every(requestURL => new URL(requestURL).pathname === '/api/v2/me/import-status')).toBe(true)
    expect(refreshRequests).toEqual([
      {
        url: expect.stringContaining('/api/v2/me/chess-profiles/profile-pending:refresh'),
        method: 'POST',
      },
    ])
    expect(legacyRequests).toEqual([])
  })

  test('renders Review Queue from v2 queue endpoints and draws a review batch', async ({ page }, testInfo) => {
    const legacyRequests = collectLegacyRequests(page)
    const statsRequests: string[] = []
    const listRequests: string[] = []
    const drawBodies: unknown[] = []
    const attemptBodies: unknown[] = []

    await page.route('**/api/v2/me/review-queue/stats**', async (route) => {
      statsRequests.push(route.request().url())
      await fulfillJSON(route, reviewQueueStatsResponse())
    })
    await page.route('**/api/v2/me/review-queue?**', async (route) => {
      listRequests.push(route.request().url())
      await fulfillJSON(route, reviewQueueListResponse())
    })
    await page.route('**/api/v2/me/review-queue/puzzles:draw', async (route) => {
      drawBodies.push(route.request().postDataJSON())
      await fulfillJSON(route, reviewQueueDrawResponse())
    })
    await page.route('**/api/v2/me/review-queue/attempts', async (route) => {
      attemptBodies.push(route.request().postDataJSON())
      await fulfillJSON(route, reviewQueueAttemptResponse())
    })

    await page.goto('/review-queue?mode=arrow_duel&puzzle_source=user_game&theme_groups=missed_attack')

    await expect(page.getByRole('heading', { name: 'Review Queue', level: 1 })).toBeVisible()
    await expect(page.getByLabel('Source')).toHaveValue('user_game')
    await expect(page.getByText('Showing 1-1 of 1')).toBeVisible()
    await expect(page.getByText('2 due now')).toBeVisible()
    await page.getByRole('button', { name: 'Start Review' }).click()
    await expect(page.getByText('Review Session')).toBeVisible()
    await page.getByRole('button', { name: 'Choose e2e4' }).click()
    await expect(page.getByText('Status: Scheduled')).toBeVisible()
    await attachScreenshot(page, testInfo, 'review-queue-v2-loaded')
    await expectNoHorizontalOverflow(page)

    expect(statsRequests.length).toBeGreaterThanOrEqual(1)
    const statsURL = new URL(statsRequests[0])
    expect(statsURL.pathname).toBe('/api/v2/me/review-queue/stats')
    expect(statsURL.searchParams.get('mode')).toBe('arrow_duel')
    expect(statsURL.searchParams.get('puzzle_source')).toBe('user_game')
    expect(statsURL.searchParams.get('theme_groups')).toBe('missed_attack')
    expect(listRequests.length).toBeGreaterThanOrEqual(1)
    const listURL = new URL(listRequests[0])
    expect(listURL.pathname).toBe('/api/v2/me/review-queue')
    expect(listURL.searchParams.get('mode')).toBe('arrow_duel')
    expect(listURL.searchParams.get('puzzle_source')).toBe('user_game')
    expect(listURL.searchParams.get('due')).toBe('now')
    expect(listURL.searchParams.get('theme_groups')).toBe('missed_attack')
    expect(drawBodies).toEqual([
      {
        mode: 'arrow_duel',
        puzzle_source: 'user_game',
        limit: 5,
        theme_groups: ['missed_attack'],
      },
    ])
    expect(attemptBodies).toHaveLength(1)
    expect(attemptBodies[0]).toMatchObject({
      attempts: [{
        review_item_id: 'drawn-review-item',
        puzzle_source: 'user_game',
        puzzle_id: 'drawn-review-puzzle',
        mode: 'arrow_duel',
        candidate_moves: ['e2e3', 'e2e4'],
        chosen_move: 'e2e4',
        was_correct: true,
      }],
    })
    expect(legacyRequests).toEqual([])
  })

  test('renders Lichess arrow-duel Review Queue from v2 queue endpoints without theme scope', async ({ page }, testInfo) => {
    const legacyRequests = collectLegacyRequests(page)
    const statsRequests: string[] = []
    const listRequests: string[] = []

    await page.route('**/api/v2/me/review-queue/stats**', async (route) => {
      statsRequests.push(route.request().url())
      await fulfillJSON(route, reviewQueueStatsResponse())
    })
    await page.route('**/api/v2/me/review-queue?**', async (route) => {
      listRequests.push(route.request().url())
      await fulfillJSON(route, reviewQueueListResponse({ puzzleSource: 'lichess' }))
    })

    await page.goto('/review-queue?mode=arrow_duel&puzzle_source=lichess&due=all&theme_groups=missed_attack')

    await expect(page.getByRole('heading', { name: 'Review Queue', level: 1 })).toBeVisible()
    await expect(page.getByLabel('Mode')).toHaveValue('arrow_duel')
    await expect(page.getByLabel('Source')).toHaveValue('lichess')
    await expect(page.getByLabel('Due')).toHaveValue('all')
    await expect(page.getByLabel('Theme Scope')).toBeDisabled()
    await expect(page.getByText('Showing 1-1 of 1')).toBeVisible()
    await attachScreenshot(page, testInfo, 'review-queue-lichess-arrow-duel-v2-loaded')
    await expectNoHorizontalOverflow(page)

    expect(statsRequests.length).toBeGreaterThanOrEqual(1)
    const statsURL = new URL(statsRequests[0])
    expect(statsURL.pathname).toBe('/api/v2/me/review-queue/stats')
    expect(statsURL.searchParams.get('mode')).toBe('arrow_duel')
    expect(statsURL.searchParams.get('puzzle_source')).toBe('lichess')
    expect(statsURL.searchParams.has('theme_groups')).toBe(false)
    expect(listRequests.length).toBeGreaterThanOrEqual(1)
    const listURL = new URL(listRequests[0])
    expect(listURL.pathname).toBe('/api/v2/me/review-queue')
    expect(listURL.searchParams.get('mode')).toBe('arrow_duel')
    expect(listURL.searchParams.get('puzzle_source')).toBe('lichess')
    expect(listURL.searchParams.get('due')).toBe('all')
    expect(listURL.searchParams.has('theme_groups')).toBe(false)
    expect(legacyRequests).toEqual([])
  })

  test('excludes a drawn Review Queue item through v2', async ({ page }, testInfo) => {
    const legacyRequests = collectLegacyRequests(page)
    const statsRequests: string[] = []
    const listRequests: string[] = []
    const drawBodies: unknown[] = []
    const excludeRequests: Array<{ url: string; body: unknown }> = []

    await page.route('**/api/v2/me/review-queue/stats**', async (route) => {
      statsRequests.push(route.request().url())
      await fulfillJSON(route, reviewQueueStatsResponse())
    })
    await page.route('**/api/v2/me/review-queue?**', async (route) => {
      listRequests.push(route.request().url())
      await fulfillJSON(route, reviewQueueListResponse())
    })
    await page.route('**/api/v2/me/review-queue/puzzles:draw', async (route) => {
      drawBodies.push(route.request().postDataJSON())
      await fulfillJSON(route, reviewQueueDrawResponse())
    })
    await page.route('**/api/v2/me/review-queue/items/*:exclude', async (route) => {
      excludeRequests.push({
        url: route.request().url(),
        body: route.request().postDataJSON(),
      })
      await fulfillJSON(route, reviewQueueExcludeResponse())
    })

    await page.goto('/review-queue?mode=arrow_duel&puzzle_source=user_game&theme_groups=missed_attack')

    await expect(page.getByRole('heading', { name: 'Review Queue', level: 1 })).toBeVisible()
    await expect(page.getByLabel('Source')).toHaveValue('user_game')
    await expect(page.getByText('Showing 1-1 of 1')).toBeVisible()
    await page.getByRole('button', { name: 'Start Review' }).click()
    await expect(page.getByText('Review Session')).toBeVisible()
    await page.getByRole('button', { name: 'Exclude' }).click()
    await expect(page.getByText('Position excluded from review.')).toBeVisible()
    await attachScreenshot(page, testInfo, 'review-queue-v2-excluded')
    await expectNoHorizontalOverflow(page)

    expect(statsRequests.length).toBeGreaterThanOrEqual(1)
    const statsURL = new URL(statsRequests[0])
    expect(statsURL.pathname).toBe('/api/v2/me/review-queue/stats')
    expect(statsURL.searchParams.get('mode')).toBe('arrow_duel')
    expect(statsURL.searchParams.get('puzzle_source')).toBe('user_game')
    expect(statsURL.searchParams.get('theme_groups')).toBe('missed_attack')
    expect(listRequests.length).toBeGreaterThanOrEqual(1)
    expect(drawBodies).toEqual([
      {
        mode: 'arrow_duel',
        puzzle_source: 'user_game',
        limit: 5,
        theme_groups: ['missed_attack'],
      },
    ])
    expect(excludeRequests).toEqual([
      {
        url: expect.stringContaining('/api/v2/me/review-queue/items/drawn-review-item:exclude'),
        body: { reason: 'not_relevant' },
      },
    ])
    expect(legacyRequests).toEqual([])
  })
})

async function stubBootstrap(page: Page, response = buildBootstrapResponse()) {
  await page.route('**/api/v2/me/bootstrap', async (route) => {
    await fulfillJSON(route, response)
  })
}

function buildBootstrapResponse(overrides: Record<string, unknown> = {}) {
  return {
    ...bootstrapResponse,
    ...overrides,
  }
}

function dashboardAttemptStatsResponse() {
  const today = new Date()
  const series = []
  for (let daysAgo = 3; daysAgo >= 0; daysAgo -= 1) {
    const day = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()))
    day.setUTCDate(day.getUTCDate() - daysAgo)
    series.push(attemptStatsSeriesPoint(day.toISOString(), 1))
  }

  return {
    summary: {
      attempt_count: 4,
      correct_count: 4,
      incorrect_count: 0,
      accuracy: 1,
      timed_attempt_count: 0,
      average_time_ms: 0,
    },
    buckets: {},
    series,
  }
}

function attemptStatsSeriesPoint(start: string, correctCount: number) {
  return {
    start,
    end: start,
    summary: {
      attempt_count: correctCount,
      correct_count: correctCount,
      incorrect_count: 0,
      accuracy: correctCount > 0 ? 1 : 0,
      timed_attempt_count: 0,
      average_time_ms: 0,
    },
    buckets: {},
  }
}

function pendingImportBootstrapResponse() {
  return buildBootstrapResponse({
    profiles: [
      {
        profile_id: 'profile-pending',
        id: 'profile-pending',
        platform: 'lichess.org',
        username: 'pending_lichess',
        games_fetched: 0,
        last_game_fetched_at: null,
        last_game_played_at: null,
        updated_at: now,
      },
    ],
  })
}

function importStatusResponse(status: 'not_started' | 'queued' | 'running' | 'failed' | 'complete') {
  return {
    profiles: [
      {
        profile_id: 'profile-pending',
        platform: 'lichess.org',
        username: 'pending_lichess',
        status,
        games_fetched: 0,
        ...(status === 'not_started'
          ? {
              games_imported: 0,
              games_analyzed: null,
              puzzles_generated: null,
            }
          : {}),
        task_id: status === 'not_started' ? undefined : 'task-import-1',
        task_status: status === 'not_started'
          ? undefined
          : status === 'queued'
            ? 'pending'
            : status === 'running'
              ? 'in_progress'
              : status === 'complete'
                ? 'completed'
                : 'failed',
        task_created_at: status === 'not_started' ? undefined : now,
        task_updated_at: status === 'not_started' ? undefined : now,
      },
    ],
    summary: {
      status,
      has_profiles: true,
      has_imported_games: false,
      queued_count: status === 'queued' ? 1 : 0,
      running_count: status === 'running' ? 1 : 0,
      failed_count: status === 'failed' ? 1 : 0,
      complete_count: status === 'complete' ? 1 : 0,
      not_started_count: status === 'not_started' ? 1 : 0,
    },
  }
}

function importRefreshResponse() {
  return importJobResponse()
}

function importJobResponse() {
  return {
    job_id: 'job-import-1',
    import_id: 'job-import-1',
    status: 'queued',
    task_status: 'pending',
    profile_id: 'profile-pending',
    platform: 'lichess.org',
    username: 'pending_lichess',
    reused_existing: false,
    games_imported: 12,
    games_analyzed: 8,
    puzzles_generated: 0,
    created_at: now,
    updated_at: now,
  }
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

async function expectNoHorizontalOverflow(page: Page) {
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth))
    .toBe(true)
}

async function expectNoMobileBottomNavOverlap(page: Page, target: Locator) {
  await expect.poll(async () => {
    return await page.evaluate(() => {
      const targetElement = document.querySelector('[aria-label="Puzzles generated: 0"]')
      const bottomNav = document.querySelector('.fixed.bottom-0.left-0.right-0')
      if (!targetElement || !bottomNav) return false

      const targetBox = targetElement.getBoundingClientRect()
      const navBox = bottomNav.getBoundingClientRect()
      return targetBox.bottom <= navBox.top || targetBox.top >= navBox.bottom
    })
  }).toBe(true)
  await expect(target).toBeVisible()
}

async function attachScreenshot(page: Page, testInfo: TestInfo, name: string) {
  await testInfo.attach(name, {
    body: await page.screenshot({ fullPage: true }),
    contentType: 'image/png',
  })
}

async function fulfillJSON(route: Route, data: unknown) {
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(data),
  })
}

function gamesResponse() {
  return {
    games: [
      {
        id: 'game-1',
        platform: 'lichess.org',
        username: 'e2e_lichess',
        user_color: 'white',
        game_time: '2026-06-19T12:00:00Z',
        time_control: '5+0',
        time_class: 'blitz',
        rated: true,
        url: 'https://lichess.org/e2e',
        winner: 'white',
        result: 'mate',
        created_at: '2026-06-19T12:01:00Z',
        updated_at: '2026-06-19T12:01:00Z',
      },
    ],
    total_count: 1,
    offset: 0,
    limit: 20,
  }
}

function puzzlesResponse() {
  return {
    puzzles: [
      {
        id: 'puzzle-1',
        puzzle_source: 'user_game',
        game_id: 'game-1',
        game_move: 32,
        game_phase: 'middlegame',
        fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3',
        theme: 'OPPONENT_BLUNDER_MISSED',
        theme_group: 'missed_attack',
        user_color: 'white',
        puzzle_color: 'black',
        zugzwang: false,
        tags: ['fork', 'attack'],
        game: {
          id: 'game-1',
          platform: 'lichess.org',
          username: 'e2e_lichess',
          game_time: '2026-06-19T12:00:00Z',
          time_control: '5+0',
          time_class: 'blitz',
          rated: true,
          result: 'mate',
        },
        created_at: '2026-06-19T12:01:00Z',
        updated_at: '2026-06-19T12:01:00Z',
      },
    ],
    total_count: 1,
    offset: 0,
    limit: 20,
  }
}

function gameReviewInsightsResponse() {
  return {
    filters: {
      platform: 'lichess.org',
      username: 'e2e_lichess',
    },
    summary: {
      games: 18,
      puzzles: 12,
      missed_opportunities: 3,
      missed_attacks: 2,
      missed_attack_rate: 0.25,
      caught_opportunities: 7,
      caught_attacks: 5,
      own_mistakes: 4,
      average_move_length: 3.4,
    },
    blindspots: [
      {
        tag: 'fork',
        missed_count: 3,
        total_count: 5,
        miss_rate: 0.6,
      },
    ],
    phase_breakdown: [
      {
        game_phase: 'middlegame',
        missed_count: 5,
      },
    ],
    series: [
      {
        start: '2026-06-01T00:00:00Z',
        end: '2026-06-08T00:00:00Z',
        games: 8,
        missed_opportunities: 2,
        missed_attacks: 1,
        missed_attack_rate: 0.2,
      },
    ],
    recommended_review: {
      due_count: 2,
      due_regular_count: 1,
      due_arrow_duel_count: 1,
      total_queued: 4,
      excluded_count: 0,
    },
    stats_bundle: {
      opponent_series: statsResponse({
        series: [
          statsSeriesPoint('2026-06-01T00:00:00Z', '2026-06-08T00:00:00Z', [
            { key: 'missed_attack', count: 3 },
            { key: 'caught_attack', count: 5 },
          ]),
          statsSeriesPoint('2026-06-08T00:00:00Z', '2026-06-15T00:00:00Z', [
            { key: 'missed_attack', count: 2 },
            { key: 'caught_attack', count: 7 },
          ]),
        ],
      }),
      my_mistakes_series: statsResponse({
        series: [
          statsSeriesPoint(
            '2026-06-01T00:00:00Z',
            '2026-06-08T00:00:00Z',
            [{ key: 'own_mistake_punished', count: 6 }],
            3,
          ),
          statsSeriesPoint(
            '2026-06-08T00:00:00Z',
            '2026-06-15T00:00:00Z',
            [{ key: 'own_mistake_punished', count: 2 }],
            2,
          ),
        ],
      }),
      opponent_missed_3m: statsResponse(),
      opponent_caught_3m: statsResponse(),
      opponent_missed_3_to_6m: statsResponse(),
      opponent_caught_3_to_6m: statsResponse(),
      my_mistakes_3m: statsResponse(),
      opponent_missed_all_time: statsResponse(),
      opponent_caught_all_time: statsResponse(),
      my_mistakes_all_time: statsResponse(),
    },
  }
}

function reviewQueueStatsResponse() {
  return {
    total_queued: 5,
    due_now: 2,
    due_regular: 1,
    due_arrow_duel: 1,
    excluded: 1,
  }
}

function reviewQueueListResponse(options: { puzzleSource?: 'user_game' | 'lichess' } = {}) {
  return {
    items: [reviewQueuePuzzle('review-item-1', 'missed-review-puzzle', 'arrow_duel', options.puzzleSource)],
    total_count: 1,
    offset: 0,
    limit: 20,
  }
}

function reviewQueueDrawResponse() {
  return {
    puzzles: [reviewQueuePuzzle('drawn-review-item', 'drawn-review-puzzle', 'arrow_duel')],
  }
}

function reviewQueueAttemptResponse() {
  return {
    processed_count: 1,
    updated_items: [{
      review_item_id: 'drawn-review-item',
      status: 'scheduled',
      consecutive_correct: 1,
      next_due_at: '2026-06-22T00:00:00Z',
    }],
  }
}

function reviewQueueExcludeResponse() {
  return {
    review_item_id: 'drawn-review-item',
    status: 'excluded',
  }
}

function reviewQueuePuzzle(
  reviewItemID: string,
  puzzleID: string,
  mode: 'regular' | 'arrow_duel' = 'regular',
  puzzleSource: 'user_game' | 'lichess' = 'user_game',
) {
  return {
    review_item_id: reviewItemID,
    puzzle_source: puzzleSource,
    puzzle_id: puzzleID,
    mode,
    due_at: '2026-06-20T00:00:00Z',
    attempts_since_added: 1,
    consecutive_correct: 0,
    fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    solution_moves: ['f3e5'],
    rating: 1200,
    themes: ['fork'],
    candidate_moves: mode === 'arrow_duel'
      ? [
          { move: 'e2e3', kind: 'blunder', eval_after: -100 },
          { move: 'e2e4', kind: 'best', eval_after: 40 },
        ]
      : undefined,
    correct_move: mode === 'arrow_duel' ? 'e2e4' : undefined,
    metadata: {
      theme_group: mode === 'arrow_duel' ? 'missed_attack' : 'missed_opportunity',
      origin: 'game_analysis',
    },
  }
}

function statsResponse(overrides: Record<string, unknown> = {}) {
  return {
    range: {
      from: '2026-03-20T00:00:00Z',
      to: '2026-06-20T00:00:00Z',
    },
    summary: {
      total_puzzles: 8,
      unique_games: 6,
      average_move_length: 3.1,
    },
    buckets: {
      tag: [{ key: 'fork', count: 3 }],
      game_move_bucket: [{ key: '21-40', min_move: 21, max_move: 40, count: 5 }],
      user_color: [{ key: 'white', count: 4 }],
      move_length: [{ key: 3, count: 5 }],
      theme: [{ key: 'missed_attack', count: 3 }],
    },
    series: [
      statsSeriesPoint('2026-06-01T00:00:00Z', '2026-06-08T00:00:00Z', [
        { key: 'missed_attack', count: 3 },
      ]),
    ],
    ...overrides,
  }
}

function statsSeriesPoint(
  start: string,
  end: string,
  themeBuckets: Array<{ key: string; count: number }>,
  uniqueGames = 3,
) {
  return {
    start,
    end,
    total_puzzles: themeBuckets.reduce((sum, bucket) => sum + bucket.count, 0),
    unique_games: uniqueGames,
    average_move_length: 3.2,
    buckets: {
      theme: themeBuckets,
    },
  }
}
