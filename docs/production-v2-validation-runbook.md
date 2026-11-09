# Production v2 Validation Runbook

## Purpose

Run signed-in production checks manually without adding production auth secrets
to CI. These checks are operator-owned follow-up evidence; they should not block
a well-tested code PR when local tests, Firebase-emulator coverage, CI, and
review have already passed.

## Safety Rules

- Use a dedicated validation account for sprint or import-refresh mutations.
- Do not run this suite in CI.
- Do not commit storage-state files, auth tokens, Playwright reports,
  screenshots, traces, or videos.
- Prefer storage state under `.auth/` or `playwright/.auth/`; both directories
  are ignored by git.
- Run import refresh only when the account has exactly one connected profile,
  that profile is `not_started` or `failed`, and every import progress counter
  is zero.
- Skip any mutation that is not safe for the selected production account.

## Preflight

Confirm the production API is up:

```sh
curl -fsS https://chessticize-server-9ddca5bcf137.herokuapp.com/health
```

Create or provide one of these auth inputs:

- `PROD_PLAYWRIGHT_STORAGE_STATE=/absolute/path/to/signed-in-storage-state.json`
- `PROD_AUTH_TOKEN=<short-lived validation-account token>`

The production Playwright config fails fast if
`PROD_PLAYWRIGHT_STORAGE_STATE` points to a missing file. That is intentional:
it catches typoed paths before the run falls through to unauthenticated
redirects.

Run the local-safe harness guard tests without production credentials:

```sh
pnpm test:prod-validation-guards
```

## Read-Only Check

This checks Settings, Game Review, and read-only Review Queue paths for v2
signed-in APIs and rejects active requests to `/api/v1/` or `/graphql`.

```sh
PROD_PLAYWRIGHT_BASE_URL=https://www.chessticize.com \
PROD_PLAYWRIGHT_STORAGE_STATE=/absolute/path/to/signed-in-storage-state.json \
pnpm test:e2e:prod
```

Expected result:

- Settings loads without redirecting to auth.
- Settings requests `/api/v2/me/bootstrap` and
  `/api/v2/me/chess-profiles`.
- Game Review requests `/api/v2/me/insights/game-review` with
  `include_stats_bundle=true`.
- Review Queue requests scoped `/api/v2/me/review-queue/stats` and
  `/api/v2/me/review-queue` reads for
  `mode=arrow_duel`, `puzzle_source=user_game`, `due=all`, and
  `theme_groups=missed_attack`.
- Review Queue also requests scoped reads for
  `mode=arrow_duel`, `puzzle_source=lichess`, and `due=all`, with no
  `theme_groups` parameter. The Theme Scope control should be disabled for
  Lichess source.
- The run reports no `/api/v1/` or `/graphql` requests.
- The page has no horizontal overflow in the checked viewport.

## Sprint Mutation Check

Run only on a dedicated validation account. Standard sprint and arrow-duel
sprint validation are separate opt-in checks so one smoke does not
unexpectedly create both sprint types.

```sh
PROD_VALIDATE_SPRINT=true \
PROD_PLAYWRIGHT_BASE_URL=https://www.chessticize.com \
PROD_PLAYWRIGHT_STORAGE_STATE=/absolute/path/to/signed-in-storage-state.json \
pnpm test:e2e:prod -- --grep "sprint"
```

Expected result:

- Sprint create uses `POST /api/v2/me/sprints`.
- Puzzle draw uses `/api/v2/me/sprints/{id}/puzzles:draw`.
- Finish uses `/api/v2/me/sprints/{id}:finish`.
- Failed-attempt readback uses `/api/v2/me/sprints/{id}/attempts`.
- No active request uses `/api/v1/` or `/graphql`.

Arrow-duel sprint validation:

```sh
PROD_VALIDATE_ARROW_DUEL_SPRINT=true \
PROD_PLAYWRIGHT_BASE_URL=https://www.chessticize.com \
PROD_PLAYWRIGHT_STORAGE_STATE=/absolute/path/to/signed-in-storage-state.json \
pnpm test:e2e:prod -- --grep "arrow-duel sprint"
```

Expected result:

- Sprint create uses `POST /api/v2/me/sprints` with
  `{"elo_type":"arrowduel 5/30"}`.
- Puzzle draw uses `/api/v2/me/sprints/{id}/puzzles:draw`.
- Finish uses `/api/v2/me/sprints/{id}:finish`.
- Failed-attempt readback uses `/api/v2/me/sprints/{id}/attempts`; if the
  account produced failed attempts, each returned attempt should be
  `mode=arrow_duel` with `candidate_moves`.
- No active request uses `/api/v1/` or `/graphql`.

## Settings Mutation Checks

Run only on a dedicated validation account. The default production validation
keeps Settings read-only; these checks are separate because they mutate account
state.

ELO save validation temporarily changes one rating, asserts the v2 request, and
then restores the original value in the same test.

```sh
PROD_VALIDATE_SETTINGS_ELO=true \
PROD_SETTINGS_ELO_LABEL="Standard Sprint" \
PROD_SETTINGS_ELO_TYPE="mixed 5/20" \
PROD_SETTINGS_ELO_ORIGINAL_RATING=1200 \
PROD_SETTINGS_ELO_TEST_RATING=1225 \
PROD_PLAYWRIGHT_BASE_URL=https://www.chessticize.com \
PROD_PLAYWRIGHT_STORAGE_STATE=/absolute/path/to/signed-in-storage-state.json \
pnpm test:e2e:prod -- --grep "Settings ELO save"
```

Expected result:

- The test fails before mutation if the current field value does not match
  `PROD_SETTINGS_ELO_ORIGINAL_RATING`.
- Save uses `PUT /api/v2/me/elos` with the configured `elo_type`, temporary
  `rating`, and `rating_deviation=50`.
- Restore uses `PUT /api/v2/me/elos` with the original rating.
- No active request uses `/api/v1/` or `/graphql`.

Profile create/delete validation creates a disposable chess profile and deletes
that same profile. Use only a profile that is safe to connect briefly.

```sh
PROD_VALIDATE_SETTINGS_PROFILE=true \
PROD_SETTINGS_PROFILE_PLATFORM=lichess.org \
PROD_SETTINGS_PROFILE_USERNAME=disposable_validation_user \
PROD_PLAYWRIGHT_BASE_URL=https://www.chessticize.com \
PROD_PLAYWRIGHT_STORAGE_STATE=/absolute/path/to/signed-in-storage-state.json \
pnpm test:e2e:prod -- --grep "Settings profile create"
```

Expected result:

- The test fails before mutation if the selected profile is already connected.
- Create uses `POST /api/v2/me/chess-profiles` with the configured platform
  and username.
- Delete uses `DELETE /api/v2/me/chess-profiles/{profile_id}` for the created
  profile.
- No active request uses `/api/v1/` or `/graphql`.

## Review Queue Check

This check can be run after a frontend deploy with any signed-in account that
has review queue rows. Starting a batch, submitting attempts, and excluding
items mutate review state, so stop after the read-only steps unless the account
is safe to mutate.

The default read-only Playwright production validation already covers the
first four steps below for both
`/review-queue?mode=arrow_duel&puzzle_source=user_game&due=all&theme_groups=missed_attack`
and `/review-queue?mode=arrow_duel&puzzle_source=lichess&due=all`.

Manual read-only path:

1. Open `/review-queue?mode=arrow_duel&puzzle_source=user_game&due=all&theme_groups=missed_attack`.
2. Confirm the page renders the Review Queue heading, scoped stats, and scoped
   list results.
3. Confirm the stats request uses
   `/api/v2/me/review-queue/stats?mode=arrow_duel&puzzle_source=user_game&theme_groups=missed_attack`.
4. Confirm the list request uses
   `/api/v2/me/review-queue?mode=arrow_duel&puzzle_source=user_game&due=all&theme_groups=missed_attack`.
5. Change filters in the page, click Apply, and confirm the browser URL updates
   with the selected `mode`, `puzzle_source`, `due`, and `theme_groups`.
6. Click Clear and confirm the browser URL returns to `/review-queue`.
7. If there is more than one page of results, use Next or Previous and confirm
   `offset` appears in the URL and in the v2 list request.

Manual Lichess read-only path:

1. Open `/review-queue?mode=arrow_duel&puzzle_source=lichess&due=all`.
2. Confirm the Theme Scope control is disabled.
3. Confirm the stats request uses
   `/api/v2/me/review-queue/stats?mode=arrow_duel&puzzle_source=lichess`.
4. Confirm the list request uses
   `/api/v2/me/review-queue?mode=arrow_duel&puzzle_source=lichess&due=all`.
5. Confirm neither request includes `theme_groups`.

Optional mutation path:

1. Click Start Review only when the scoped due count is safe to mutate.
2. Confirm draw uses `POST /api/v2/me/review-queue/puzzles:draw`.
3. Submit or exclude a drawn position only on a validation account.
4. Confirm submit uses `POST /api/v2/me/review-queue/attempts` or exclude uses
   `POST /api/v2/me/review-queue/items/{review_item_id}:exclude`.
5. Confirm no active request uses `/api/v1/` or `/graphql`.

## Import Refresh Check

Run only when the validation profile is safe to mutate.

```sh
PROD_VALIDATE_GAME_REVIEW_IMPORT_REFRESH=true \
PROD_PLAYWRIGHT_BASE_URL=https://www.chessticize.com \
PROD_PLAYWRIGHT_STORAGE_STATE=/absolute/path/to/signed-in-storage-state.json \
pnpm test:e2e:prod -- --grep "import refresh"
```

Expected result:

- The test fetches `/api/v2/me/import-status` before clicking refresh.
- The test fails before mutation unless the account has exactly one safe
  profile with zero import progress.
- Refresh uses `POST /api/v2/me/chess-profiles/{profile_id}:refresh`.
- The import job read uses `/api/v2/me/import-jobs/{job_id}`.
- The UI can show `puzzles_generated=0` as completed progress.
- No active request uses `/api/v1/` or `/graphql`.

Local page tests cover the non-mutating import-status states: queued and
running imports keep the refresh action disabled, failed imports expose a retry
action, and `puzzles_generated=0` renders as a completed counter rather than
`Pending`.

After the import has time to complete, cross-check server-side progress:

```sh
heroku run --app chessticize-server "./bin/chessticize task-import-progress-status -limit=20 -require-completed-import-progress"
```

Expected result: completed import rows include non-null `games_imported`,
`games_analyzed`, and `puzzles_generated`.

## Retired Artifact Cleanup Check

After stale helper cleanup PRs, confirm the frontend repo no longer ships
executable or generated reference artifacts that call the retired v1 REST or
GraphQL endpoints:

```sh
test ! -e worker-test
test ! -e lib/api/graphql.ts
test ! -e hooks/useGameReviewStats.ts
test ! -e __tests__/integration/graphql.test.ts
test ! -e docs/graphql
test ! -e docs/graphql-examples.md
test ! -e docs/GRAPHQL_EXAMPLES.md
test ! -e game-review-graphql-analysis.md
test ! -e docs/api-documentation.md
rg -n "worker-test|lib/api/graphql|useGameReviewStats|__tests__/integration/graphql|docs/graphql|graphql-examples|GRAPHQL_EXAMPLES|game-review-graphql-analysis|api-documentation" . \
  --glob '!node_modules' --glob '!.next' --glob '!coverage' --glob '!dist' \
  --glob '!docs/production-v2-validation-runbook.md'
```

Expected result: the `test ! -e ...` commands exit successfully and `rg`
prints no matches. Dedicated no-legacy-request assertions in Playwright specs
and production runbooks should remain.

## Later Server Checks

These can be run after a merge/deploy or natural maintenance window. They are
not required before moving to unrelated well-tested frontend work.

```sh
curl -fsS https://chessticize-server-9ddca5bcf137.herokuapp.com/health
curl -fsS http://127.0.0.1:8090/healthz
curl -fsS http://127.0.0.1:8090/status
heroku run --app chessticize-server "./bin/chessticize task-cleanup-status -details-limit=0"
heroku run --app chessticize-server "./bin/chessticize rollup-status"
```

Expected result:

- API health returns `OK`.
- Runner health returns `{"status":"OK"}`.
- Runner status shows recent successful `task-reset-hanging`,
  `rollup-maintenance`, and `task-cleanup` runs with
  `consecutive_errors=0`.
- Cleanup status exits `0`.
- Rollup status exits `0` with no pending, failed, missing, stale, or
  due-refresh work.

## Recording Evidence

Record only completed observations in the server migration progress doc. If a
safe account, auth state, or natural schedule window is unavailable, leave that
specific check pending and keep moving on code slices with adequate test
coverage.
