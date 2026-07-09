#!/bin/sh
set -e

export HOMEBREW_NO_INSTALL_CLEANUP=TRUE
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"

# Xcode Cloud clones the repo but does not include Node/npm by default.
# Capacitor iOS (SPM) resolves plugins from node_modules — install Node first.
cd "$CI_PRIMARY_REPOSITORY_PATH"

echo "Installing Node.js..."
brew install node

echo "Installing npm dependencies..."
npm config set maxsockets 3
npm ci

echo "Syncing Capacitor iOS project..."
npx cap sync ios
