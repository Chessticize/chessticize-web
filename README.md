# Chessticize

A Next.js-based chess training application that helps users improve their chess tactics and performance through interactive puzzles and game analysis.

## Prerequisites

Before you begin, ensure you have the following installed on your system:

- **Node.js** (v22.12.0 or higher)
  - Download from [nodejs.org](https://nodejs.org/)
  - Verify installation: `node --version`

- **pnpm** (Package Manager)
  - This project uses pnpm for better performance and disk space efficiency
  - Install globally: `npm install -g pnpm`
  - Verify installation: `pnpm --version`

## Install dependencies

```bash
pnpm install
```

## Development

### Start the Development Server

```bash
pnpm dev
```

This will start the Next.js development server at `http://localhost:3000`.

### Available Scripts

- `pnpm dev` - Start development server
- `pnpm build` - Build the application for production
- `pnpm start` - Start the production server
- `pnpm lint` - Run ESLint to check code quality
- `pnpm test` - Run tests
- `pnpm test:watch` - Run tests in watch mode
- `pnpm test:ui` - Run tests with UI interface

### Running with Production API

To test the application locally with the production API server:

```bash
# Option 1: Set NODE_ENV to production (uses production API automatically)
NODE_ENV=production pnpm dev

# Option 2: Explicitly set the production API URL
NEXT_PUBLIC_API_BASE_URL=https://chessticize-server-9ddca5bcf137.herokuapp.com pnpm dev

# Option 3: Update .env.local file
echo "NEXT_PUBLIC_API_BASE_URL=https://chessticize-server-9ddca5bcf137.herokuapp.com" > .env.local
pnpm dev
```

The application automatically selects the appropriate API endpoint:
- **Development**: `http://localhost:8080` (local server)
- **Production**: `https://chessticize-server-9ddca5bcf137.herokuapp.com` (hosted server)

## Testing

Automated validation is local-only. Signed-in production checks are manual and
operator-owned; do not add CI jobs that require production auth cookies or
production bearer-token secrets.

### Unit and Hook Tests

```bash
pnpm test
```

Focused v2 migration checks:

```bash
pnpm exec vitest __tests__/api/auth.test.ts __tests__/api/library.test.ts __tests__/hooks/useGameReviewData.test.ts __tests__/hooks/useSprintApi.test.ts __tests__/app/puzzle-sprint-page.test.tsx __tests__/app/settings.test.tsx
```

### Local Playwright Smokes

The Playwright smoke suite runs against the local Next.js app and mocked public
API responses. It verifies the migrated Settings, Game Review, sprint, games,
puzzles, and review-queue paths without production credentials.

```bash
pnpm test:e2e -- e2e/settings-v2.spec.ts e2e/v2-read-routes.spec.ts e2e/sprint-v2.spec.ts
```

### Signed-in Production v2 Validation

Production validation is local-only and operator-owned. Do not run it in CI and
do not commit storage-state files, auth tokens, screenshots, traces, or reports.
The full checklist lives in
[docs/production-v2-validation-runbook.md](./docs/production-v2-validation-runbook.md).

Create a signed-in storage state with Playwright or provide a short-lived
`PROD_AUTH_TOKEN`, then run the read-only checks:

```bash
PROD_PLAYWRIGHT_BASE_URL=https://www.chessticize.com \
PROD_PLAYWRIGHT_STORAGE_STATE=/absolute/path/to/signed-in-storage-state.json \
pnpm test:e2e:prod
```

The default production validation verifies that Settings, Game Review, and
read-only Review Queue paths, including user-game and Lichess arrow-duel
filters, stay on v2 signed-in APIs and make no `/api/v1/` or `/graphql`
requests.

Standard sprint validation mutates the signed-in account by starting and
finishing a sprint, so run it only on a validation account:

```bash
PROD_VALIDATE_SPRINT=true \
PROD_PLAYWRIGHT_BASE_URL=https://www.chessticize.com \
PROD_PLAYWRIGHT_STORAGE_STATE=/absolute/path/to/signed-in-storage-state.json \
pnpm test:e2e:prod -- --grep "sprint"
```

Arrow-duel sprint validation is separate:

```bash
PROD_VALIDATE_ARROW_DUEL_SPRINT=true \
PROD_PLAYWRIGHT_BASE_URL=https://www.chessticize.com \
PROD_PLAYWRIGHT_STORAGE_STATE=/absolute/path/to/signed-in-storage-state.json \
pnpm test:e2e:prod -- --grep "arrow-duel sprint"
```

Settings mutation validation is opt-in and should only be run on a validation
account. The ELO check requires the expected original rating and restores it
after saving a temporary value. The profile check requires a disposable chess
profile username and deletes the created profile.

```bash
PROD_VALIDATE_SETTINGS_ELO=true \
PROD_SETTINGS_ELO_ORIGINAL_RATING=1200 \
PROD_SETTINGS_ELO_TEST_RATING=1225 \
PROD_PLAYWRIGHT_BASE_URL=https://www.chessticize.com \
PROD_PLAYWRIGHT_STORAGE_STATE=/absolute/path/to/signed-in-storage-state.json \
pnpm test:e2e:prod -- --grep "Settings ELO save"

PROD_VALIDATE_SETTINGS_PROFILE=true \
PROD_SETTINGS_PROFILE_PLATFORM=lichess.org \
PROD_SETTINGS_PROFILE_USERNAME=disposable_validation_user \
PROD_PLAYWRIGHT_BASE_URL=https://www.chessticize.com \
PROD_PLAYWRIGHT_STORAGE_STATE=/absolute/path/to/signed-in-storage-state.json \
pnpm test:e2e:prod -- --grep "Settings profile create"
```

Game Review import refresh is also opt-in. Run it only when the validation
account has exactly one connected chess profile, that profile is `not_started`
or `failed`, and every import progress counter is zero. The test fails before
clicking refresh if import-status evidence says the account is not safe.

```bash
PROD_VALIDATE_GAME_REVIEW_IMPORT_REFRESH=true \
PROD_PLAYWRIGHT_BASE_URL=https://www.chessticize.com \
PROD_PLAYWRIGHT_STORAGE_STATE=/absolute/path/to/signed-in-storage-state.json \
pnpm test:e2e:prod -- --grep "import refresh"
```

After import refresh, cross-check server-side progress:

```bash
heroku run --app chessticize-server -- ./bin/chessticize task-import-progress-status -details-limit=5
```

### Firebase Emulator

For authentication-facing automated tests, use the Firebase Auth emulator
instead of production auth secrets.

```bash
pnpm emulator
```

## Building for Production

1. **Build the application**:
   ```bash
   pnpm build
   ```

2. **Start production server**:
   ```bash
   pnpm start
   ```

The production build will be optimized and ready for deployment.

## Project Structure

```
├── app/                    # Next.js App Router pages
│   ├── dashboard/         # Dashboard page
│   ├── game-review/       # Game review functionality
│   ├── login/             # Authentication pages
│   └── ...
├── components/            # Reusable React components
│   ├── ui/               # UI components (shadcn/ui)
│   └── ...
├── hooks/                # Custom React hooks
├── lib/                  # Utility functions
├── public/               # Static assets
├── styles/               # Global styles
└── ...
```

## Technology Stack

- **Framework**: Next.js 15.2.4
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: Radix UI + shadcn/ui
- **Package Manager**: pnpm

## Environment Setup

The application uses environment-based configuration for API endpoints:

### Automatic Configuration
- **Development**: Automatically uses `http://localhost:8080`
- **Production**: Automatically uses `https://chessticize-server-9ddca5bcf137.herokuapp.com`

### Manual Configuration (Optional)
1. Copy the example environment file:
   ```bash
   cp .env.local.example .env.local
   ```

2. Edit `.env.local` to override defaults:
   ```bash
   # API Configuration (optional - uses environment defaults if empty)
   NEXT_PUBLIC_API_BASE_URL=

   # Debug Configuration
   NEXT_PUBLIC_ENABLE_DEBUG_LOGS=true
   ```

### Available Environment Variables
- `NEXT_PUBLIC_API_BASE_URL`: Override the default API endpoint
- `NEXT_PUBLIC_ENABLE_DEBUG_LOGS`: Enable debug logging (default: false in production)
- `NODE_ENV`: Environment mode (development/production/test)

## Authentication

The application includes a complete authentication system:

### Features
- **Login/Registration**: Email and password authentication with invitation codes
- **Session Management**: Automatic token refresh and persistent sessions
- **Protected Routes**: Automatic redirection for unauthenticated users
- **Secure Storage**: Token storage using secure HTTP-only cookies

### Usage
1. **Registration**: Requires a valid invitation code from the server admin
2. **Login**: Use email and password to authenticate
3. **Automatic Sessions**: Stay logged in across browser sessions
4. **Logout**: Clears all authentication tokens

### Testing Authentication
To test with the production server, you'll need:
1. A valid invitation code (contact server admin)
2. Or existing user credentials

For local development, ensure the local server is running at `http://localhost:8080`.

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes and test them
4. Commit your changes: `git commit -m 'Add feature'`
5. Push to the branch: `git push origin feature-name`
6. Submit a pull request

## Troubleshooting

### Common Issues

1. **pnpm not found**: Make sure pnpm is installed globally with `npm install -g pnpm`

2. **Node version issues**: Ensure you're using Node.js v18.18.0 or higher

3. **Port already in use**: If port 3000 is busy, Next.js will automatically use the next available port

4. **Build errors**: Run `pnpm lint` to check for code issues before building

### Getting Help

- Check the [Next.js documentation](https://nextjs.org/docs)
- Open an issue on the repository for bugs or feature requests
