#!/usr/bin/env bash
set -e
cd /opt/sentinel-ai
echo "Pulling..."
git pull
cp env.prod .env
npm install
echo "Generating Prisma client..."
npx prisma generate
echo "Updating database..."
npx prisma db push --accept-data-loss
echo "Seeding..."
npx tsx prisma/seed.ts
echo "Building..."
npm run build
echo "Restarting..."
pm2 delete all 2>/dev/null; sleep 1
pm2 start node_modules/.bin/next --name sentinel-ai -- start
sleep 2
pm2 status
echo ""
echo "Done! https://sentinel.eportfolios.co.uk"
