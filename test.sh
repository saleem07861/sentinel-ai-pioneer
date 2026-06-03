#!/usr/bin/env bash
set -e

NPM="npm"; if command -v npm.cmd &>/dev/null; then NPM="npm.cmd"; fi
NPX="npx"; if command -v npx.cmd &>/dev/null; then NPX="npx.cmd"; fi

echo "==================================="
echo " Sentinel AI — Test Suite"
echo "==================================="

echo ""
echo "[1/5] Regenerating Prisma client..."
$NPM run db:generate

echo "[2/5] Installing browsers..."
$NPX playwright install chromium 2>/dev/null || true

echo "[3/5] Seeding database..."
$NPM run db:seed

echo "[4/5] Starting dev server..."
$NPM run dev &
DEV_PID=$!
sleep 5

echo "[5/5] Running tests..."
$NPX playwright test tests/e2e/feature-verification.spec.ts --reporter=list 2>&1 | tee test-results.txt

echo ""
echo "Stopping dev server..."
kill $DEV_PID 2>/dev/null

echo ""
echo "==================================="
echo " Results saved to test-results.txt"
echo " HTML report: $NPM run test:browser:report"
echo "==================================="
