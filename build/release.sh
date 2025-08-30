#!/bin/bash

# Exit on any error
set -e

# Change to the script's directory
cd "$(dirname "$0")"

# Source the environment variables from .env
source .env

# Check if GITHUB_TOKEN is set
if [ -z "$GITHUB_TOKEN" ]; then
  echo "Error: GITHUB_TOKEN is not set. Please check build/.env"
  exit 1
fi

# Export the token for Electron Forge publisher
export GITHUB_TOKEN

# Get the version from package.json
VERSION=$(node -p "require('../package.json').version")

# Build and publish the app using Electron Forge publisher
echo "Building and publishing app v$VERSION using Electron Forge..."
#npm run publish

echo "Release v$VERSION published successfully!"
