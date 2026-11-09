## Authentication and Token Management

### Overview
We use Firebase for client authentication and exchange Firebase credentials for a Chessticize access token to call our backend. All backend API calls are authenticated with the Chessticize access token. When that token expires or a 401 Unauthorized occurs, we refresh using Firebase, then retry.

### Tokens
- Firebase refresh token (long‑term)
  - Purpose: Allows minting a fresh Firebase ID token without re‑authenticating the user.
  - Storage: Persisted locally by Firebase Auth (SDK‑managed). We treat it as a locally stored credential; we do not duplicate it into our own JS‑accessible cookies for security reasons.
  - Expiration/Revocation: If it is missing/expired/revoked and we cannot obtain a new Firebase ID token, we sign the user out and require re‑authentication.

- Firebase ID token (short‑term ~1 hour)
  - Purpose: Only used to exchange for a Chessticize access token.
  - Obtaining: `user.getIdToken(true)` to force refresh when needed.
  - Storage: Not stored by us; fetched just‑in‑time when exchanging.

- Chessticize access token (short‑term)
  - Purpose: Used in the Authorization header for all backend API calls.
  - Storage: Cookie (`auth_token`) with a tracked expiry (`token_expiry`).
  - Expiration: Configurable via NEXT_PUBLIC_TOKEN_EXPIRY_MINUTES (minutes). Defaults: 1440 in production, 1 in development if unset. We proactively refresh before expiry (target: 5‑minute buffer) and on 401.

### Request Flow (Happy Path)
1. For every backend request, attach `Authorization: Bearer <chessticize_access_token>`.
2. If the token is near expiry (within a buffer, e.g., 5 minutes), refresh first (see Refresh Flow below), then proceed.

### 401 Handling and Automatic Retry
- If an API call returns 401:
  1) Attempt a refresh via Firebase:
     - Use Firebase refresh token (SDK‑managed) to obtain a fresh Firebase ID token (`getIdToken(true)`).
     - Exchange the Firebase ID token at `/auth/firebase-exchange` for a new Chessticize access token.
     - Store the new access token (and expiry) in cookies.
  2) Retry the original API request once with the new Chessticize access token.
- If obtaining a Firebase ID token fails for any reason (e.g., refresh token invalid/expired/revoked):
  - Sign the user out of Firebase and clear local tokens so the app prompts for re‑authentication.

### Refresh Flow (Proactive / On‑Demand)
- Trigger: Either the token is near expiry (proactive) or a 401 occurs (on‑demand).
- Steps:
  1) Get a fresh Firebase ID token: `user.getIdToken(true)`.
  2) Exchange ID token for a new Chessticize access token at `/auth/firebase-exchange`.
  3) Store the Chessticize access token and its new expiry in cookies (1 day).
  4) If step 1 fails (cannot get ID token), sign out the user.

### Storage Details
- Chessticize access token: cookie `auth_token` (and `token_expiry` ISO string) with secure cookie options in production; expiry set to 1 day. We use a refresh buffer (e.g., 5 minutes) to refresh before actual expiry.
- Firebase refresh token: persisted by the Firebase SDK with its own secure storage and lifecycle. We rely on Firebase for persistence and rotation rather than duplicating it in JS‑accessible cookies.

### Built‑in Client Behavior
- All API calls go through the authenticated client which:
  - Adds the Chessticize access token to the Authorization header.
  - On 401, runs the Refresh Flow and retries once.
  - On refresh failure (cannot obtain Firebase ID token), signs out the user.
  - Tracks access token expiry and (target) proactively refreshes before expiry.

### Failure Cases
- Network error during `/auth/firebase-exchange`: surface an error; user remains signed in, and subsequent calls will retry refresh as needed.
- Firebase refresh token invalid/expired/revoked: cannot get ID token; we sign out immediately to prompt re‑authentication.

### Implementation Notes
- Security: We intentionally do not copy Firebase’s refresh token into our own cookies to avoid exposing long‑lived credentials to JS where possible; Firebase Auth already persists and protects it. The behavior matches the policy of “store locally and use it to refresh,” via the SDK.
- Expiry tracking: We store `token_expiry` for the Chessticize access token and aim to refresh with a 5‑minute buffer. Firebase ID token expiry is managed by Firebase; we fetch a fresh one on demand.

### Current Status and Planned Adjustments
- 401 retry: We will ensure the client always attempts the refresh flow on any 401 (not only when a session token exists). On refresh failure, we will also sign out from Firebase.
- Proactive refresh: We plan to add a small interval to proactively refresh the Chessticize access token when it is within the buffer window, so idle tabs do not hit 401.
- Cookies: Chessticize access token (`auth_token`) and expiry (`token_expiry`) are stored today. Firebase refresh token remains SDK‑managed.

