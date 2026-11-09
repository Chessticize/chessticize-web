# Firebase OAuth Redirect URI Configuration

## Problem
The Google sign-in popup opens but closes after ~10 seconds with "auth/popup-closed-by-user" error. This indicates the OAuth flow is failing at the redirect stage.

## Root Cause
The issue is that Firebase is trying to redirect to `https://chessticize.firebaseapp.com/__/auth/handler` but your app is running on `http://localhost:3000`. This domain mismatch causes the OAuth flow to fail.

## Solution

### Option 1: Use Redirect Flow (Recommended for Local Development)

The redirect flow works better for localhost because it handles the domain mismatch more gracefully:

```javascript
// Instead of popup, use redirect
await signInWithRedirect(auth, googleProvider)

// After redirect back, get the result
const result = await getRedirectResult(auth)
```

### Option 2: Configure OAuth Client in Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Select your Firebase project
3. Navigate to: APIs & Services → Credentials
4. Find your Web OAuth 2.0 Client ID
5. Add these Authorized JavaScript origins:
   ```
   http://localhost
   http://localhost:3000
   https://chessticize.firebaseapp.com
   ```
6. Add these Authorized redirect URIs:
   ```
   http://localhost:3000/__/auth/handler
   https://chessticize.firebaseapp.com/__/auth/handler
   ```

### Option 3: Use a Custom Domain for Local Development

1. Add to your `/etc/hosts` file:
   ```
   127.0.0.1 local.chessticize.com
   ```
2. Access your app at `http://local.chessticize.com:3000`
3. Add `local.chessticize.com` to Firebase authorized domains

### Option 4: Use ngrok for HTTPS Tunnel

1. Install ngrok: `npm install -g ngrok`
2. Run your app: `npm run dev`
3. Create tunnel: `ngrok http 3000`
4. Add the ngrok URL to Firebase authorized domains
5. Access your app through the ngrok HTTPS URL

## Implementation Fix

The code has been updated to automatically use redirect flow on localhost. This avoids the popup issues entirely.

## Testing

Use the "Test Simple Redirect" button on `/debug/firebase-test` to verify the redirect flow works correctly.