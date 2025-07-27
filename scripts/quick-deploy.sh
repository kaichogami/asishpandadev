#!/bin/bash

# Quick deployment script - builds and pushes in one command
set -e

echo "⚡ Quick deploy starting..."

# Check if we're in a git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    echo "❌ Error: Not in a git repository"
    exit 1
fi

# Build the site
echo "🔨 Building site..."
if ! npm run build; then
    echo "❌ Build failed"
    exit 1
fi

# Check if build was successful
if [ ! -d "output" ]; then
    echo "❌ Build failed: output directory not found"
    exit 1
fi

# Deploy
echo "📤 Deploying..."
git add .

if git commit -m "Deploy: $(date '+%Y-%m-%d %H:%M:%S')"; then
    echo "✅ Changes committed"
    git push origin master
    echo "✅ Quick deploy complete!"
    echo "🌐 Check your GitHub Pages site in a few minutes"
else
    echo "ℹ️  No changes to deploy"
fi