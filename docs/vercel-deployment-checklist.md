# Vercel Deployment Checklist for Firebase Auth

## Before Deploying

1. **Environment Variables in Vercel**
   - Go to your Vercel project settings
   - Add all Firebase environment variables:
     ```
     NEXT_PUBLIC_FIREBASE_API_KEY
     NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
     NEXT_PUBLIC_FIREBASE_PROJECT_ID
     NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
     NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
     NEXT_PUBLIC_FIREBASE_APP_ID
     NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
     NEXT_PUBLIC_API_BASE_URL
     ```

2. **Firebase Console - Authorized Domains**
   - Go to Firebase Console → Authentication → Settings → Authorized domains
   - Add your Vercel domains:
     - `your-app.vercel.app`
     - `your-app-*.vercel.app` (for preview deployments)
     - Your custom domain (if any)

3. **Google Cloud Console - OAuth**
   - Go to [Google Cloud Console](https://console.cloud.google.com)
   - APIs & Services → Credentials
   - Edit your OAuth 2.0 Client ID
   - Add Authorized JavaScript origins:
     ```
     https://your-app.vercel.app
     https://your-app-*.vercel.app
     ```
   - Add Authorized redirect URIs:
     ```
     https://your-app.vercel.app/__/auth/handler
     https://chessticize.firebaseapp.com/__/auth/handler
     ```

## After Deploying

1. **Test Authentication Flow**
   - Visit `https://your-app.vercel.app/debug/firebase-test`
   - Test both popup and redirect flows
   - Popup should work on HTTPS Vercel domain

2. **Check Console Logs**
   - Open browser developer console
   - Look for Firebase auth debug messages
   - Check for any domain or configuration errors

3. **Common Issues**
   - If popup still fails, check browser console for specific error
   - Ensure all domains are properly whitelisted
   - Clear browser cache and cookies
   - Try incognito/private mode

## Expected Behavior on Vercel

- **Popup flow**: Should work properly on HTTPS domain
- **Redirect flow**: Will continue to work as fallback
- Both methods should successfully authenticate users

## Debugging

If authentication fails on Vercel:
1. Check Vercel function logs for server-side errors
2. Verify environment variables are set correctly
3. Ensure Firebase project is not in test mode with expiry
4. Check Firebase usage quotas