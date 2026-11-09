# Firebase Google Sign-in Troubleshooting Guide

## Issue: Popup Closes After ~10 Seconds

This behavior indicates the OAuth flow is starting successfully but failing during the redirect back to your application.

## Common Causes

1. **Redirect URI Mismatch**: The most common cause when popup stays open for several seconds
2. **Domain Authorization**: Firebase Console domain settings
3. **OAuth Consent Screen**: Google Cloud Console configuration

## Solutions

### 1. Check Firebase Console Settings

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Go to Authentication → Settings → Authorized domains
4. Ensure these domains are added:
   - `localhost` (without port)
   - Your production domain

### 2. Check Google Cloud Console OAuth Settings

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Select your project (same as Firebase project)
3. Go to APIs & Services → Credentials
4. Find your OAuth 2.0 Client ID (Web client)
5. Add these Authorized JavaScript origins:
   ```
   http://localhost
   http://localhost:3000
   https://chessticize.firebaseapp.com
   https://[your-production-domain]
   ```
6. Add these Authorized redirect URIs:
   ```
   http://localhost:3000/__/auth/handler
   https://chessticize.firebaseapp.com/__/auth/handler
   https://[your-production-domain]/__/auth/handler
   ```

### 3. Use Redirect Flow for Local Development

The redirect flow is more reliable for localhost development:

```javascript
// In your login page
const handleGoogleSignIn = async () => {
  try {
    // Use redirect flow for localhost
    if (window.location.hostname === 'localhost') {
      await signInWithGoogleRedirect()
      return
    }
    
    // Use popup for production
    await signInWithGooglePopup()
  } catch (error) {
    console.error('Google sign-in failed:', error)
  }
}
```

### 4. Alternative: Use Firebase Auth Emulator

For local development, you can use the Firebase Auth Emulator:

1. Install Firebase CLI: `npm install -g firebase-tools`
2. Initialize Firebase: `firebase init`
3. Start emulator: `firebase emulators:start --only auth`
4. Update your config to use emulator in development

### 5. Quick Fix: Force Redirect Flow

If you need to proceed immediately, use the "Try alternative sign-in method" button that appears after the popup fails. This uses the redirect flow which is more reliable for localhost.

## Testing Steps

1. Clear browser cache and cookies
2. Try in incognito/private mode
3. Check browser console for specific errors
4. Use the debug page at `/debug/firebase-test`

## Production Deployment

When deploying to production:
1. Update authorized domains in Firebase Console
2. Update OAuth redirect URIs in Google Cloud Console
3. Ensure HTTPS is used (required for popup flow)
4. Test both popup and redirect flows