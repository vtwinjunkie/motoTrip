#!/bin/bash
set -e

echo "🔧 Fixing and deploying motoTrip..."

# Ensure we're on main and have latest code
echo "📥 Pulling latest code from main..."
git checkout main
git pull origin main

# Clean everything
echo "🧹 Cleaning old builds..."
rm -rf dist node_modules/.vite

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build fresh
echo "🔨 Building project..."
npm run build

# Verify the build is clean
if grep -q "TYPE\." dist/assets/*.js 2>/dev/null; then
    echo "❌ ERROR: Build still contains TYPE error!"
    exit 1
fi

echo "✅ Build is clean, no TYPE errors found"

# Deploy to gh-pages
echo "🚀 Deploying to gh-pages..."
npm run deploy

echo "✅ Deployment complete! Wait 1-2 minutes for GitHub Pages to update."
echo "Then hard refresh your browser (Ctrl+Shift+R or Cmd+Shift+R)"
