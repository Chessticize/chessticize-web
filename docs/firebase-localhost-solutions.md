# Firebase Google Sign-in on Localhost - Complete Solutions

## Why Popup Fails on Localhost

When you use Google sign-in with Firebase, the OAuth flow works like this:

1. Your app opens a popup to Google's OAuth page
2. User signs in with Google
3. Google redirects to `https://[your-auth-domain]/__/auth/handler` with the auth code
4. Firebase processes the auth code and completes sign-in

The problem: Your `authDomain` is `chessticize.firebaseapp.com`, but your app runs on `localhost:3000`. The popup can't communicate the result back to your localhost app.

## Solutions (in order of recommendation)

### 1. Use Redirect Flow (Easiest - Already Implemented)

The redirect flow works on localhost because it redirects the entire window, maintaining the auth state:

```javascript
// This is already implemented and working
await signInWithRedirect(auth, googleProvider)
```

**How to use:**
- Click the regular "Sign in with Google" button
- The system automatically uses redirect flow on localhost
- You'll be redirected to Google, then back to your app

### 2. Deploy to Firebase Hosting for Development

Firebase Hosting provides a proper domain that matches your authDomain:

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Initialize Firebase Hosting
firebase init hosting

# Deploy
firebase deploy --only hosting

# Access your app at
# https://chessticize.web.app or https://chessticize.firebaseapp.com
```

### 3. Use a Proxy Domain (Advanced)

Set up a local proxy that makes your localhost appear to be on the Firebase domain:

1. Add to `/etc/hosts` (Mac/Linux) or `C:\Windows\System32\drivers\etc\hosts` (Windows):
   ```
   127.0.0.1 local.chessticize.firebaseapp.com
   ```

2. Use a reverse proxy like nginx to handle the domain:
   ```nginx
   server {
     listen 80;
     server_name local.chessticize.firebaseapp.com;
     location / {
       proxy_pass http://localhost:3000;
     }
   }
   ```

3. Access your app at `http://local.chessticize.firebaseapp.com`

### 4. Use ngrok (For Testing)

Create a public HTTPS tunnel to your localhost:

```bash
# Install ngrok
npm install -g ngrok

# Create tunnel
ngrok http 3000

# Add the ngrok URL to Firebase authorized domains
# Use the HTTPS URL provided by ngrok
```

### 5. Develop with Firebase Emulator Suite

Use Firebase's local emulator for authentication:

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Start emulators
firebase emulators:start

# Configure your app to use emulator
connectAuthEmulator(auth, 'http://localhost:9099')
```

## Current Implementation

The app is already configured to:
1. Detect when running on localhost
2. Automatically use redirect flow instead of popup
3. Show "Try alternative sign-in method" button if popup fails

## Production

When deployed to production with HTTPS and proper domain, the popup flow will work perfectly without any changes.

## Quick Test

Use the Firebase test page at `/debug/firebase-test`:
- "Test Simple Redirect" - Will work on localhost
- "Test Simple Popup" - Will fail on localhost (expected)

## Recommendation

For local development, just use the redirect flow. It's already set up and works reliably. The popup flow will automatically work when you deploy to production.