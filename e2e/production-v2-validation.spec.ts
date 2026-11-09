import { expect, test, type BrowserContext, type Page, type Response, type TestInfo } from '@playwright/test'
import { assertSafeImportRefreshCandidate, findRefreshableProfile, type ImportStatusPayload } from './production-v2-validation-guards'

const hasStorageState = Boolean(process.env.PROD_PLAYWRIGHT_STORAGE_STATE)
const hasAuthToken = Boolean(process.env.PROD_AUTH_TOKEN)
const isCI = Boolean(process.env.CI)
const runSettingsEloMutation = process.env.PROD_VALIDATE_SETTINGS_ELO === 'true'
const runSettingsProfileMutation = process.env.PROD_VALIDATE_SETTINGS_PROFILE === 'true'
const runSprintMutation = process.env.PROD_VALIDATE_SPRINT === 'true'
const runArrowDuelSprintMutation = process.env.PROD_VALIDATE_ARROW_DUEL_SPRINT === 'true'
const runGameReviewImportRefresh = process.env.PROD_VALIDATE_GAME_REVIEW_IMPORT_REFRESH === 'true'

test.describe('Production v2 validation', () => {
  test.skip(isCI, 'Production validation is local-only and must not run in CI.')
  test.skip(!hasStorageState && !hasAuthToken, 'Set PROD_PLAYWRIGHT_STORAGE_STATE or PROD_AUTH_TOKEN to run signed-in production validation.')

  test.beforeEach(async ({ context }) => {
    await installAuthCookies(context)
  })

  test('validates Settings uses signed-in v2 APIs without legacy requests', async ({ page }, testInfo) => {
    const legacyRequests = collectLegacyRequests(page)
    const bootstrap = waitForV2Path(page, '/api/v2/me/bootstrap')
    const profiles = waitForV2Request(page, 'GET', '/api/v2/me/chess-profiles')

    await page.goto('/settings')
    await Promise.all([bootstrap, profiles])

    await expect(page).not.toHaveURL(/\/auth(?:$|\?)/)
    await expect(page.getByRole('heading', { name: 'Settings', exact: true })).toBeVisible()
    await expect(page.getByText('Chess Profiles')).toBeVisible()
    await expect(page.getByText('ELO Settings')).toBeVisible()
    await expect(page.getByLabel(/Standard Sprint/)).toBeVisible()
    await expect(page.getByLabel(/Blitz Sprint/)).toBeVisible()
    await expect(page.getByLabel(/Arrow Duel/)).toBeVisible()
    await attachScreenshot(page, testInfo, 'prod-settings-v2')
    await expectNoHorizontalOverflow(page)

    expect(legacyRequests).toEqual([])
  })

  test('validates Settings ELO save through v2 with explicit restore', async ({ page }, testInfo) => {
    test.skip(!runSettingsEloMutation, 'Set PROD_VALIDATE_SETTINGS_ELO=true only for a dedicated account whose ELO can be temporarily changed and restored.')

    const legacyRequests = collectLegacyRequests(page)
    const eloLabel = process.env.PROD_SETTINGS_ELO_LABEL || 'Standard Sprint'
    const eloType = process.env.PROD_SETTINGS_ELO_TYPE || 'mixed 5/20'
    const originalRating = requireEnvInt('PROD_SETTINGS_ELO_ORIGINAL_RATING')
    const testRating = requireEnvInt('PROD_SETTINGS_ELO_TEST_RATING')
    if (originalRating === testRating) {
      throw new Error('PROD_SETTINGS_ELO_TEST_RATING must differ from PROD_SETTINGS_ELO_ORIGINAL_RATING.')
    }

    await page.goto('/settings')
    await expect(page).not.toHaveURL(/\/auth(?:$|\?)/)
    await expect(page.getByRole('heading', { name: 'Settings', exact: true })).toBeVisible()
    const input = page.getByLabel(new RegExp(escapeRegExp(eloLabel)))
    await expect(input).toHaveValue(String(originalRating))
    const saveButton = page.getByRole('button', { name: 'Save ELOs' })
    let needsRestore = false

    try {
      const save = waitForV2Request(page, 'PUT', '/api/v2/me/elos')
      await input.fill(String(testRating))
      await expect(saveButton).toBeEnabled()
      await saveButton.click()
      const saveResponse = await save
      needsRestore = true
      assertEloUpdateBody(saveResponse.request().postDataJSON(), eloType, testRating)
      await expect(saveButton).toBeDisabled()
      await attachScreenshot(page, testInfo, 'prod-settings-elo-saved')
    } finally {
      if (needsRestore) {
        const restore = waitForV2Request(page, 'PUT', '/api/v2/me/elos')
        await input.fill(String(originalRating))
        await expect(saveButton).toBeEnabled()
        await saveButton.click()
        const restoreResponse = await restore
        assertEloUpdateBody(restoreResponse.request().postDataJSON(), eloType, originalRating)
        await expect(saveButton).toBeDisabled()
        await attachScreenshot(page, testInfo, 'prod-settings-elo-restored')
      }
    }

    await expectNoHorizontalOverflow(page)
    expect(legacyRequests).toEqual([])
  })

  test('validates Settings profile create and delete through v2', async ({ page }, testInfo) => {
    test.skip(!runSettingsProfileMutation, 'Set PROD_VALIDATE_SETTINGS_PROFILE=true only for a dedicated account and disposable chess profile.')

    const legacyRequests = collectLegacyRequests(page)
    const platform = requireSettingsProfilePlatform()
    const username = requireEnvString('PROD_SETTINGS_PROFILE_USERNAME')
    const inputLabel = platform === 'chess.com' ? 'Chess.com Username' : 'Lichess Username'
    const bootstrap = waitForV2Path(page, '/api/v2/me/bootstrap')
    const profiles = waitForV2Request(page, 'GET', '/api/v2/me/chess-profiles')

    await page.goto('/settings')
    const [, profilesResponse] = await Promise.all([bootstrap, profiles])
    const profilesPayload = await profilesResponse.json()
    await expect(page).not.toHaveURL(/\/auth(?:$|\?)/)
    await expect(page.getByRole('heading', { name: 'Settings', exact: true })).toBeVisible()
    if (findSettingsProfileID(profilesPayload, platform, username)) {
      throw new Error(`Settings profile validation requires ${platform} ${username} to be absent before the test starts.`)
    }
    await expect(
      page.locator('.rounded-lg.border.border-gray-200.bg-gray-50').filter({ hasText: `@${username}` }),
      `Settings profile validation requires ${platform} ${username} to be absent before the test starts.`,
    ).toHaveCount(0)

    await page.getByRole('button', { name: 'Add Profile' }).click()
    await page.getByLabel(inputLabel).fill(username)

    let profileID: string | null = null
    let createCompleted = false
    try {
      const create = waitForV2Request(page, 'POST', '/api/v2/me/chess-profiles')
      await page.getByRole('button', { name: 'Connect Profiles' }).click()
      const createResponse = await create
      createCompleted = true
      const createPayload = await createResponse.json()
      profileID = extractCreatedProfileID(createPayload) || await findSettingsProfileIDFromPage(page, platform, username)
      if (!profileID) {
        throw new Error('Settings profile create response did not include a profile_id and the created profile could not be found by platform/username.')
      }
      const createBody = createResponse.request().postDataJSON()
      expect(createBody).toEqual({ platform, username })
      await expect(page.getByText(`@${username}`)).toBeVisible()
      await attachScreenshot(page, testInfo, 'prod-settings-profile-created')
    } finally {
      if (!profileID && createCompleted) {
        profileID = await findSettingsProfileIDFromPage(page, platform, username)
      }
      if (profileID) {
        let uiDeleteError: unknown
        try {
          const deleteButton = page.getByRole('button', { name: `Delete ${platform} profile ${username}` })
          await expect(deleteButton).toBeVisible()
          const deleteRequest = waitForV2Request(page, 'DELETE', `/api/v2/me/chess-profiles/${encodeURIComponent(profileID)}`)
          await deleteButton.click()
          await page.getByRole('button', { name: 'Delete' }).click()
          await deleteRequest
        } catch (error) {
          uiDeleteError = error
          await deleteSettingsProfileFromPage(page, profileID)
        }
        await expect(page.locator('.rounded-lg.border.border-gray-200.bg-gray-50').filter({ hasText: `@${username}` })).toHaveCount(0)
        await attachScreenshot(page, testInfo, 'prod-settings-profile-deleted')
        if (uiDeleteError) {
          throw uiDeleteError
        }
      }
    }

    await expectNoHorizontalOverflow(page)
    expect(legacyRequests).toEqual([])
  })

  test('validates Game Review uses bundled v2 insights without legacy requests', async ({ page }, testInfo) => {
    const legacyRequests = collectLegacyRequests(page)
    const insights = waitForV2Path(page, '/api/v2/me/insights/game-review')

    await page.goto('/game-review')
    const response = await insights
    const requestedURL = new URL(response.url())
    expect(requestedURL.searchParams.get('include_stats_bundle')).toBe('true')

    await expect(page).not.toHaveURL(/\/auth(?:$|\?)/)
    await expect(page.getByRole('heading', { name: 'Game Review & Analysis' })).toBeVisible()
    await attachScreenshot(page, testInfo, 'prod-game-review-v2')
    await expectNoHorizontalOverflow(page)

    expect(legacyRequests).toEqual([])
  })

  test('validates Review Queue reads scoped v2 stats and list data without mutations', async ({ page }, testInfo) => {
    const legacyRequests = collectLegacyRequests(page)
    const stats = waitForV2Request(page, 'GET', '/api/v2/me/review-queue/stats')
    const list = waitForV2Request(page, 'GET', '/api/v2/me/review-queue')

    await page.goto('/review-queue?mode=arrow_duel&puzzle_source=user_game&due=all&theme_groups=missed_attack')
    const [statsResponse, listResponse] = await Promise.all([stats, list])
    const statsURL = new URL(statsResponse.url())
    const listURL = new URL(listResponse.url())

    expect(statsURL.searchParams.get('mode')).toBe('arrow_duel')
    expect(statsURL.searchParams.get('puzzle_source')).toBe('user_game')
    expect(statsURL.searchParams.get('theme_groups')).toBe('missed_attack')
    expect(listURL.searchParams.get('mode')).toBe('arrow_duel')
    expect(listURL.searchParams.get('puzzle_source')).toBe('user_game')
    expect(listURL.searchParams.get('due')).toBe('all')
    expect(listURL.searchParams.get('theme_groups')).toBe('missed_attack')

    await expect(page).not.toHaveURL(/\/auth(?:$|\?)/)
    await expect(page.getByRole('heading', { name: 'Review Queue', level: 1 })).toBeVisible()
    await expect(page.getByLabel('Mode')).toHaveValue('arrow_duel')
    await expect(page.getByLabel('Source')).toHaveValue('user_game')
    await expect(page.getByLabel('Due')).toHaveValue('all')
    await expect(page.getByLabel('Theme Scope')).toHaveValue('missed_attack')
    await attachScreenshot(page, testInfo, 'prod-review-queue-v2')
    await expectNoHorizontalOverflow(page)

    expect(legacyRequests).toEqual([])
  })

  test('validates attempt-stats public context filters without mutations', async ({ page }, testInfo) => {
    const legacyRequests = collectLegacyRequests(page)

    await page.goto('/settings')
    await expect(page).not.toHaveURL(/\/auth(?:$|\?)/)

    const unfiltered = await fetchAPIStatusFromPage(page, '/api/v2/me/stats/attempts?days=90')
    const review = await fetchAPIStatusFromPage(page, '/api/v2/me/stats/attempts?days=90&context=review')
    const sprint = await fetchAPIStatusFromPage(page, '/api/v2/me/stats/attempts?days=90&context=sprint')
    const legacyEvent = await fetchAPIStatusFromPage(page, '/api/v2/me/stats/attempts?days=90&context=legacy_event')

    expect(unfiltered.status).toBe(200)
    expect(review.status).toBe(200)
    expect(sprint.status).toBe(200)
    expect(legacyEvent.status).toBe(400)
    await attachScreenshot(page, testInfo, 'prod-attempt-stats-context-filters')
    await expectNoHorizontalOverflow(page)

    expect(legacyRequests).toEqual([])
  })

  test('validates Lichess arrow-duel Review Queue reads v2 stats and list data without mutations', async ({ page }, testInfo) => {
    const legacyRequests = collectLegacyRequests(page)
    const stats = waitForV2Request(page, 'GET', '/api/v2/me/review-queue/stats')
    const list = waitForV2Request(page, 'GET', '/api/v2/me/review-queue')

    await page.goto('/review-queue?mode=arrow_duel&puzzle_source=lichess&due=all')
    const [statsResponse, listResponse] = await Promise.all([stats, list])
    const statsURL = new URL(statsResponse.url())
    const listURL = new URL(listResponse.url())

    expect(statsURL.searchParams.get('mode')).toBe('arrow_duel')
    expect(statsURL.searchParams.get('puzzle_source')).toBe('lichess')
    expect(statsURL.searchParams.has('theme_groups')).toBe(false)
    expect(listURL.searchParams.get('mode')).toBe('arrow_duel')
    expect(listURL.searchParams.get('puzzle_source')).toBe('lichess')
    expect(listURL.searchParams.get('due')).toBe('all')
    expect(listURL.searchParams.has('theme_groups')).toBe(false)

    await expect(page).not.toHaveURL(/\/auth(?:$|\?)/)
    await expect(page.getByRole('heading', { name: 'Review Queue', level: 1 })).toBeVisible()
    await expect(page.getByLabel('Mode')).toHaveValue('arrow_duel')
    await expect(page.getByLabel('Source')).toHaveValue('lichess')
    await expect(page.getByLabel('Due')).toHaveValue('all')
    await expect(page.getByLabel('Theme Scope')).toBeDisabled()
    await attachScreenshot(page, testInfo, 'prod-review-queue-lichess-arrow-duel-v2')
    await expectNoHorizontalOverflow(page)

    expect(legacyRequests).toEqual([])
  })

  test('validates Game Review import refresh only on a safe validation profile', async ({ page }, testInfo) => {
    test.skip(!runGameReviewImportRefresh, 'Set PROD_VALIDATE_GAME_REVIEW_IMPORT_REFRESH=true only for a dedicated profile where refresh is safe.')

    const legacyRequests = collectLegacyRequests(page)
    const initialStatus = waitForV2Path(page, '/api/v2/me/import-status')

    await page.goto('/game-review')
    const initialStatusPayload = await (await initialStatus).json()
    assertSafeImportRefreshCandidate(initialStatusPayload)

    const refreshableProfile = findRefreshableProfile(initialStatusPayload)
    if (!refreshableProfile?.profile_id) {
      throw new Error('Game Review import refresh validation requires at least one connected chess profile.')
    }

    await expect(page.getByRole('heading', { name: 'Game Review & Analysis' })).toBeVisible()
    await expect(page.getByRole('button', { name: /Start Import|Retry Import/ })).toBeVisible()
    await attachScreenshot(page, testInfo, 'prod-game-review-import-ready')

    const refresh = waitForV2Request(
      page,
      'POST',
      '/api/v2/me/chess-profiles/',
      ':refresh',
      encodeURIComponent(refreshableProfile.profile_id),
    )
    const importJob = waitForV2RequestPrefix(page, 'GET', '/api/v2/me/import-jobs/')
    const refreshedStatus = waitForV2Path(page, '/api/v2/me/import-status')
    await page.getByRole('button', { name: /Start Import|Retry Import/ }).click()
    const refreshResponse = await refresh
    const jobResponse = await importJob
    const refreshedStatusResponse = await refreshedStatus
    const refreshPayload = await refreshResponse.json()
    const jobPayload = await jobResponse.json()
    const refreshedStatusPayload = await refreshedStatusResponse.json()
    const expectedProgress = getExpectedImportProgress(
      refreshedStatusPayload,
      jobPayload,
      refreshableProfile.profile_id,
    )

    expect(new URL(refreshResponse.url()).pathname).toContain(encodeURIComponent(refreshableProfile.profile_id))
    expect(refreshPayload.profile_id).toBe(refreshableProfile.profile_id)
    expect(refreshPayload.job_id, 'Import refresh response should include a job_id.').toBeTruthy()
    expect(new URL(jobResponse.url()).pathname).toContain(encodeURIComponent(refreshPayload.job_id))
    expect(jobPayload.profile_id).toBe(refreshableProfile.profile_id)
    expect(jobPayload.job_id).toBe(refreshPayload.job_id)
    await expect(page.getByRole('button', { name: /Import Queued|Import Running|Start Import|Retry Import/ })).toBeVisible()
    await expect(page.getByRole('group', { name: `Games imported: ${expectedProgress.gamesImported}` })).toBeVisible()
    await expect(page.getByRole('group', { name: `Games analyzed: ${expectedProgress.gamesAnalyzed}` })).toBeVisible()
    await expect(page.getByRole('group', { name: `Puzzles generated: ${expectedProgress.puzzlesGenerated}` })).toBeVisible()
    await attachScreenshot(page, testInfo, 'prod-game-review-import-refreshed')
    await expectNoHorizontalOverflow(page)

    expect(legacyRequests).toEqual([])
  })

  test('validates sprint start, finish, and failed-attempt reads through v2', async ({ page }, testInfo) => {
    test.skip(!runSprintMutation, 'Set PROD_VALIDATE_SPRINT=true to run sprint mutation validation on a dedicated account.')

    const legacyRequests = collectLegacyRequests(page)
    const sprintCreate = waitForV2Request(page, 'POST', '/api/v2/me/sprints')
    const draw = waitForV2Path(page, '/api/v2/me/sprints/', '/puzzles:draw')

    await page.goto('/puzzle-sprint/sprint')
    const sprintCreateResponse = await sprintCreate
    const sprintID = await getSprintID(sprintCreateResponse)
    await draw
    await expect(page.getByText(/Success|Mistakes|Time/)).toBeVisible()
    await attachScreenshot(page, testInfo, 'prod-sprint-v2-started')

    const finish = waitForV2Path(page, '/api/v2/me/sprints/', ':finish')
    const abandonButton = page.getByRole('button', { name: /abandon|end|finish|exit/i }).first()
    await abandonButton.click()
    const confirmButton = page.getByRole('button', { name: /abandon|end|finish|confirm/i }).last()
    await confirmButton.click()
    await finish

    const failedAttemptsURL = new URL(`/api/v2/me/sprints/${encodeURIComponent(sprintID)}/attempts`, page.url())
    failedAttemptsURL.searchParams.set('status', 'failed')
    failedAttemptsURL.searchParams.set('include_puzzle', 'true')
    failedAttemptsURL.searchParams.set('offset', '0')
    failedAttemptsURL.searchParams.set('limit', '100')

    const failedAttemptsPayload = await fetchJSONFromPage(page, failedAttemptsURL.toString())
    expect(Array.isArray(failedAttemptsPayload.attempts)).toBe(true)
    expect(typeof failedAttemptsPayload.total_count).toBe('number')
    expect(failedAttemptsPayload.offset).toBe(0)
    expect(failedAttemptsPayload.limit).toBe(100)
    for (const attempt of failedAttemptsPayload.attempts) {
      expect(attempt.status).toBe('failed')
      expect(typeof attempt.sprint_puzzle_id).toBe('string')
      expect(typeof attempt.sequence).toBe('number')
      expect(typeof attempt.puzzle_id).toBe('string')
      expect(typeof attempt.fen).toBe('string')
      expect(Array.isArray(attempt.solution_moves)).toBe(true)
      expect(Array.isArray(attempt.themes)).toBe(true)
    }

    await attachScreenshot(page, testInfo, 'prod-sprint-v2-finished')
    await expectNoHorizontalOverflow(page)
    expect(legacyRequests).toEqual([])
  })

  test('validates arrow-duel sprint start, finish, and failed-attempt reads through v2', async ({ page }, testInfo) => {
    test.skip(!runArrowDuelSprintMutation, 'Set PROD_VALIDATE_ARROW_DUEL_SPRINT=true to run arrow-duel sprint mutation validation on a dedicated account.')

    const legacyRequests = collectLegacyRequests(page)
    const sprintCreate = waitForV2Request(page, 'POST', '/api/v2/me/sprints')
    const draw = waitForV2Path(page, '/api/v2/me/sprints/', '/puzzles:draw')

    await page.goto('/puzzle-sprint/arrow-duel')
    const sprintCreateResponse = await sprintCreate
    const sprintCreateBody = sprintCreateResponse.request().postDataJSON()
    expect(sprintCreateBody).toEqual({ elo_type: 'arrowduel 5/30' })
    const sprintID = await getSprintID(sprintCreateResponse)
    await draw
    await expect(page.getByText(/Success|Mistakes|Time/)).toBeVisible()
    await attachScreenshot(page, testInfo, 'prod-arrow-duel-sprint-v2-started')

    const finish = waitForV2Path(page, '/api/v2/me/sprints/', ':finish')
    const abandonButton = page.getByRole('button', { name: /abandon|end|finish|exit/i }).first()
    await abandonButton.click()
    const confirmButton = page.getByRole('button', { name: /abandon|end|finish|confirm/i }).last()
    await confirmButton.click()
    await finish

    const failedAttemptsURL = new URL(`/api/v2/me/sprints/${encodeURIComponent(sprintID)}/attempts`, page.url())
    failedAttemptsURL.searchParams.set('status', 'failed')
    failedAttemptsURL.searchParams.set('include_puzzle', 'true')
    failedAttemptsURL.searchParams.set('offset', '0')
    failedAttemptsURL.searchParams.set('limit', '100')

    const failedAttemptsPayload = await fetchJSONFromPage(page, failedAttemptsURL.toString())
    expect(Array.isArray(failedAttemptsPayload.attempts)).toBe(true)
    expect(typeof failedAttemptsPayload.total_count).toBe('number')
    expect(failedAttemptsPayload.offset).toBe(0)
    expect(failedAttemptsPayload.limit).toBe(100)
    for (const attempt of failedAttemptsPayload.attempts) {
      expect(attempt.status).toBe('failed')
      expect(attempt.mode).toBe('arrow_duel')
      expect(typeof attempt.sprint_puzzle_id).toBe('string')
      expect(typeof attempt.sequence).toBe('number')
      expect(typeof attempt.puzzle_id).toBe('string')
      expect(typeof attempt.fen).toBe('string')
      expect(Array.isArray(attempt.candidate_moves)).toBe(true)
    }

    await attachScreenshot(page, testInfo, 'prod-arrow-duel-sprint-v2-finished')
    await expectNoHorizontalOverflow(page)
    expect(legacyRequests).toEqual([])
  })
})

type SprintFailedAttemptsPayload = {
  attempts: Array<Record<string, unknown>>
  total_count: number
  offset: number
  limit: number
}

type SettingsEloUpdateBody = {
  updates?: Array<{
    elo_type?: string
    rating?: number
    rating_deviation?: number
  }>
}

type SettingsProfilesPayload = {
  profiles?: Array<{
    id?: unknown
    profile_id?: unknown
    platform?: unknown
    username?: unknown
  }>
}

async function installAuthCookies(context: BrowserContext) {
  const authToken = process.env.PROD_AUTH_TOKEN
  if (!authToken) return

  const baseURL = process.env.PROD_PLAYWRIGHT_BASE_URL || 'https://www.chessticize.com'
  const domain = new URL(baseURL).hostname
  const tokenExpiry = process.env.PROD_TOKEN_EXPIRY || new Date(Date.now() + 60 * 60 * 1000).toISOString()

  await context.addCookies([
    {
      name: 'auth_token',
      value: authToken,
      domain,
      path: '/',
      sameSite: 'Strict',
      expires: Math.floor(new Date(tokenExpiry).getTime() / 1000),
    },
    {
      name: 'token_expiry',
      value: encodeURIComponent(tokenExpiry),
      domain,
      path: '/',
      sameSite: 'Strict',
      expires: Math.floor(new Date(tokenExpiry).getTime() / 1000),
    },
  ])
}

function waitForV2Path(page: Page, pathname: string, suffix?: string) {
  return page.waitForResponse(response => {
    const url = new URL(response.url())
    const matchesPath = suffix
      ? url.pathname.startsWith(pathname) && url.pathname.endsWith(suffix)
      : url.pathname === pathname
    return response.ok() && matchesPath
  })
}

function waitForV2Request(page: Page, method: string, pathname: string, suffix?: string, contains?: string) {
  return page.waitForResponse(response => {
    const url = new URL(response.url())
    const matchesPath = suffix
      ? url.pathname.startsWith(pathname) && url.pathname.endsWith(suffix)
      : url.pathname === pathname || (contains ? url.pathname.startsWith(pathname) && url.pathname.includes(contains) : false)
    return response.ok()
      && response.request().method() === method
      && matchesPath
  })
}

function waitForV2RequestPrefix(page: Page, method: string, pathnamePrefix: string) {
  return page.waitForResponse(response => {
    const url = new URL(response.url())
    return response.ok()
      && response.request().method() === method
      && url.pathname.startsWith(pathnamePrefix)
  })
}

function getExpectedImportProgress(
  statusPayload: ImportStatusPayload,
  jobPayload: Record<string, unknown>,
  profileID: string,
) {
  const profile = statusPayload.profiles?.find(candidate => candidate.profile_id === profileID)

  return {
    gamesImported: formatImportProgressValue(profile?.games_imported ?? jobPayload.games_imported ?? profile?.games_fetched),
    gamesAnalyzed: formatImportProgressValue(profile?.games_analyzed ?? jobPayload.games_analyzed),
    puzzlesGenerated: formatImportProgressValue(profile?.puzzles_generated ?? jobPayload.puzzles_generated),
  }
}

function formatImportProgressValue(value: unknown): string {
  return typeof value === 'number' ? String(value) : 'Pending'
}

function requireEnvString(name: string): string {
  const value = process.env[name]?.trim()
  if (!value) {
    throw new Error(`${name} is required for this production validation check.`)
  }
  return value
}

function requireEnvInt(name: string): number {
  const raw = requireEnvString(name)
  const value = Number.parseInt(raw, 10)
  if (!Number.isInteger(value) || value < 600 || value > 2700) {
    throw new Error(`${name} must be an integer rating between 600 and 2700.`)
  }
  return value
}

function requireSettingsProfilePlatform(): 'lichess.org' | 'chess.com' {
  const platform = requireEnvString('PROD_SETTINGS_PROFILE_PLATFORM')
  if (platform !== 'lichess.org' && platform !== 'chess.com') {
    throw new Error('PROD_SETTINGS_PROFILE_PLATFORM must be lichess.org or chess.com.')
  }
  return platform
}

function assertEloUpdateBody(body: unknown, eloType: string, rating: number) {
  const payload = body as SettingsEloUpdateBody
  expect(payload.updates).toEqual([
    {
      elo_type: eloType,
      rating,
      rating_deviation: 50,
    },
  ])
}

function extractCreatedProfileID(payload: unknown): string | null {
  const body = payload as { profile_id?: unknown; profile?: { profile_id?: unknown; id?: unknown } }
  const profileID = body.profile_id || body.profile?.profile_id || body.profile?.id
  return typeof profileID === 'string' && profileID.length > 0 ? profileID : null
}

function findSettingsProfileID(payload: unknown, platform: 'lichess.org' | 'chess.com', username: string): string | null {
  const body = payload as SettingsProfilesPayload
  const profile = body.profiles?.find(candidate => (
    candidate.platform === platform && candidate.username === username
  ))
  const profileID = profile?.profile_id || profile?.id
  return typeof profileID === 'string' && profileID.length > 0 ? profileID : null
}

async function findSettingsProfileIDFromPage(page: Page, platform: 'lichess.org' | 'chess.com', username: string): Promise<string | null> {
  const payload = await fetchSettingsProfilesFromPage(page)
  return findSettingsProfileID(payload, platform, username)
}

async function fetchSettingsProfilesFromPage(page: Page): Promise<SettingsProfilesPayload> {
  return await page.evaluate(async () => {
    const authCookie = document.cookie
      .split('; ')
      .find((cookie) => cookie.startsWith('auth_token='))
    const token = authCookie ? decodeURIComponent(authCookie.split('=').slice(1).join('=')) : ''
    const headers: Record<string, string> = {}
    if (token) {
      headers.Authorization = `Bearer ${token}`
    }

    const response = await fetch('/api/v2/me/chess-profiles', { headers })
    if (!response.ok) {
      throw new Error(`Failed to fetch Settings profiles for cleanup: ${response.status} ${response.statusText}`)
    }
    return await response.json()
  })
}

async function deleteSettingsProfileFromPage(page: Page, profileID: string) {
  await page.evaluate(async (id) => {
    const authCookie = document.cookie
      .split('; ')
      .find((cookie) => cookie.startsWith('auth_token='))
    const token = authCookie ? decodeURIComponent(authCookie.split('=').slice(1).join('=')) : ''
    const headers: Record<string, string> = {}
    if (token) {
      headers.Authorization = `Bearer ${token}`
    }

    const response = await fetch(`/api/v2/me/chess-profiles/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers,
    })
    if (!response.ok) {
      throw new Error(`Failed to delete Settings profile during cleanup: ${response.status} ${response.statusText}`)
    }
  }, profileID)
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

async function getSprintID(response: Response) {
  const payload = await response.json()
  const sprintID = payload.sprint_id || payload.session_id
  if (typeof sprintID !== 'string' || sprintID.length === 0) {
    throw new Error('Sprint create response did not include a sprint_id')
  }
  return sprintID
}

async function fetchJSONFromPage(page: Page, url: string): Promise<SprintFailedAttemptsPayload> {
  return await page.evaluate(async (requestURL) => {
    const authCookie = document.cookie
      .split('; ')
      .find((cookie) => cookie.startsWith('auth_token='))
    const token = authCookie ? decodeURIComponent(authCookie.split('=').slice(1).join('=')) : ''
    const headers: Record<string, string> = {}
    if (token) {
      headers.Authorization = `Bearer ${token}`
    }

    const response = await fetch(requestURL, { headers })
    if (!response.ok) {
      throw new Error(`Failed to fetch sprint failed attempts: ${response.status} ${response.statusText}`)
    }
    return await response.json()
  }, url)
}

async function fetchAPIStatusFromPage(page: Page, pathAndQuery: string): Promise<{ status: number }> {
  return await page.evaluate(async (requestPath) => {
    const authCookie = document.cookie
      .split('; ')
      .find((cookie) => cookie.startsWith('auth_token='))
    const token = authCookie ? decodeURIComponent(authCookie.split('=').slice(1).join('=')) : ''
    const headers: Record<string, string> = {}
    if (token) {
      headers.Authorization = `Bearer ${token}`
    }

    const response = await fetch(requestPath, { headers })
    return { status: response.status }
  }, pathAndQuery)
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
