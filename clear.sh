#!/usr/bin/env bash
set -e
echo "Clearing contracts and decisions…"
npx tsx prisma/clear-contracts.ts
