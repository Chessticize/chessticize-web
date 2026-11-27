import { expect, test, type Page, type Route } from '@playwright/test'
import { signInWithTestToken } from './helpers/auth'

const now = '2026-06-20T00:00:00Z'

const bootstrapWithElos = {
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
  elos: [
    { elo_type: 'mixed 5/20', rating: 1320, rating_deviation: 60, updated_at: now },
    { elo_type: 'mixed 5/10', rating: 1180, rating_deviation: 65, updated_at: now },
    { elo_type: 'arrowduel 5/30', rating: 1410, rating_deviation: 55, updated_at: now },
    { elo_type: 'fork 5/20', rating: 1290, rating_deviation: 70, updated_at: now },
  ],
}

test.describe('Public routes and response headers', () => {
  test('renders landing page without cross-origin isolation headers blocking OAuth', async ({ page }) => {
    const legacyRequests = collectLegacyRequests(page)
    const response = await page.goto('/')

    expect(response?.status()).toBe(200)
    expect(response?.headers()['cross-origin-opener-policy']).not.toBe('same-origin')
    expect(response?.headers()['cross-origin-embedder-policy']).toBeUndefined()

    await expect(page.getByRole('heading', { name: 'Chessticize' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Puzzle Sprint' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Arrow Duel' })).toBeVisible()
    await expect(page.getByRole('button', { name: /Get Started/ })).toBeVisible()
    await expectNoHorizontalOverflow(page)
    expect(legacyRequests).toEqual([])
  })

  test('renders auth page with popup-friendly COOP header', async ({ page }) => {
    const response = await page.goto('/auth')

    expect(response?.status()).toBe(200)
    expect(response?.headers()['cross-origin-opener-policy']).toBe('same-origin-allow-popups')

    await expect(page.getByRole('button', { name: /Send Magic Link|Continue with Email|Sign in/i }).first()).toBeVisible()
    await expect(page.locator('a[href="/privacy"]')).toBeVisible()
    await expect(page.locator('a[href="/terms"]')).toBeVisible()
    await expectNoHorizontalOverflow(page)
  })

  test('serves Stockfish worker assets with COEP and CORP headers', async ({ request }) => {
    for (const assetPath of [
      '/stockfish/sf16-7.js',
      '/stockfish/sf16-7.wasm',
      '/stockfish/stockfish-nnue-16-single.js',
      '/stockfish/stockfish-nnue-16-single.wasm',
    ]) {
      const response = await request.get(assetPath)
      expect(response.status(), assetPath).toBe(200)
      expect(response.headers()['cross-origin-embedder-policy'], assetPath).toBe('require-corp')
      expect(response.headers()['cross-origin-resource-policy'], assetPath).toBe('same-origin')
    }
  })

  test('renders privacy policy and terms of service pages', async ({ page }) => {
    await page.goto('/privacy')
    await expect(page.getByText('Privacy Policy', { exact: true }).first()).toBeVisible()
    await expect(page.getByText('Table of Contents')).toBeVisible()
    await expectNoHorizontalOverflow(page)

    await page.goto('/terms')
    await expect(page.getByText('Terms of Service', { exact: true }).first()).toBeVisible()
    await expect(page.getByText('Table of Contents')).toBeVisible()
    await expectNoHorizontalOverflow(page)
  })
})

test.describe('Signed-in sprint hub, custom/blitz/theme sessions, and detail routes', () => {
  test.beforeEach(async ({ page }) => {
    await signInWithTestToken(page)
    await page.route('**/api/v2/me/bootstrap', async (route) => {
      await fulfillJSON(route, bootstrapWithElos)
    })
    await stubStockfish(page)
  })

  test('redirects signed-in visitors from / to /puzzle-sprint and loads sprint hub', async ({ page }) => {
    const legacyRequests = collectLegacyRequests(page)
    const sprintStatsRequests: string[] = []

    await page.route('**/api/v2/me/stats/sprints**', async (route) => {
      sprintStatsRequests.push(route.request().url())
      await fulfillJSON(route, sprintStatsResponse())
    })

    await page.goto('/')
    await page.waitForURL('**/puzzle-sprint')
    const sprintResponse = await page.request.get('/puzzle-sprint')
    expect(sprintResponse.headers()['cross-origin-opener-policy']).toBe('same-origin')
    expect(sprintResponse.headers()['cross-origin-embedder-policy']).toBe('require-corp')

    await expect(page.getByRole('heading', { name: 'Puzzle Sprint' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Standard Sprint' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Arrow Duel' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Blitz Sprint' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Start Standard Sprint' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Add Run' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Edit' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'How Sprint Works' })).toBeVisible()
    await expect(page.getByText('Elo: 1320')).toBeVisible()
    await expect(page.getByText('Elo: 1410')).toBeVisible()
    await expect(page.getByText('Elo: 1180')).toBeVisible()

    // Two-stage start: clicking a run card selects it without navigating away
    await page.getByRole('heading', { name: 'Arrow Duel' }).click()
    await expect(page).toHaveURL(/\/puzzle-sprint$/)
    await expect(page.getByRole('button', { name: 'Start Arrow Duel' })).toBeVisible()

    // Verify Edit mode renders drag handles for reordering
    await page.getByRole('button', { name: 'Edit' }).click()
    await expect(page.getByRole('button', { name: 'Drag to reorder Blitz Sprint' })).toBeVisible()
    await page.getByRole('button', { name: 'Done' }).click()
    await expectNoHorizontalOverflow(page)

    expect(sprintStatsRequests.length).toBeGreaterThan(0)
    expect(legacyRequests).toEqual([])
  })

  test('starts a custom sprint with query-prefilled settings via v2 API', async ({ page }) => {
    const legacyRequests = collectLegacyRequests(page)
    const startBodies: Array<{ elo_type?: string }> = []
    await stubSprintSession(page, startBodies)

    await page.goto('/puzzle-sprint/custom?theme=fork&duration=5&perPuzzle=20')

    await expect(page.getByText('ELO Type: fork 5/20')).toBeVisible()
    await expectNoHorizontalOverflow(page)

    await page.getByRole('button', { name: 'Start Custom Sprint' }).click()

    await expect(page.getByRole('button', { name: 'Abandon' })).toBeVisible()
    expect(startBodies).toEqual([{ elo_type: 'fork 5/20' }])
    expect(legacyRequests).toEqual([])
  })

  test('starts blitz and themed sprints with expected v2 elo_type', async ({ page }) => {
    const legacyRequests = collectLegacyRequests(page)
    const startBodies: Array<{ elo_type?: string }> = []
    await stubSprintSession(page, startBodies)

    await page.goto('/puzzle-sprint/blitz')
    await expect(page.getByRole('button', { name: 'Abandon' })).toBeVisible()
    await expectNoHorizontalOverflow(page)

    // Pressing browser Back during an active sprint intercepts navigation and opens Abandon dialog
    await page.goBack()
    await expect(page.getByRole('heading', { name: 'Abandon Sprint?' })).toBeVisible()
    await expect(page).toHaveURL(/\/puzzle-sprint\/blitz/)
    await page.getByRole('button', { name: 'Continue Sprint' }).click()
    await expect(page.getByRole('heading', { name: 'Abandon Sprint?' })).toHaveCount(0)

    await page.goto('/puzzle-sprint/theme/fork')
    await expect(page.getByRole('heading', { name: 'Fork Training' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Abandon' })).toBeVisible()
    await expectNoHorizontalOverflow(page)

    expect(startBodies).toEqual([
      { elo_type: 'mixed 5/10' },
      { elo_type: 'fork 5/20' },
    ])
    expect(legacyRequests).toEqual([])
  })

  test('renders game detail and puzzle detail pages from v2 endpoints', async ({ page }) => {
    const legacyRequests = collectLegacyRequests(page)

    await page.route('**/api/v2/me/games/game-1', async (route) => {
      await fulfillJSON(route, {
        game: {
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
      })
    })
    await page.route('**/api/v2/me/puzzles/puzzle-1', async (route) => {
      await fulfillJSON(route, {
        puzzle: {
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
      })
    })

    await page.goto('/games/game-1')
    await expect(page.getByRole('heading', { name: 'Game Detail' })).toBeVisible()
    await expect(page.getByText('lichess.org / e2e_lichess')).toBeVisible()
    await expect(page.getByRole('link', { name: /Open original game/ })).toBeVisible()
    await expectNoHorizontalOverflow(page)

    await page.goto('/puzzles/puzzle-1')
    await expect(page.getByRole('heading', { name: 'Puzzle Detail' })).toBeVisible()
    await expect(page.getByText('Source Game')).toBeVisible()
    await expect(page.getByRole('link', { name: 'View game details' })).toBeVisible()
    await expectNoHorizontalOverflow(page)

    expect(legacyRequests).toEqual([])
  })

  test('renders Game Review detailed insights from bundled v2 insights', async ({ page }) => {
    const legacyRequests = collectLegacyRequests(page)

    await page.route('**/api/v2/me/insights/game-review**', async (route) => {
      await fulfillJSON(route, gameReviewInsightsBundle())
    })

    await page.goto('/game-review/insights')
    await expect(page.getByRole('heading', { name: 'Detailed Insights' })).toBeVisible()
    await expect(page.getByText('Analysis Ready')).toBeVisible()
    await expect(page.getByText('Weekly Recognition Trend')).toBeVisible()
    await expect(page.getByText('My Mistakes Per Game Trend')).toBeVisible()
    await expect(page.getByText('Performance by Game Phase')).toBeVisible()
    await expectNoHorizontalOverflow(page)
    expect(legacyRequests).toEqual([])
  })
})

function collectLegacyRequests(page: Page) {
  const legacyRequests: string[] = []
  page.on('request', (request) => {
    const url = new URL(request.url())
    if (url.pathname.startsWith('/api/v1/') || url.pathname === '/graphql') {
      legacyRequests.push(`${request.method()} ${url.pathname}${url.search}`)
    }
  })
  return legacyRequests
}

async function expectNoHorizontalOverflow(page: Page) {
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth))
    .toBe(true)
}

async function fulfillJSON(route: Route, data: unknown) {
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(data),
  })
}

async function stubSprintSession(page: Page, startBodies: Array<{ elo_type?: string }>) {
  await page.route('**/api/v2/me/sprints**', async (route) => {
    const request = route.request()
    const requestURL = new URL(request.url())
    const method = request.method()

    if (method === 'POST' && requestURL.pathname === '/api/v2/me/sprints') {
      const body = request.postDataJSON() as { elo_type?: string }
      startBodies.push(body)
      const eloType = body.elo_type || 'mixed 5/20'
      await fulfillJSON(route, {
        sprint_id: 'sprint-core-e2e',
        status: 'active',
        mode: eloType.includes('arrowduel') ? 'arrow_duel' : 'regular',
        theme: eloType.split(' ')[0] || 'mixed',
        target_puzzles: 5,
        time_limit_seconds: 300,
        max_mistakes: 2,
        mistakes_made: 0,
        puzzles_solved: 0,
        time_remaining_seconds: 300,
        started_at: now,
        ended_at: null,
        duration_seconds: null,
        elo: {
          elo_type: eloType,
          rating_before: 1200,
          rating_after: null,
          rating_change: null,
          rating_deviation: 80,
          is_provisional: false,
        },
      })
      return
    }

    if (method === 'POST' && requestURL.pathname === '/api/v2/me/sprints/sprint-core-e2e/puzzles:draw') {
      await fulfillJSON(route, {
        puzzles: Array.from({ length: 5 }, (_, index) => ({
          sprint_puzzle_id: `sp-${index + 1}`,
          sequence: index + 1,
          puzzle_source: 'lichess',
          puzzle_id: `lichess-core-${index + 1}`,
          mode: 'regular',
          fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3',
          solution_moves: ['f3e5'],
          rating: 1200 + index,
          themes: ['fork'],
        })),
      })
      return
    }

    await route.fulfill({ status: 405, body: 'method not allowed' })
  })
}

async function stubStockfish(page: Page) {
  await page.route('**/stockfish/sf16-7.js', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/javascript',
      body: `
        window.Sf167Web = async function () {
          return {
            listen: null,
            uci: function (command) {
              if (command === 'uci' && typeof this.listen === 'function') {
                setTimeout(() => this.listen('uciok'), 0)
              }
              if (command === 'isready' && typeof this.listen === 'function') {
                setTimeout(() => this.listen('readyok'), 0)
              }
            },
            terminate: function () {},
          }
        }
      `,
    })
  })
}

function sprintStatsResponse() {
  return {
    range: { from: '2025-06-20T00:00:00Z', to: '2026-06-20T00:00:00Z' },
    group_by: 'day',
    group_length: 1,
    summary: {
      started_count: 10,
      completed_count: 8,
      won_count: 6,
      failed_time_count: 1,
      failed_mistakes_count: 1,
      abandoned_count: 2,
      puzzles_solved: 42,
      puzzles_failed: 7,
      sprint_total_duration_seconds: 1800,
    },
    series: [
      {
        start: '2026-06-20T00:00:00Z',
        end: '2026-06-21T00:00:00Z',
        summary: {
          started_count: 2,
          completed_count: 2,
          won_count: 2,
          failed_time_count: 0,
          failed_mistakes_count: 0,
          abandoned_count: 0,
          puzzles_solved: 10,
          puzzles_failed: 1,
          sprint_total_duration_seconds: 600,
        },
      },
    ],
  }
}

function statsResponse(overrides: Record<string, unknown> = {}) {
  return {
    range: { from: '2026-03-20T00:00:00Z', to: '2026-06-20T00:00:00Z' },
    summary: { total_puzzles: 12, unique_games: 18, average_move_length: 3.4 },
    buckets: {
      tag: [{ key: 'fork', count: 3 }],
      game_move_bucket: [{ key: '21-40', min_move: 21, max_move: 40, count: 5 }],
      user_color: [{ key: 'white', count: 7 }, { key: 'black', count: 5 }],
      move_length: [{ key: 2, count: 4 }, { key: 3, count: 8 }],
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

function gameReviewInsightsBundle() {
  const emptyStats = statsResponse()
  return {
    filters: { platform: 'lichess.org', username: 'e2e_lichess' },
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
    blindspots: [{ tag: 'fork', missed_count: 3, total_count: 5, miss_rate: 0.6 }],
    phase_breakdown: [{ game_phase: 'middlegame', missed_count: 5 }],
    series: [{
      start: '2026-06-01T00:00:00Z',
      end: '2026-06-08T00:00:00Z',
      games: 8,
      missed_opportunities: 2,
      missed_attacks: 1,
      missed_attack_rate: 0.2,
    }],
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
          ], 4),
          statsSeriesPoint('2026-06-08T00:00:00Z', '2026-06-15T00:00:00Z', [
            { key: 'missed_attack', count: 2 },
            { key: 'caught_attack', count: 7 },
          ], 5),
        ],
      }),
      my_mistakes_series: statsResponse({
        series: [
          statsSeriesPoint('2026-06-01T00:00:00Z', '2026-06-08T00:00:00Z', [
            { key: 'own_mistake_punished', count: 6 },
          ], 3),
          statsSeriesPoint('2026-06-08T00:00:00Z', '2026-06-15T00:00:00Z', [
            { key: 'own_mistake_punished', count: 2 },
          ], 2),
        ],
      }),
      opponent_missed_3m: emptyStats,
      opponent_caught_3m: emptyStats,
      opponent_missed_3_to_6m: emptyStats,
      opponent_caught_3_to_6m: emptyStats,
      my_mistakes_3m: emptyStats,
      opponent_missed_all_time: emptyStats,
      opponent_caught_all_time: emptyStats,
      my_mistakes_all_time: emptyStats,
    },
  }
}
