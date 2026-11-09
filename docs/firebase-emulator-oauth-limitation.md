# Firebase Auth Emulator OAuth Limitation

## Issue

When using Firebase Auth Emulator with OAuth providers (Google, GitHub, etc.), the OAuth flow still requires going through the production Firebase Auth infrastructure because:

1. OAuth providers (Google, GitHub, etc.) require pre-registered redirect URIs
2. These providers cannot redirect to `localhost` URLs for security reasons
3. The Firebase Auth Emulator doesn't provide OAuth handler endpoints

## How It Works

Even when using the emulator:
1. OAuth redirects go to `https://[project].firebaseapp.com/__/auth/handler`
2. Firebase's production infrastructure handles the OAuth callback
3. The auth token is then passed back to your localhost app
4. The emulator intercepts and handles the authentication locally

## Important Notes

- **Google Sign-in with Popup**: May not work on localhost due to browser security restrictions
- **Google Sign-in with Redirect**: Works but requires production Firebase configuration
- **Email/Password**: Works fully offline with emulator
- **Magic Link**: Works fully offline with emulator

## Configuration

When using the emulator with OAuth:
1. Keep the production `authDomain` in Firebase config
2. Use `connectAuthEmulator()` to connect to local emulator
3. OAuth will use production for redirect, but auth state is managed locally

## Testing OAuth Locally

For testing OAuth providers locally, you have these options:

1. **Use the Firebase Emulator UI** (http://localhost:4000)
   - Provides fake OAuth providers for testing
   - No real OAuth flow required

2. **Use production Firebase Auth**
   - Temporarily disable emulator for OAuth testing
   - Set `NEXT_PUBLIC_USE_FIREBASE_EMULATOR=false`

3. **Use email/password auth**
   - Works fully offline with emulator
   - Good for most development tasks

## Code Example

```typescript
// Firebase config keeps production authDomain for OAuth
const firebaseConfig = {
  apiKey: "...",
  authDomain: "chessticize.firebaseapp.com", // Production domain for OAuth
  projectId: "chessticize",
  // ...
}

// Connect to emulator for local auth state management
if (useEmulator) {
  connectAuthEmulator(auth, "http://localhost:9099")
}
```

## Workaround for Development

For local development, use:
1. Email/password authentication (fully local)
2. Firebase Emulator UI fake providers
3. Deploy to staging environment for OAuth testing