#!/usr/bin/env bash
# Run all pre-PR checks for the Cline VS Code extension.
# Usage: ./scripts/validate.sh
set -euo pipefail

echo "==> Installing dependencies..."
npm install --silent

echo "==> TypeScript compile check..."
npm run compile

echo "==> Running unit tests..."
npm test

echo ""
echo "All checks passed. Your branch is ready for PR."
