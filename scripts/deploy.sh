#!/bin/bash

# GitHub Pages Manual Deployment Script
set -e

echo "🚀 Starting deployment process..."

# Check if we're in a git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    echo "❌ Error: Not in a git repository"
    exit 1
fi

# Check for uncommitted changes
if ! git diff-index --quiet HEAD --; then
    echo "⚠️  Warning: You have uncommitted changes"
    read -p "Continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "❌ Deployment cancelled"
        exit 1
    fi
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm ci

# Build the site
echo "🔨 Building site..."
npm run build

# Check if build was successful
if [ ! -d "output" ]; then
    echo "❌ Build failed: output directory not found"
    exit 1
fi

# Get repository info for status URL
REPO_URL=$(git config --get remote.origin.url)
if [[ $REPO_URL == *"github.com"* ]]; then
    REPO_PATH=$(echo $REPO_URL | sed 's/.*github.com[:/]\([^.]*\).*/\1/')
    ACTIONS_URL="https://github.com/$REPO_PATH/actions"
else
    ACTIONS_URL="Check your repository's Actions tab"
fi

# Commit and push
echo "📤 Committing and pushing changes..."
git add .
if git commit -m "Deploy: $(date '+%Y-%m-%d %H:%M:%S')"; then
    echo "✅ Changes committed successfully"
else
    echo "ℹ️  No changes to commit"
fi

echo "🌐 Pushing to remote repository..."
git push origin main

echo ""
echo "✅ Deployment initiated successfully!"
echo "🌐 Your site will be available at your GitHub Pages URL in a few minutes"
echo "📊 Check deployment status: $ACTIONS_URL"
echo ""
echo "Next steps:"
echo "  1. Monitor the GitHub Actions workflow"
echo "  2. Verify your site loads correctly"
echo "  3. Check that all links and assets work"