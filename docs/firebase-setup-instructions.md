# Firebase Project Setup Instructions

This guide will walk you through setting up a Firebase project for Chessticize authentication.

## Step 1: Create Firebase Project

1. Go to the [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project" or "Add project"
3. Enter project name: `chessticize-dev` (or your preferred name)
4. Choose whether to enable Google Analytics (optional but recommended)
5. Select or create a Google Analytics account if enabled
6. Click "Create project"

## Step 2: Enable Authentication

1. In your Firebase project dashboard, click "Authentication" in the left sidebar
2. Click "Get started" if this is your first time
3. Go to the "Sign-in method" tab
4. Enable the following sign-in providers:

### Email/Password
- Click "Email/Password"
- Toggle "Enable" to ON
- Click "Save"

### Email Link (Passwordless)
- Click "Email/Password" 
- Toggle "Email link (passwordless sign-in)" to ON
- Click "Save"

### Google OAuth
- Click "Google"
- Toggle "Enable" to ON
- Select a support email address
- Click "Save"

## Step 3: Configure Authorized Domains

1. Still in Authentication > Sign-in method
2. Scroll down to "Authorized domains"
3. Add your domains:
   - `localhost` (for development)
   - Your production domain (e.g., `chessticize.com`)
   - Your staging domain if applicable

## Step 4: Get Firebase Configuration

1. Go to Project Settings (gear icon in left sidebar)
2. Scroll down to "Your apps" section
3. Click "Add app" and select the web icon (`</>`)
4. Enter app nickname: `chessticize-web`
5. Check "Also set up Firebase Hosting" if you plan to use it (optional)
6. Click "Register app"
7. Copy the configuration object that looks like this:

```javascript
const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456"
};
```

## Step 5: Configure Environment Variables

1. Copy `.env.local.example` to `.env.local`:
   ```bash
   cp .env.local.example .env.local
   ```

2. Replace the Firebase placeholder values in `.env.local` with your actual configuration:
   ```bash
   NEXT_PUBLIC_FIREBASE_API_KEY=your-actual-api-key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
   NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abcdef123456
   ```

## Step 6: Test Configuration

1. Start your development server:
   ```bash
   pnpm dev
   ```

2. Check the browser console for any Firebase-related errors
3. The application should start without Firebase authentication errors

## Security Notes

- Firebase configuration values are safe to store in version control
- They are public by design and security is enforced through Firebase Security Rules
- Use separate Firebase projects for development, staging, and production
- Never share your Firebase Admin SDK private keys (not used in this client-side setup)

## Troubleshooting

### Common Issues

1. **"Firebase: Error (auth/invalid-api-key)"**
   - Check that your API key is correct
   - Ensure there are no extra spaces or characters

2. **"Firebase: Error (auth/auth-domain-config-required)"**
   - Verify your auth domain is correct
   - Check that it ends with `.firebaseapp.com`

3. **"Firebase: Error (auth/unauthorized-domain)"**
   - Add your domain to the authorized domains list
   - For development, ensure `localhost` is authorized

### Getting Help

- Check the [Firebase Documentation](https://firebase.google.com/docs/auth)
- Visit the [Firebase Console](https://console.firebase.google.com/) for project settings
- Review the browser console for detailed error messages

## Next Steps

Once Firebase is configured, the application will automatically detect the configuration and enable Firebase authentication features alongside the existing authentication system.
