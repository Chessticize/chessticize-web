import { expect, test, type Page, type Route, type TestInfo } from '@playwright/test'
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
  elos: [
    {
      elo_type: 'mixed 5/20',
      rating: 1200,
      rating_deviation: 80,
      is_provisional: false,
      updated_at: now,
    },
  ],
}

test.describe('Sprint v2 API migration', () => {
  test.beforeEach(async ({ page }) => {
    await signInWithTestToken(page)
    await stubStockfish(page)
    await stubBootstrap(page)
  })

  test('starts, draws, and finishes a sprint through v2 endpoints', async ({ page }, testInfo) => {
    const legacyRequests = collectLegacyRequests(page)
    const startBodies: unknown[] = []
    const drawBodies: unknown[] = []
    const finishBodies: unknown[] = []
    const failedAttemptReads: string[] = []

    await stubSprintApi(page, { startBodies, drawBodies, finishBodies, failedAttemptReads })

    await page.goto('/puzzle-sprint/sprint')

    await expect(page.getByText('Your turn')).toBeVisible()
    await expect(page.getByText('Success 0/5')).toBeVisible()
    await attachScreenshot(page, testInfo, 'sprint-v2-loaded')
    await expectNoHorizontalOverflow(page)

    await page.getByRole('button', { name: 'Abandon' }).click()
    const abandonDialog = page.getByRole('alertdialog', { name: 'Abandon Sprint?' })
    await expect(abandonDialog).toBeVisible()
    await abandonDialog.getByRole('button', { name: 'Abandon Sprint' }).click()

    await expect(page.getByText('Sprint Abandoned')).toBeVisible()
    await attachScreenshot(page, testInfo, 'sprint-v2-abandoned')
    await expectNoHorizontalOverflow(page)

    const failedAttempts = await page.evaluate(async () => {
      const response = await fetch('/api/v2/me/sprints/sprint-e2e/attempts?status=failed&include_puzzle=true&offset=0&limit=100')
      if (!response.ok) throw new Error(`failed attempts read failed: ${response.status}`)
      return await response.json()
    })

    expect(startBodies[0]).toEqual({ elo_type: 'mixed 5/20' })
    expect(drawBodies[0]).toEqual({ count: 5 })
    await expect.poll(() => finishBodies).toEqual([
      {
        client_final_counts: {
          puzzles_solved: 0,
          mistakes_made: 0,
        },
      },
    ])
    expect(failedAttemptReads).toEqual(['/api/v2/me/sprints/sprint-e2e/attempts?status=failed&include_puzzle=true&offset=0&limit=100'])
    expect(failedAttempts).toEqual({
      attempts: [failedSprintAttempt()],
      total_count: 1,
      offset: 0,
      limit: 100,
    })
    expect(legacyRequests).toEqual([])
  })

  test('starts, draws, and finishes an arrow-duel sprint through v2 endpoints', async ({ page }, testInfo) => {
    const legacyRequests = collectLegacyRequests(page)
    const startBodies: unknown[] = []
    const drawBodies: unknown[] = []
    const finishBodies: unknown[] = []
    const failedAttemptReads: string[] = []

    await stubSprintApi(page, { startBodies, drawBodies, finishBodies, failedAttemptReads })

    await page.goto('/puzzle-sprint/arrow-duel')

    await expect(page.getByText('Arrow Duel')).toBeVisible()
    await expect(page.getByText('Choose the better move for white between the two arrows.')).toBeVisible()
    await expect(page.getByText('Success 0/5')).toBeVisible()
    await attachScreenshot(page, testInfo, 'arrow-duel-sprint-v2-loaded')
    await expectNoHorizontalOverflow(page)

    await page.getByRole('button', { name: 'Abandon' }).click()
    const abandonDialog = page.getByRole('alertdialog', { name: 'Abandon Sprint?' })
    await expect(abandonDialog).toBeVisible()
    await abandonDialog.getByRole('button', { name: 'Abandon Sprint' }).click()

    await expect(page.getByText('Sprint Abandoned')).toBeVisible()
    await attachScreenshot(page, testInfo, 'arrow-duel-sprint-v2-abandoned')
    await expectNoHorizontalOverflow(page)

    const failedAttempts = await page.evaluate(async () => {
      const response = await fetch('/api/v2/me/sprints/sprint-e2e/attempts?status=failed&include_puzzle=true&offset=0&limit=100')
      if (!response.ok) throw new Error(`failed attempts read failed: ${response.status}`)
      return await response.json()
    })

    expect(startBodies[0]).toEqual({ elo_type: 'arrowduel 5/30' })
    expect(drawBodies[0]).toEqual({ count: 5 })
    await expect.poll(() => finishBodies).toEqual([
      {
        client_final_counts: {
          puzzles_solved: 0,
          mistakes_made: 0,
        },
      },
    ])
    expect(failedAttemptReads).toEqual(['/api/v2/me/sprints/sprint-e2e/attempts?status=failed&include_puzzle=true&offset=0&limit=100'])
    expect(failedAttempts).toEqual({
      attempts: [failedSprintAttempt('arrow_duel')],
      total_count: 1,
      offset: 0,
      limit: 100,
    })
    expect(legacyRequests).toEqual([])
  })
})

interface StubSprintApiOptions {
  startBodies: unknown[]
  drawBodies: unknown[]
  finishBodies: unknown[]
  failedAttemptReads: string[]
}

async function stubSprintApi(page: Page, options: StubSprintApiOptions) {
  let activeMode: 'regular' | 'arrow_duel' = 'regular'
  let activeEloType = 'mixed 5/20'

  await page.route('**/api/v2/me/sprints**', async (route) => {
    const request = route.request()
    const requestURL = new URL(request.url())
    const method = request.method()

    if (method === 'POST' && requestURL.pathname === '/api/v2/me/sprints') {
      const body = request.postDataJSON() as { elo_type?: string }
      options.startBodies.push(body)
      activeEloType = body.elo_type || activeEloType
      activeMode = activeEloType.includes('arrowduel') ? 'arrow_duel' : 'regular'
      await fulfillJSON(route, sprintResponse({ status: 'active' }, { mode: activeMode, eloType: activeEloType }))
      return
    }

    if (method === 'POST' && requestURL.pathname === '/api/v2/me/sprints/sprint-e2e/puzzles:draw') {
      options.drawBodies.push(request.postDataJSON())
      await fulfillJSON(route, {
        puzzles: Array.from({ length: 5 }, (_, index) => sprintPuzzle(index + 1, activeMode)),
      })
      return
    }

    if (method === 'POST' && requestURL.pathname === '/api/v2/me/sprints/sprint-e2e:finish') {
      options.finishBodies.push(request.postDataJSON())
      await fulfillJSON(route, sprintResponse({
        status: 'completed_fail_time',
        duration_seconds: 12,
      }, { mode: activeMode, eloType: activeEloType }))
      return
    }

    if (method === 'GET' && requestURL.pathname === '/api/v2/me/sprints/sprint-e2e/attempts') {
      options.failedAttemptReads.push(`${requestURL.pathname}${requestURL.search}`)
      await fulfillJSON(route, {
        attempts: [failedSprintAttempt(activeMode)],
        total_count: 1,
        offset: 0,
        limit: 100,
      })
      return
    }

    await route.fulfill({ status: 405, body: 'method not allowed' })
  })
}

function sprintResponse(
  overrides: Partial<Record<string, unknown>> = {},
  options: { mode?: 'regular' | 'arrow_duel'; eloType?: string } = {},
) {
  const mode = options.mode || 'regular'
  const eloType = options.eloType || 'mixed 5/20'

  return {
    sprint_id: 'sprint-e2e',
    status: 'active',
    mode,
    theme: mode === 'arrow_duel' ? 'arrowduel' : 'mixed',
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
    ...overrides,
  }
}

function sprintPuzzle(sequence: number, mode: 'regular' | 'arrow_duel' = 'regular') {
  return {
    sprint_puzzle_id: `sp-${sequence}`,
    sequence,
    puzzle_source: 'lichess',
    puzzle_id: `lichess-e2e-${sequence}`,
    mode,
    fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3',
    solution_moves: ['f3e5'],
    rating: 1200 + sequence,
    themes: ['fork'],
    ...(mode === 'arrow_duel'
      ? {
        candidate_moves: [
          { move: 'f3g5', kind: 'blunder', eval_after: -100 },
          { move: 'f3e5', kind: 'best', eval_after: 60 },
        ],
        correct_move: 'f3e5',
        best_move: 'f3e5',
        best_move_eval: 60,
        position_eval_after_first_move: -100,
      }
      : {}),
  }
}

function failedSprintAttempt(mode: 'regular' | 'arrow_duel' = 'regular') {
  return {
    sprint_puzzle_id: 'sp-1',
    sequence: 1,
    puzzle_source: 'lichess',
    puzzle_id: 'lichess-e2e-1',
    status: 'failed',
    mode,
    fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3',
    solution_moves: ['f3e5'],
    rating: 1201,
    themes: ['fork'],
    moves: ['f3g5'],
    ...(mode === 'arrow_duel'
      ? {
        candidate_moves: ['f3g5', 'f3e5'],
        chosen_move: 'f3g5',
        best_move: 'f3e5',
        blunder_move: 'f3g5',
      }
      : {}),
    time_taken_ms: 3000,
    attempted_at: now,
  }
}

async function stubBootstrap(page: Page) {
  await page.route('**/api/v2/me/bootstrap', async (route) => {
    await fulfillJSON(route, bootstrapResponse)
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
