#!/usr/bin/env bash
set -e

echo ""
echo "  ╔═══════════════════════════════════╗"
echo "  ║         Keygate Setup             ║"
echo "  ╚═══════════════════════════════════╝"
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
  echo "  Error: Node.js is required (v20+)"
  echo "  Install: https://nodejs.org"
  exit 1
fi

NODE_VERSION=$(node -v | sed 's/v//' | cut -d. -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
  echo "  Error: Node.js 20+ required (found v$(node -v))"
  exit 1
fi

echo "  [1/4] Installing dependencies..."
npm install --silent 2>&1 | tail -1

echo "  [2/4] Building core package..."
npm run build --workspace=packages/core --silent 2>&1

echo "  [3/4] Running tests..."
npm test --workspace=packages/core --silent 2>&1 | tail -3

echo "  [4/4] Setting up environment..."
if [ ! -f .env ]; then
  cp .env.example .env
  echo "  Created .env from .env.example"
else
  echo "  .env already exists, skipping"
fi

echo ""
echo "  Setup complete."
echo ""
echo "  To start the demo server (no database required):"
echo ""
echo "    npx tsx packages/server/src/demo.ts"
echo ""
echo "  Then open:"
echo "    Dashboard:  http://localhost:3100/preview.html"
echo "    Landing:    http://localhost:3100/landing.html"
echo "    Docs:       http://localhost:3100/docs.html"
echo "    API:        http://localhost:3100/health"
echo ""
echo "  For full setup with PostgreSQL, see docs.html or README.md"
echo ""
