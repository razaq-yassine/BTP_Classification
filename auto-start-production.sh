#!/bin/bash
# Build and start BTP_Classification with PM2
set -e
cd /home/BTP_Classification

echo "Building backend..."
cd backend && pnpm run build && cd ..

echo "Building frontend..."
cd frontend && pnpm run build && cd ..

echo "Starting PM2 processes..."
pm2 start ecosystem.config.js --only btp-backend
pm2 start ecosystem.config.js --only btp-frontend

pm2 save

echo ""
echo "BTP_Classification is running:"
pm2 list | grep btp

echo ""
echo "Useful commands:"
echo "   Logs:    pm2 logs btp-backend  |  pm2 logs btp-frontend"
echo "   Restart: pm2 restart btp-backend btp-frontend"
echo "   Stop:    pm2 stop btp-backend btp-frontend"
echo ""
