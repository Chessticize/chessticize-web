# Firebase Emulator Setup for Local Development

## Overview

The Firebase Emulator Suite provides a local environment for Firebase services, allowing you to develop and test without touching production data. This setup solves the localhost authentication issues with Google sign-in.

## Setup Complete ✅

The Firebase Emulator has been configured with:
- **Auth Emulator**: Port 9099
- **Emulator UI**: Port 4000
- Automatic connection in development mode
- Scripts for easy management

## Quick Start

### 1. Start the Emulator
```bash
pnpm emulator
```

This starts the Firebase Auth emulator. You'll see output like:
```
┌─────────────────────────────────────────────────────────────┐
│ ✔  All emulators ready! It is now safe to connect your app. │
│ i  View Emulator UI at http://localhost:4000                │
└─────────────────────────────────────────────────────────────┘
```

### 2. Run the App with Emulator
In a new terminal:
```bash
pnpm dev:emulator
```

This runs the Next.js app with `NEXT_PUBLIC_USE_FIREBASE_EMULATOR=true`.

### 3. Access the Emulator UI
Open http://localhost:4000 to see:
- All authenticated users
- Authentication logs
- Tools to manually create test users

## How It Works

### Automatic Connection
When running with `pnpm dev:emulator`, the app automatically:
1. Detects the emulator environment variable
2. Connects to the local Auth emulator instead of production Firebase
3. Shows console messages confirming emulator usage

### Google Sign-in with Emulator
**The best part**: Google sign-in works perfectly with the emulator!
- No popup issues
- No domain restrictions
- Instant authentication
- Test with any Google account

## Available Scripts

```bash
# Start emulator with all services
pnpm emulator

# Start only Auth emulator
pnpm emulator:start

# Save emulator state
pnpm emulator:export

# Restore saved state
pnpm emulator:import

# Run app with emulator
pnpm dev:emulator
```

## Testing Workflows

### Create Test Users
1. Open Emulator UI: http://localhost:4000
2. Go to Authentication tab
3. Click "Add user"
4. Create users with any email/password

### Test Google Sign-in
1. Click "Sign in with Google" in your app
2. Complete Google authentication
3. User is created in emulator (not production)

### Persist Test Data
Save your test users:
```bash
pnpm emulator:export
```

Next time, restore them:
```bash
pnpm emulator:import
```

## Environment Variables

The emulator is controlled by:
```bash
NEXT_PUBLIC_USE_FIREBASE_EMULATOR=true
```

You can also add to `.env.local`:
```bash
# Use emulator in development
NEXT_PUBLIC_USE_FIREBASE_EMULATOR=true
```

## Benefits

1. **No Domain Issues**: Localhost works perfectly
2. **Isolated Testing**: No production data affected
3. **Google Sign-in Works**: Full OAuth flow supported
4. **Fast Development**: No network latency
5. **Test Data Control**: Create/delete users instantly

## Troubleshooting

### Emulator Won't Start
- Check if port 9099 is available: `lsof -i :9099`
- Kill existing process: `kill -9 <PID>`

### App Not Connecting to Emulator
- Ensure you're running `pnpm dev:emulator` (not just `pnpm dev`)
- Check console for "[Firebase] Using Auth emulator" message
- Clear browser cache and cookies

### Google Sign-in Issues
- Make sure emulator is running first
- Check Emulator UI for authentication logs
- Try incognito mode to rule out cookie issues

## Best Practices

1. **Always use emulator for local development**
2. **Export test data before major changes**
3. **Create realistic test users** (different roles, data)
4. **Check Emulator UI for debugging**

## Advanced Usage

### Custom Emulator Ports
Edit `firebase.json` to change ports:
```json
{
  "emulators": {
    "auth": {
      "port": 9099  // Change this
    }
  }
}
```

### Automated Testing
Use emulator in tests:
```javascript
if (process.env.NODE_ENV === 'test') {
  connectAuthEmulator(auth, 'http://localhost:9099')
}
```

## Next Steps

1. Run `pnpm emulator` in one terminal
2. Run `pnpm dev:emulator` in another
3. Test Google sign-in - it works perfectly!
4. Create test users in Emulator UI
5. Develop without production concerns

The emulator provides a complete local Firebase environment, solving all localhost authentication issues while keeping your production data safe.