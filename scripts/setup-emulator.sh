#!/bin/bash

# Setup script for Firebase Emulator

echo "🔧 Setting up Firebase Emulator for local development..."

# Check if firebase-tools is installed
if ! command -v firebase &> /dev/null && ! npx firebase --version &> /dev/null; then
    echo "❌ Firebase CLI not found. Installing..."
    pnpm add -D firebase-tools
fi

# Create emulator data directory
mkdir -p emulator-data

echo "✅ Firebase Emulator setup complete!"
echo ""
echo "📝 Usage:"
echo "  1. Start the emulator: pnpm emulator"
echo "  2. In another terminal, run the app with emulator: pnpm dev:emulator"
echo "  3. Access Emulator UI at: http://localhost:4000"
echo ""
echo "🎯 Quick start:"
echo "  pnpm emulator & pnpm dev:emulator"
echo ""
echo "💡 Tips:"
echo "  - The emulator will create test users that persist between sessions"
echo "  - Use 'pnpm emulator:export' to save emulator state"
echo "  - Use 'pnpm emulator:import' to restore saved state"
echo "  - Google sign-in works perfectly with the emulator!"