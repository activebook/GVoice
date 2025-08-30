#!/bin/bash

# Exit on any error
set -e

# Change to the parent directory (project root)
cd "$(dirname "$0")/.."

# Source the environment variables from build/.env
source build/.env

# Function to display usage
usage() {
  echo "Usage: $0 [--dryrun|--build|--release]"
  echo "  --dryrun   Simulate the build/release process without executing"
  echo "  --build    Build the application without publishing"
  echo "  --release  Build and publish the application"
  exit 1
}

# Parse arguments
MODE=""
while [[ $# -gt 0 ]]; do
  case $1 in
    --dryrun)
      MODE="dryrun"
      shift
      ;;
    --build)
      MODE="build"
      shift
      ;;
    --release)
      MODE="release"
      shift
      ;;
    *)
      echo "Unknown option: $1"
      usage
      ;;
  esac
done

if [ -z "$MODE" ]; then
  echo "Error: No mode specified."
  usage
fi

# Get the version from package.json
VERSION=$(node -p "require('./package.json').version")

# Function to run commands or echo in dryrun
run_or_echo() {
  if [ "$MODE" = "dryrun" ]; then
    echo "Would run: $@"
  else
    "$@"
  fi
}

# Common build steps
echo "Building CSS and TypeScript..."
#run_or_echo npm run build:css
#run_or_echo npx tsc

if [ "$MODE" = "build" ]; then
  echo "Building application v$VERSION..."
  run_or_echo npm run build:mac
  echo "Build completed successfully!"
elif [ "$MODE" = "release" ]; then
  # Check if GITHUB_TOKEN is set for release
  if [ -z "$GITHUB_TOKEN" ]; then
    echo "Error: GITHUB_TOKEN is not set. Please check build/.env"
    exit 1
  fi
  # Export the token for Electron Forge publisher
  export GITHUB_TOKEN
  echo "Building and publishing app v$VERSION using Electron Forge..."
  run_or_echo npm run publish
  echo "Release v$VERSION published successfully!"
elif [ "$MODE" = "dryrun" ]; then
  echo "Dryrun mode: Simulating build and release for v$VERSION"
  echo "Would check GITHUB_TOKEN and export it"
  echo "Would run: npm run publish"
  echo "Dryrun completed!"
fi
