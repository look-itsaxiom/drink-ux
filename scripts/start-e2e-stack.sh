#!/usr/bin/env bash
# start-e2e-stack.sh
#
# Spins up the full drink-ux stack for e2e testing and waits until all
# services are ready. Press Ctrl+C to stop everything.
#
# Usage:
#   ./scripts/start-e2e-stack.sh          # start stack and block
#   ./scripts/start-e2e-stack.sh &        # start in background, then run tests
#
# The stack:
#   - API        → http://localhost:3001  (Express + Prisma + SQLite)
#   - Mobile PWA → http://localhost:3000  (Vite + Ionic/React)
#   - Admin      → http://localhost:3002  (Vite + React)
#
# Alternatively, use docker-compose for a fully containerised stack:
#   docker-compose -f docker-compose.dev.yml up

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

# Ensure Prisma client is generated and test DB is migrated
echo "▶ Setting up API database..."
cd packages/api
DATABASE_URL="file:./prisma/test.db" npx prisma migrate deploy --skip-generate 2>/dev/null || true
cd "$REPO_ROOT"

# Build shared package so both apps can resolve types
echo "▶ Building shared package..."
npm run build --workspace=@drink-ux/shared --silent

# Track child PIDs for cleanup
PIDS=()

cleanup() {
  echo ""
  echo "▶ Stopping stack..."
  for pid in "${PIDS[@]}"; do
    kill "$pid" 2>/dev/null || true
  done
  wait
  echo "▶ Stack stopped."
}
trap cleanup INT TERM EXIT

# Start services in background
echo "▶ Starting API on :3001..."
DATABASE_URL="file:./prisma/test.db" npm run dev --workspace=@drink-ux/api &
PIDS+=($!)

echo "▶ Starting Mobile on :3000..."
npm run dev --workspace=@drink-ux/mobile &
PIDS+=($!)

echo "▶ Starting Admin on :3002..."
npm run dev --workspace=@drink-ux/admin &
PIDS+=($!)

# Wait for all services to be ready
wait_for_url() {
  local url="$1"
  local name="$2"
  local attempts=0
  local max=30
  echo -n "  Waiting for $name ($url)..."
  until curl -sf "$url" >/dev/null 2>&1; do
    attempts=$((attempts + 1))
    if [ "$attempts" -ge "$max" ]; then
      echo " TIMEOUT"
      return 1
    fi
    sleep 2
    echo -n "."
  done
  echo " ready"
}

wait_for_url "http://localhost:3001/health" "API"
wait_for_url "http://localhost:3000"        "Mobile"
wait_for_url "http://localhost:3002"        "Admin"

echo ""
echo "✅ Full stack is running. Use Ctrl+C to stop."
echo ""
echo "   Mobile  → http://localhost:3000"
echo "   Admin   → http://localhost:3002"
echo "   API     → http://localhost:3001"
echo ""
echo "   Run e2e tests with: npm run test:e2e"
echo ""

# Block until interrupted
wait
