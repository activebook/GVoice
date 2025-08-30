#!/bin/bash

# Exit on any error
set -e

# Source the environment variables from build/.env
source build/.env

# Check if GITHUB_TOKEN is set
if [ -z "$GITHUB_TOKEN" ]; then
  echo "Error: GITHUB_TOKEN is not set. Please check build/.env"
  exit 1
fi

# Export the token for GitHub CLI
export GITHUB_TOKEN

# Get the version from package.json
VERSION=$(node -p "require('../package.json').version")

# Build the app using Electron Forge
echo "Building the app..."
npm run make

# Create a GitHub release
echo "Creating GitHub release v$VERSION..."
gh release create "v$VERSION" --generate-notes --title "Release v$VERSION"

# Upload the built assets
echo "Uploading assets..."
# Upload all files in out/make/ recursively
find out/make/ -type f \( -name "*.zip" -o -name "*.exe" -o -name "*.dmg" -o -name "*.deb" -o -name "*.rpm" \) -exec gh release upload "v$VERSION" {} \;

echo "Release v$VERSION published successfully!"
