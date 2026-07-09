#!/bin/sh
set -e

# Xcode Cloud clones the repo but does not run npm/cap by default.
# Capacitor iOS (SPM) resolves plugins from node_modules — both steps are required.
cd "$CI_PRIMARY_REPOSITORY_PATH"

echo "Installing npm dependencies..."
npm ci

echo "Syncing Capacitor iOS project..."
npx cap sync ios
